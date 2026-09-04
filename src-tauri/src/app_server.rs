use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::{
    collections::HashMap,
    io::{BufRead, BufReader, Write},
    process::{Child, ChildStdin, Command, Stdio},
    sync::{
        atomic::{AtomicBool, AtomicU64, Ordering},
        mpsc::{self, Sender},
        Arc, Mutex,
    },
    thread,
    time::Duration,
};
use tauri::{AppHandle, Emitter, State};

const REQUEST_TIMEOUT: Duration = Duration::from_secs(10);
const PROJECT_SESSIONS_EVENT: &str = "app-server-project-sessions";

fn project_id_for_cwd<'a>(cwd: &str, projects: &[(&'a str, &[&str])]) -> Option<&'a str> {
    let cwd = normalized_path(cwd);
    let mut candidate: Option<(&str, usize, bool)> = None;
    for (project_id, roots) in projects {
        for root in *roots {
            if !path_is_within(cwd, root) {
                continue;
            }
            let root_length = normalized_path(root).len();
            match candidate {
                None => candidate = Some((*project_id, root_length, false)),
                Some((_, longest_root, _)) if root_length > longest_root => {
                    candidate = Some((*project_id, root_length, false));
                }
                Some((other_project_id, longest_root, _))
                    if root_length == longest_root && other_project_id != *project_id =>
                {
                    candidate = Some((other_project_id, longest_root, true));
                }
                _ => {}
            }
        }
    }
    candidate.and_then(|(project_id, _, ambiguous)| (!ambiguous).then_some(project_id))
}

fn normalized_path(path: &str) -> &str {
    let normalized = path.trim_end_matches(['/', '\\']);
    if normalized.is_empty() {
        path
    } else {
        normalized
    }
}

fn path_is_within(cwd: &str, root: &str) -> bool {
    let root = normalized_path(root);
    cwd == root
        || cwd
            .strip_prefix(root)
            .is_some_and(|remaining| remaining.starts_with('/') || remaining.starts_with('\\'))
}

#[derive(Default)]
pub struct AppServerState {
    client: Mutex<Option<Arc<AppServer>>>,
}

#[derive(Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ThreadListRequest {
    project_id: String,
    parent_thread_id: Option<String>,
}

#[derive(Deserialize, Serialize)]
pub struct ProjectRecord {
    id: String,
    name: String,
    roots: Vec<ProjectRoot>,
    position: i64,
}

#[derive(Deserialize, Serialize)]
pub struct ProjectRoot {
    path: String,
}

#[derive(Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ThreadRecord {
    id: String,
    project_id: Option<String>,
    parent_thread_id: Option<String>,
    #[serde(default)]
    cwd: String,
    name: Option<String>,
    preview: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ThreadProjectSyncResult {
    assigned: usize,
    skipped: usize,
    failed: usize,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct Page<T> {
    data: Vec<T>,
    next_cursor: Option<String>,
}

#[derive(Clone, Serialize)]
#[serde(tag = "type", rename_all = "kebab-case")]
enum ProjectSessionsEvent {
    ThreadNameUpdated {
        #[serde(rename = "threadId")]
        thread_id: String,
        name: Option<String>,
    },
    Refresh {
        #[serde(skip_serializing_if = "Option::is_none")]
        sync_unassigned_threads: Option<bool>,
    },
}

struct AppServer {
    child: Mutex<Child>,
    stdin: Mutex<ChildStdin>,
    next_id: AtomicU64,
    syncing_project_assignments: AtomicBool,
    pending: Mutex<HashMap<u64, Sender<Value>>>,
}

impl AppServer {
    fn start(app: AppHandle) -> Result<Arc<Self>, String> {
        let mut child = Command::new("codex")
            .args(["app-server", "--stdio"])
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::null())
            .spawn()
            .map_err(|error| format!("Unable to start Codex app-server: {error}"))?;
        let stdin = child
            .stdin
            .take()
            .ok_or_else(|| "Codex app-server did not expose stdin".to_owned())?;
        let stdout = child
            .stdout
            .take()
            .ok_or_else(|| "Codex app-server did not expose stdout".to_owned())?;
        let server = Arc::new(Self {
            child: Mutex::new(child),
            stdin: Mutex::new(stdin),
            next_id: AtomicU64::new(1),
            syncing_project_assignments: AtomicBool::new(false),
            pending: Mutex::new(HashMap::new()),
        });
        Self::read_messages(Arc::clone(&server), app, stdout);

        server.request(
            "initialize",
            json!({
                "clientInfo": {
                    "name": "codex-desktop",
                    "title": "Codex Desktop",
                    "version": env!("CARGO_PKG_VERSION"),
                },
                "capabilities": {
                    "experimentalApi": true,
                    "requestAttestation": false,
                },
            }),
        )?;
        server.notify("initialized")?;
        Ok(server)
    }

    fn read_messages(
        server: Arc<Self>,
        app: AppHandle,
        stdout: impl std::io::Read + Send + 'static,
    ) {
        thread::spawn(move || {
            for line in BufReader::new(stdout).lines().map_while(Result::ok) {
                let Ok(message) = serde_json::from_str::<Value>(&line) else {
                    continue;
                };
                if let Some(id) = message.get("id").and_then(Value::as_u64) {
                    if let Ok(mut pending) = server.pending.lock() {
                        if let Some(sender) = pending.remove(&id) {
                            let _ = sender.send(message);
                        }
                    }
                    continue;
                }
                if server.syncing_project_assignments.load(Ordering::Acquire)
                    && message.get("method").and_then(Value::as_str)
                        == Some("thread/project/updated")
                {
                    continue;
                }
                if let Some(event) = project_sessions_event(&message) {
                    let _ = app.emit(PROJECT_SESSIONS_EVENT, event);
                }
            }
        });
    }

    fn request(&self, method: &str, params: Value) -> Result<Value, String> {
        let id = self.next_id.fetch_add(1, Ordering::Relaxed);
        let (sender, receiver) = mpsc::channel();
        self.pending
            .lock()
            .map_err(|_| "Codex app-server request state is unavailable".to_owned())?
            .insert(id, sender);
        let message = json!({ "id": id, "method": method, "params": params });
        if let Err(error) = self.write(&message) {
            if let Ok(mut pending) = self.pending.lock() {
                pending.remove(&id);
            }
            return Err(error);
        }
        let response = receiver
            .recv_timeout(REQUEST_TIMEOUT)
            .map_err(|_| format!("Codex app-server timed out while calling {method}"))?;
        if let Some(error) = response.get("error") {
            return Err(error
                .get("message")
                .and_then(Value::as_str)
                .unwrap_or("Codex app-server request failed")
                .to_owned());
        }
        response
            .get("result")
            .cloned()
            .ok_or_else(|| format!("Codex app-server returned no result for {method}"))
    }

    fn notify(&self, method: &str) -> Result<(), String> {
        self.write(&json!({ "method": method }))
    }

    fn write(&self, message: &Value) -> Result<(), String> {
        let mut stdin = self
            .stdin
            .lock()
            .map_err(|_| "Codex app-server stdin is unavailable".to_owned())?;
        serde_json::to_writer(&mut *stdin, message)
            .map_err(|error| format!("Unable to encode Codex app-server request: {error}"))?;
        stdin
            .write_all(b"\n")
            .and_then(|()| stdin.flush())
            .map_err(|error| format!("Unable to write Codex app-server request: {error}"))
    }

    fn list_projects(&self) -> Result<Vec<ProjectRecord>, String> {
        self.collect_pages("project/list", json!({ "limit": 100 }))
    }

    fn list_threads(&self, request: ThreadListRequest) -> Result<Vec<ThreadRecord>, String> {
        self.collect_pages(
            "thread/list",
            json!({
                "limit": 100,
                "projectId": request.project_id,
                "parentThreadId": request.parent_thread_id,
            }),
        )
    }

    fn sync_unassigned_threads(&self) -> Result<ThreadProjectSyncResult, String> {
        if self
            .syncing_project_assignments
            .swap(true, Ordering::AcqRel)
        {
            return Err("Project session sync is already running".to_owned());
        }
        let result = (|| {
            let projects = self.list_projects()?;
            let roots = projects
                .iter()
                .map(|project| {
                    (
                        project.id.as_str(),
                        project
                            .roots
                            .iter()
                            .map(|root| root.path.as_str())
                            .collect::<Vec<_>>(),
                    )
                })
                .collect::<Vec<_>>();
            let project_roots = roots
                .iter()
                .map(|(project_id, roots)| (*project_id, roots.as_slice()))
                .collect::<Vec<_>>();
            let threads: Vec<ThreadRecord> = self.collect_pages(
                "thread/list",
                json!({
                    "limit": 100,
                    "projectId": null,
                    "parentThreadId": null,
                    "archived": false,
                    "sourceKinds": ["cli", "vscode", "exec", "appServer", "unknown"],
                    "useStateDbOnly": true,
                }),
            )?;
            let mut result = ThreadProjectSyncResult {
                assigned: 0,
                skipped: 0,
                failed: 0,
            };
            for thread in threads {
                let Some(project_id) = project_id_for_cwd(&thread.cwd, &project_roots) else {
                    result.skipped += 1;
                    continue;
                };
                match self.request(
                    "thread/metadata/update",
                    json!({ "threadId": thread.id, "projectId": project_id }),
                ) {
                    Ok(_) => result.assigned += 1,
                    Err(_) => result.failed += 1,
                }
            }
            Ok(result)
        })();
        self.syncing_project_assignments
            .store(false, Ordering::Release);
        result
    }

    fn collect_pages<T>(&self, method: &str, mut params: Value) -> Result<Vec<T>, String>
    where
        T: for<'de> Deserialize<'de>,
    {
        let mut records = Vec::new();
        loop {
            let page: Page<T> = serde_json::from_value(self.request(method, params.clone())?)
                .map_err(|error| {
                    format!("Codex app-server returned invalid {method} data: {error}")
                })?;
            records.extend(page.data);
            let Some(cursor) = page.next_cursor else {
                return Ok(records);
            };
            params["cursor"] = Value::String(cursor);
        }
    }
}

impl Drop for AppServer {
    fn drop(&mut self) {
        if let Ok(child) = self.child.get_mut() {
            let _ = child.kill();
        }
    }
}

#[tauri::command]
pub fn app_server_list_projects(
    app: AppHandle,
    state: State<'_, AppServerState>,
) -> Result<Vec<ProjectRecord>, String> {
    get_or_start(&app, &state)?.list_projects()
}

#[tauri::command]
pub fn app_server_list_threads(
    app: AppHandle,
    state: State<'_, AppServerState>,
    request: ThreadListRequest,
) -> Result<Vec<ThreadRecord>, String> {
    get_or_start(&app, &state)?.list_threads(request)
}

#[tauri::command]
pub fn app_server_sync_unassigned_threads(
    app: AppHandle,
    state: State<'_, AppServerState>,
) -> Result<ThreadProjectSyncResult, String> {
    let result = get_or_start(&app, &state)?.sync_unassigned_threads()?;
    let _ = app.emit(
        PROJECT_SESSIONS_EVENT,
        ProjectSessionsEvent::Refresh {
            sync_unassigned_threads: None,
        },
    );
    Ok(result)
}

fn get_or_start(
    app: &AppHandle,
    state: &State<'_, AppServerState>,
) -> Result<Arc<AppServer>, String> {
    let mut client = state
        .client
        .lock()
        .map_err(|_| "Codex app-server state is unavailable".to_owned())?;
    if let Some(server) = client.as_ref() {
        return Ok(Arc::clone(server));
    }
    let server = AppServer::start(app.clone())?;
    *client = Some(Arc::clone(&server));
    Ok(server)
}

fn project_sessions_event(message: &Value) -> Option<ProjectSessionsEvent> {
    match message.get("method")?.as_str()? {
        "thread/name/updated" => Some(ProjectSessionsEvent::ThreadNameUpdated {
            thread_id: message.get("params")?.get("threadId")?.as_str()?.to_owned(),
            name: message
                .get("params")?
                .get("threadName")
                .and_then(Value::as_str)
                .map(ToOwned::to_owned),
        }),
        "project/changed" | "thread/project/updated" | "thread/archived" | "thread/deleted" => {
            Some(ProjectSessionsEvent::Refresh {
                sync_unassigned_threads: None,
            })
        }
        "thread/started" | "thread/unarchived" => Some(ProjectSessionsEvent::Refresh {
            sync_unassigned_threads: Some(true),
        }),
        _ => None,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn forwards_only_project_tree_notifications() {
        let renamed = project_sessions_event(&json!({
            "method": "thread/name/updated",
            "params": { "threadId": "thread-1", "threadName": "Renamed" },
        }))
        .expect("rename notification should reach the tree");
        assert_eq!(
            serde_json::to_value(renamed).unwrap(),
            json!({ "type": "thread-name-updated", "threadId": "thread-1", "name": "Renamed" }),
        );
        assert!(project_sessions_event(
            &json!({ "method": "item/agentMessage/delta", "params": {} })
        )
        .is_none());
    }

    #[test]
    fn chooses_the_most_specific_project_root_for_an_unassigned_thread() {
        let project_id = project_id_for_cwd(
            "/workspace/codex-desktop/plugins/project-sessions",
            &[
                ("workspace", ["/workspace"].as_slice()),
                ("desktop", ["/workspace/codex-desktop"].as_slice()),
            ],
        );

        assert_eq!(project_id, Some("desktop"));
    }

    #[test]
    fn skips_an_unassigned_thread_when_the_best_project_root_is_ambiguous() {
        let project_id = project_id_for_cwd(
            "/workspace/codex-desktop",
            &[
                ("desktop", ["/workspace/codex-desktop"].as_slice()),
                ("duplicate", ["/workspace/codex-desktop"].as_slice()),
            ],
        );

        assert_eq!(project_id, None);
    }

    #[test]
    fn prefers_a_more_specific_root_over_an_ambiguous_parent_root() {
        let project_id = project_id_for_cwd(
            "/workspace/codex-desktop",
            &[
                ("workspace", ["/workspace"].as_slice()),
                ("duplicate", ["/workspace"].as_slice()),
                ("desktop", ["/workspace/codex-desktop"].as_slice()),
            ],
        );

        assert_eq!(project_id, Some("desktop"));
    }
}
