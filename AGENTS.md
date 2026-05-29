<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

<!-- END:nextjs-agent-rules -->

# PgLens

VS Code extension for visualizing PostgreSQL database schemas as interactive ER diagrams.

## Dev commands

```bash
pnpm dev                     # Watch extension host + webview
pnpm build                   # Build extension host + webview for packaging
pnpm --filter vscode-extension compile       # Build extension host only
pnpm --filter webview build                   # Build webview only
```

Package manager: **pnpm** (`packageManager: pnpm@10.0.0` in `package.json`).

## Architecture

- **Extension Host** (`apps/vscode-extension/src/`): Node.js process running inside VS Code. Handles PostgreSQL connections via `pg`, schema introspection, sidebar tree view, and webview management.
- **Webview** (`apps/webview/`): React + Vite app. Renders the interactive ER diagram using `reactflow` + `dagre`. Can be reused outside VS Code.
- **Communication**: Extension host ↔ webview via `postMessage`.

## Key entry points

- `apps/vscode-extension/src/extension.ts` — Extension activation, registers tree view and commands
- `apps/vscode-extension/src/commands.ts` — Command palette handlers
- `apps/vscode-extension/src/treeProvider.ts` — Database Explorer sidebar (TreeDataProvider)
- `apps/vscode-extension/src/db.ts` — PostgreSQL introspection (ported from Rust `db.rs`)
- `apps/vscode-extension/src/state.ts` — Connection persistence via `ExtensionContext.globalState`
- `apps/vscode-extension/src/webviewManager.ts` — Creates webview panels, loads built React app
- `apps/webview/src/App.tsx` — Webview root, receives schema via `postMessage`
- `apps/webview/src/components/SchemaGraph.tsx` — ER diagram canvas (reactflow)
- `apps/webview/src/lib/transform.ts` — Dagre layout + graph data transformation

## Critical constraints

- **PostgreSQL only.** All SQL is Postgres-specific.
- **No desktop app.** The old Tauri desktop app is archived at `archive/pgviz-desktop/`.
- **VS Code webview.** The visualizer runs inside a VS Code webview panel, not a browser.
- **Single repo.** No monorepo tooling beyond pnpm workspaces.
- **License:** BSL 1.1.

## Known gotchas

- `archive/` holds the old desktop app code — excluded from TypeScript but still in repo.
- Webview assets are built to `media/webview/` and loaded via `asWebviewUri()`.
- The webview must use VS Code CSS variables (`--vscode-editor-background`, etc.) for theming.
- `pg` package is bundled into the extension; no native dependencies required.

## Extension structure

```
apps/vscode-extension/
├── package.json              # Extension manifest
├── tsconfig.json
├── src/
│   ├── extension.ts          # Entry point
│   ├── commands.ts           # Command handlers
│   ├── treeProvider.ts       # Sidebar tree view
│   ├── db.ts                 # PostgreSQL client + SQL
│   ├── state.ts              # Connection storage
│   └── webviewManager.ts     # Webview panel manager
└── media/webview/            # Built webview assets (gitignored)

apps/webview/                 # Reusable React app
├── vite.config.ts
├── package.json
└── src/
    ├── App.tsx
    ├── components/
    │   ├── SchemaGraph.tsx
    │   ├── TableNode.tsx
    │   └── ui/               # shadcn components
    └── lib/
        ├── transform.ts
        └── utils.ts
```
