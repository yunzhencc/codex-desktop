# Cordis package migration

## Scope

Move the business-independent Cordis package architecture from
`starter-react-cordis` into this Tauri/React workspace.  The current
application remains a normal Vite React entry during this phase.

Included packages are:

- `@yunzhen/cordis-client-modules`: a JSON-safe web boot graph, graph
  validation, ordered Cordis activation, and reverse disposal on failure.
- `@yunzhen/cordis-host-plugin-catalog`: `cordis.yml` parsing and package
  metadata validation for a future Vite boot entry.
- `@yunzhen/cordis-ui-{slots,renderer,i18n,theme,layout,router}`: reusable
  client services and UI extension points.

The migration also makes the repository a pnpm workspace and makes root
type-checking include the packages.

## Explicit exclusions

- No `examples/**`, `gallery/formats`, pages, models, chat, settings, or any
  other application plugin.
- No `cordis.yml`, virtual Vite boot module, or change to `src/main.tsx`.
- No runtime installation, plugin marketplace, sandboxing, or package HMR.

`cordis.yml` is a build-time static composition input.  It does not enable
third-party plugins at runtime.

## Package boundaries

The client modules package owns startup lifecycle only.  It obtains module
loaders from a consumer-provided registry, activates them in validated order,
and disposes installed fibers in reverse order if loading fails.

The catalog package is Node-only and validates YAML plus the installed
package's `exports["./client"]` and `yunzhen.client` metadata.  It emits a
plain boot graph, not executable configuration.

The UI packages expose Cordis services and extension points.  They may depend
on other UI packages but never on this application's `src/**` or future
business plugins.  Application-specific plugins will later depend on these
packages and be composed by a per-application Vite plugin.

## Integration and validation

Each package has a local `package.json` and TypeScript config.  Workspace
globs cover `packages/*/*`; package dependencies use `workspace:*`.  The
existing root Vite configuration and Tauri frontend remain unchanged.

Migrate the corresponding focused unit tests from the reference where they
cover nontrivial graph/catalog/slot behavior.  Run the package-focused tests,
root type-check, and `git diff --check`.  A successful check proves the shared
packages compile and their isolated behavior works; it intentionally does not
claim that the Tauri UI has adopted Cordis yet.
