# pgviz

A fast, native desktop app for visualizing and exploring PostgreSQL databases.

![License](https://img.shields.io/badge/license-BSL%201.1-blue)
![Price](https://img.shields.io/badge/price-%2415%2B-green)

## Features

- **Schema visualization** — Interactive entity-relationship diagrams
- **Query explorer** — Browse table data with filtering, sorting, and pagination
- **SQL execution** — Run queries with syntax highlighting via CodeMirror
- **Query analysis** — EXPLAIN plans with visual breakdowns
- **Metadata browser** — Triggers, functions, views, extensions, constraints, sequences
- **Auto-updates** — Built-in updater keeps you on the latest version
- **Native app** — Not a browser tab. Real menus, keyboard shortcuts, OS integration

## Download

**[Buy on Lemon Squeezy — From $15](https://pgviz.lemonsqueezy.com/)**

Available for macOS (Intel & Apple Silicon), Windows, and Linux.

## Tech Stack

- **Frontend:** Next.js 16 + React + Tailwind CSS + shadcn/ui
- **Backend:** Rust + Tauri v2 + tokio-postgres
- **Desktop:** Native WebView, no Electron bloat
- **Data:** Everything stays local — connections stored in OS keyring

## Development

```bash
# Install dependencies
pnpm install

# Start dev mode (hot reload + JSON file storage)
pnpm tauri dev

# TypeScript check
pnpm exec tsc --noEmit

# Rust check
cd src-tauri && cargo check
```

**Requirements:** Node.js LTS, Rust, pnpm, and on Linux: `libwebkit2gtk-4.0-dev`, `libappindicator3-dev`

## License

Business Source License 1.1 (BSL 1.1)

- **Personal, educational, non-commercial:** Free
- **Commercial use:** Requires a license — available at [pgviz.lemonsqueezy.com](https://pgviz.lemonsqueezy.com/)

The source code is public for transparency and community contribution. The compiled binaries (signed, auto-updating, and convenient) are the product being sold. After 3 years, each version automatically becomes fully open source under Apache 2.0.

## Support

Issues and feature requests: [GitHub Issues](https://github.com/souravrax/pgviz/issues)
