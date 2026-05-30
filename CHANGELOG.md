# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.2.1] - 2026-05-30

### Changed

- **Extension README** — Replaced the copied root README with a dedicated, extension-focused README covering features, quick start, connection URL format, settings, and troubleshooting.

## [0.2.0] - 2026-05-30

### Added

- **Tables panel** — New sidebar view (`pglens.tables`) that lists every table in the loaded schema with expandable sections for Columns, Indexes, and Relations.
- **Two-way table selection** — Click a table in the webview graph to reveal it in the Tables panel. Click the eye icon on a table in the Tables panel to highlight it in the webview.
- **Tabbed table details card** — The webview’s floating table-inspector now uses tabs (Columns, Indexes, Relations) and lives at the bottom-right with a fixed height and scrollable content.
- **Rich column information** — Column rows now display PK/FK/Identity/Unique/Indexed icons, data type, nullable state, and DEFAULT values.
- **API client selection hooks** — `PgLensClient` now exposes `selectTable` and `onSelectTable` so the webview can communicate table selections to the host without leaking VS Code API into React components.

### Changed

- **Extracted `TableDetails` component** — Moved the entire table-inspector card out of `SchemaGraph` into a dedicated `TableDetails.tsx` component, cutting `SchemaGraph` roughly in half.
- **Styling cleanup** — Replaced all hardcoded colors (amber, cyan, pink) with shadcn CSS variables (`primary`, `muted-foreground`, `destructive`, etc.) and standard components.

## [0.1.2] - 2025-06-30

### Added

- **Updated marketplace icon** — New extension icon for VS Code Marketplace and Open VSX.

### Changed

- **Improved graph visuals** — Enhanced edge styling and selection highlighting in SchemaGraph and TableNode components.

## [0.1.1] - 2025-06-30

### Added

- **Marketplace icon** — Added extension icon for VS Code Marketplace and Open VSX.

## [0.1.0] - 2025-06-30

### Added

- **Interactive ER diagrams** — Visualize PostgreSQL schemas as interactive graphs inside a VS Code webview panel, powered by React Flow.
- **Connection manager** — Add, remove, select, and deselect PostgreSQL connections from the PgLens sidebar. Connection URLs are encrypted via VS Code SecretStorage (OS keychain).
- **Schema browser** — Browse schemas for the active connection in the Schemas panel.
- **Table detail panel** — Click any table node to inspect columns, primary keys, indexes, and foreign key relationships.
- **Theme integration** — Graph auto-adapts to the user's VS Code color theme using CSS variables.
- **Dagre layout** — Automatic layout of tables and relationships using the Dagre algorithm.
- **Sidebar welcome views** — Contextual welcome messages when no connections exist or no connection is selected.
- **Settings** — `pglens.showInternalSchemas` toggle to optionally include `pg_catalog`, `information_schema`, etc.
- **CI/CD** — GitHub Actions workflows for CI and publishing to both VS Code Marketplace and Open VSX.

### Changed

- Project renamed from `pgviz` to `PgLens`.

[Unreleased]: https://github.com/souravrax/pglens/compare/v0.2.1...HEAD
[0.2.1]: https://github.com/souravrax/pglens/releases/tag/v0.2.1
[0.2.0]: https://github.com/souravrax/pglens/releases/tag/v0.2.0
[0.1.2]: https://github.com/souravrax/pglens/releases/tag/v0.1.2
[0.1.1]: https://github.com/souravrax/pglens/releases/tag/v0.1.1
[0.1.0]: https://github.com/souravrax/pglens/releases/tag/v0.1.0
