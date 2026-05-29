# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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

[Unreleased]: https://github.com/souravrax/pglens/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/souravrax/pglens/releases/tag/v0.1.0
