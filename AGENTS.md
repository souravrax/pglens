<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

<!-- END:nextjs-agent-rules -->

# pgviz

VS Code extension for visualizing PostgreSQL database schemas as interactive ER diagrams.

## Dev commands

```bash
pnpm dev                     # Watch extension host + webview
pnpm build                   # Build extension host + webview for packaging
pnpm --filter pgviz-vscode compile       # Build extension host only
pnpm --filter pgviz-vscode build:webview # Build webview only
```

Package manager: **pnpm** (`packageManager: pnpm@10.0.0` in `package.json`).

## Architecture

- **Extension Host** (`src/`): Node.js process running inside VS Code. Handles PostgreSQL connections via `pg`, schema introspection, sidebar tree view, and webview management.
- **Webview** (`webview/`): React + Vite app running inside a VS Code webview panel. Renders the interactive ER diagram using `reactflow` + `elkjs`.
- **Communication**: Extension host ↔ webview via `postMessage`.

## Key entry points

- `src/extension.ts` — Extension activation, registers tree view and commands
- `src/commands.ts` — Command palette handlers
- `src/treeProvider.ts` — Database Explorer sidebar (TreeDataProvider)
- `src/db.ts` — PostgreSQL introspection (ported from Rust `db.rs`)
- `src/state.ts` — Connection persistence via `ExtensionContext.globalState`
- `src/webviewManager.ts` — Creates webview panels, loads built React app
- `webview/src/App.tsx` — Webview root, receives schema via `postMessage`
- `webview/src/components/SchemaGraph.tsx` — ER diagram canvas (reactflow)
- `webview/src/lib/transform.ts` — ELK layout + graph data transformation

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
apps/pgviz-vscode/
├── package.json              # Extension manifest
├── tsconfig.json
├── src/
│   ├── extension.ts          # Entry point
│   ├── commands.ts           # Command handlers
│   ├── treeProvider.ts       # Sidebar tree view
│   ├── db.ts                 # PostgreSQL client + SQL
│   ├── state.ts              # Connection storage
│   └── webviewManager.ts     # Webview panel manager
├── webview/                  # React app (separate build)
│   ├── vite.config.ts
│   └── src/
│       ├── App.tsx
│       ├── components/
│       │   ├── SchemaGraph.tsx
│       │   ├── TableNode.tsx
│       │   └── ui/           # shadcn components
│       └── lib/
│           ├── transform.ts
│           └── utils.ts
└── media/webview/            # Built webview assets (gitignored)
```
