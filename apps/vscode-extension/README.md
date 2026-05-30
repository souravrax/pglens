# PgLens

Visualize your PostgreSQL database schemas as interactive ER diagrams directly inside VS Code.

## Features

- **Interactive ER diagrams** — Click any table node to inspect columns, primary keys, indexes, and foreign key relationships in a tabbed details card.
- **Two-way table selection** — Click a table in the graph to reveal it in the **Tables** sidebar panel, or click the eye icon on a table in the sidebar to highlight it in the graph.
- **Schema browser** — Browse schemas for the active connection in the **Schemas** panel.
- **Secure connections** — PostgreSQL URLs are stored in your OS keychain via VS Code SecretStorage.
- **Theme-aware** — The graph and panels automatically adapt to your VS Code color theme.

## Quick Start

1. Open the **PgLens** sidebar from the activity bar.
2. Click **Add Connection** and enter your PostgreSQL connection URL.
3. Select a connection to browse its schemas in the **Schemas** panel.
4. Click **Visualize Schema** on any schema to open the interactive ER diagram.
5. Click a table node in the graph to see its details in the floating card and in the **Tables** panel.

## Settings

| Setting | Default | Description |
|---------|---------|-------------|
| `pglens.showInternalSchemas` | `false` | Include `pg_catalog`, `information_schema`, and other internal schemas in the schema browser. |

## Requirements

- VS Code `^1.90.0`
- PostgreSQL `10+`

## Support

Issues and feature requests: [github.com/souravrax/pglens/issues](https://github.com/souravrax/pglens/issues)
