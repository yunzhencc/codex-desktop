mod app_server;

use app_server::{
    app_server_create_project, app_server_delete_project, app_server_list_projects,
    app_server_list_threads, app_server_sync_unassigned_threads, app_server_update_project,
    AppServerState,
};

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(AppServerState::default())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .invoke_handler(tauri::generate_handler![
            greet,
            app_server_create_project,
            app_server_update_project,
            app_server_delete_project,
            app_server_list_projects,
            app_server_list_threads,
            app_server_sync_unassigned_threads
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
