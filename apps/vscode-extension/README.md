# PgLens

Visualize your PostgreSQL database schemas as interactive ER diagrams directly inside VS Code.

## Features

### Interactive ER Diagrams
- **Click-to-inspect** — Click any table node in the graph to open a tabbed details card showing columns, indexes, and relations.
- **Edge highlighting** — Selecting a table highlights its outgoing foreign keys in one color and incoming references in another, while dimming unrelated edges.
- **Pan, zoom & fit** — Navigate large schemas freely. The minimap in the top-right gives a bird's-eye view.
- **Context menu** — Right-click on the canvas for quick actions: Fit View, Reset Selection, Reload.

### Sidebar Panels
- **Connection panel** — Add, remove, select, and deselect PostgreSQL connections. URLs are stored securely in your OS keychain via VS Code SecretStorage.
- **Schemas panel** — Browse all schemas for the active connection. Click the graph icon to visualize any schema.
- **Tables panel** — Lists every table in the loaded schema. Expand a table to browse its columns, indexes, and foreign key relations.

### Two-Way Table Selection
- **Graph → Sidebar** — Click a table node in the ER diagram to automatically reveal and expand it in the Tables panel.
- **Sidebar → Graph** — Click the eye icon on any table in the Tables panel to highlight that table in the graph.

### Column Details
Each column in the details card shows:
- **Icons** indicating Primary Key, Foreign Key, Identity, Unique constraint, or Index
- **Data type** (e.g., `int4`, `varchar`, `timestamptz`)
- **Nullability** — Hollow dot for nullable, filled dot for NOT NULL
- **DEFAULT value** when present

### Theme Support
The entire UI — graph nodes, edges, sidebar panels, and detail card — automatically adapts to your VS Code color theme using standard CSS variables.

## Quick Start

1. Open the **PgLens** sidebar from the activity bar (database icon).
2. Click **Add Connection** and enter a PostgreSQL connection URL:
   ```
   postgres://user:password@localhost:5432/dbname
   ```
3. Select a connection to browse its schemas in the **Schemas** panel.
4. Hover over a schema and click the **Visualize Schema** (graph) icon to open the interactive ER diagram.
5. Click any table node in the graph to see its details in the floating card and in the **Tables** panel.

## Connection URL Format

PgLens accepts standard PostgreSQL connection URLs:

```
postgres://username:password@hostname:port/database
postgresql://username:password@hostname:port/database
```

If the connection fails during setup, you can choose to save it anyway and test later.

## Settings

| Setting | Default | Description |
|---------|---------|-------------|
| `pglens.showInternalSchemas` | `false` | Include `pg_catalog`, `information_schema`, `pg_toast`, and other internal schemas in the schema browser. |

## Requirements

- VS Code `^1.90.0`
- PostgreSQL `10+`

## Troubleshooting

**No schemas appear after selecting a connection**
- Check that `pglens.showInternalSchemas` is enabled if you want to see system schemas.
- Verify your connection URL and that the database is reachable.

**Graph layout looks broken**
- Right-click on the canvas and select **Reload** to refresh the webview.
- The extension falls back to a grid layout if the Dagre layout engine fails.

**Connection URL is rejected**
- URLs must start with `postgres://` or `postgresql://`.
- Make sure the database is running and accessible from your machine.

## Support

- Report bugs and request features: [github.com/souravrax/pglens/issues](https://github.com/souravrax/pglens/issues)
- VS Code Marketplace: [PgLens](https://marketplace.visualstudio.com/items?itemName=souravrax.pglens)
- Open VSX: [PgLens](https://open-vsx.org/extension/souravrax/pglens)
