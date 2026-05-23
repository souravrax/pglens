<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

<!-- END:nextjs-agent-rules -->

# pgviz

Tauri v2 desktop app for visualizing PostgreSQL databases. Next.js 16 static-export frontend, Rust backend. No web server.

## Dev commands

```bash
pnpm tauri dev               # Start dev mode (needs Rust + Node)
pnpm exec tsc --noEmit       # TypeScript check
cd src-tauri && cargo check  # Rust check
cd src-tauri && cargo check --release  # Rust check (release = keyring backend)
```

Package manager: **pnpm** (`packageManager: pnpm@10.0.0` in `package.json`).

## Architecture

- **Frontend:** Next.js with `output: 'export'`. Served inside a Tauri WebView. No actual web server.
- **Backend:** Rust Tauri commands in `src-tauri/src/commands.rs`. All DB ops use `tokio-postgres`.
- **Frontend → Rust:** Every DB call goes through `invoke()` via `src/lib/tauri-api.ts`. There is no HTTP API, no `fetch` to localhost.
- **Storage:** Conditional compilation:
  - `#[cfg(dev)]` → JSON file at `app_config_dir()/databases.json`
  - `#[cfg(not(dev))]` → OS keyring (`com.pgviz.app` service)
- **Auto-updater:** Tauri updater plugin. Fetches `latest.json` from GitHub releases. Requires repo to be **public**.
- **Native menus:** Built in Rust (`src-tauri/src/lib.rs`), emit events to frontend (`MenuListener.tsx`).

## Key entry points

- `src-tauri/src/lib.rs` — App init, menu setup, plugin registration, command routing
- `src-tauri/src/commands.rs` — Tauri command handlers (thin wrappers over `db.rs`)
- `src-tauri/src/db.rs` — All PostgreSQL introspection SQL
- `src-tauri/src/store.rs` — `#[cfg(dev)]` JSON file backend + `#[cfg(not(dev))]` keyring backend
- `src/lib/tauri-api.ts` — Frontend typed wrapper for all `invoke()` calls
- `src/lib/store.ts` — Zustand store; persists UI state to localStorage, DB configs to Rust store
- `src/components/MenuListener.tsx` — Listens to native menu events from Rust

## Release workflow

1. Push a tag `v*` → triggers `.github/workflows/release.yml`
2. Builds: Linux (`.AppImage`, `.deb`), macOS Intel + Apple Silicon (`.dmg`), Windows (`.msi`)
3. Requires `TAURI_SIGNING_PRIVATE_KEY` secret for updater signing
4. Release is created as **draft** — manually publish to make `latest.json` live
5. Download artifacts from draft release, upload to Lemon Squeezy product page
6. Existing buyers get update emails from Lemon Squeezy when you upload new files

## Critical constraints

- **Static export only.** No API routes, no server-side rendering. The old `src/app/api/` was deleted.
- **PostgreSQL only.** No abstraction for other databases. All SQL is Postgres-specific.
- **Native title bar.** `decorations: true` in Tauri config. No custom window chrome.
- **Single repo.** No monorepo tooling (removed `turbo`, `pnpm-workspace`).
- **License:** BSL 1.1. Core features free for personal/educational/non-commercial use. Pro ($4/mo, $24/yr, $59 lifetime) and Team ($9/mo, $49/yr) licenses unlock multi-device sync, team sharing, and upcoming features. After 3 years, versions flip to Apache 2.0.
- **Repo must be public** for auto-updater to fetch `latest.json` from GitHub releases.

## Known gotchas

- `pnpm tauri build` is the correct build command. Do not pass `tauriScript: pnpm tauri build` to `tauri-action` — it appends `build` and creates `build build`.
- Release workflow needs `permissions: contents: write` at the **workflow level**, not job level, or release creation fails with "Resource not accessible by integration".
- `archive/` holds old playground code — excluded from TypeScript (`tsconfig.json` `exclude`) but still in repo.
- The frontend uses `nuqs` for URL state in the studio routes (dashboard, query, etc.). The home/settings pages do not use query params.
