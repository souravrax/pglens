# PgLens

A VS Code extension for visualizing PostgreSQL database schemas as interactive ER diagrams.

![License](https://img.shields.io/badge/license-BSL%201.1-blue)

## Features

- **Schema visualization** — Interactive entity-relationship diagrams inside VS Code
- **PostgreSQL only** — Deep introspection of tables, columns, indexes, constraints, and relations
- **Native sidebar** — Connection manager and schema browser in the VS Code activity bar
- **Secure storage** — Connection URLs stored in your OS keychain via VS Code SecretStorage
- **Interactive graph** — Click tables to inspect columns, primary keys, indexes, and foreign key relationships
- **Theme-aware** — Auto-adapts to your VS Code color theme

## Installation

Install from the [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=souravrax.pglens) or [Open VSX](https://open-vsx.org/extension/souravrax/pglens).

## Usage

1. Open the **PgLens** sidebar from the activity bar.
2. Add a PostgreSQL connection (URL is stored securely).
3. Select a connection to browse its schemas.
4. Click **Visualize Schema** on any schema to open the interactive ER diagram.

## Development

```bash
# Install dependencies
pnpm install

# Watch extension host + webview
pnpm dev

# Build for packaging
pnpm build
```

**Requirements:** Node.js 20, pnpm

## License

Business Source License 1.1 (BSL 1.1)

- **Free for personal, educational, and non-commercial use**
- The source code is public for transparency and community contribution. After 3 years, each version automatically becomes fully open source under Apache 2.0.

## Support

Issues and feature requests: [GitHub Issues](https://github.com/souravrax/pglens/issues)
