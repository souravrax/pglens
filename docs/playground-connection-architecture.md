# Playground Database Connection Architecture

## Problem Statement

Users want to bring their own database schemas into the pgviz Playground to prototype migrations against real-world table structures. However, production databases are rarely publicly accessible, and asking users to paste credentials into a web form raises valid security concerns—even with encryption and ephemeral processing.

We need a **multi-modal connection architecture** that lets users choose their own comfort level: from fully managed (we handle the introspection) to fully self-hosted (their machine brokers everything).

## Guiding Principles

1. **No persistent credential storage** — Credentials must never be written to disk on our servers.
2. **Ephemeral by default** — Any credential that touches our infrastructure must live only for the duration of the request.
3. **User-controlled exposure** — The user decides how much they trust our stack.
4. **Local-first option** — There must be a path where zero credentials leave the user's machine.

## Proposed Architecture: Three Connection Modes

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER'S MACHINE                           │
│  ┌─────────────────┐   ┌─────────────────┐   ┌──────────────┐  │
│  │   PostgreSQL    │   │  pgviz-proxy    │   │   Browser    │  │
│  │   (localhost)   │◄──│   (optional)    │──►│  (Playground)│  │
│  │                 │   │                 │   │              │  │
│  └─────────────────┘   └─────────────────┘   └──────────────┘  │
│           ▲                    │                                │
│           │                    │ localtunnel                    │
│           └────────────────────┘                                │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                     pgviz CLOUD INFRASTRUCTURE                  │
│  ┌─────────────────┐   ┌─────────────────┐   ┌──────────────┐  │
│  │   Next.js API   │   │  /api/connect   │   │  /api/proxy  │  │
│  │   (Vercel)      │   │  (ephemeral)    │   │  (relay)     │  │
│  └─────────────────┘   └─────────────────┘   └──────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Mode 1: Direct Ephemeral Connection ("Cloud Introspect")

**Best for:** Staging/dev databases with public IPs. Users who trust our ephemeral processing.

### Flow

1. User opens Playground → clicks "Connect Database".
2. Browser collects `host`, `port`, `database`, `user`, `password`, `ssl`.
3. Credentials are **encrypted client-side** using a user-derived key (e.g., a passphrase + PBKDF2) before being stored in IndexedDB.
4. When introspection is requested, the browser sends the **encrypted blob** to `POST /api/introspect`.
5. Server decrypts in-memory, establishes a `pg` connection, runs catalog queries, and returns `{ schema, ddl, sampleData }`.
6. Server immediately closes the connection and lets the credential object be garbage-collected.
7. Browser hydrates PGlite with the returned DDL.

### Security Model

| Threat | Mitigation |
|--------|-----------|
| Credentials at rest in browser | Encrypted with user passphrase |
| Credentials in transit | TLS 1.3 + encrypted payload |
| Server memory leak | Short-lived request scope; no global vars |
| Server logs | Sanitize all `pg` errors; never log DSN |
| Replay attack | Include timestamp + nonce in encrypted payload; short expiry |

### API Contract

```http
POST /api/introspect
Content-Type: application/json

{
  "payload": "<base64(aes-256-gcm encrypted blob)>",
  "nonce": "<base64 nonce>",
  "options": {
    "sampleRows": 100,
    "includeTriggers": false,
    "includeFunctions": false
  }
}
```

```http
200 OK
{
  "ddl": "CREATE TABLE users (...); CREATE INDEX ...;",
  "sampleData": "INSERT INTO users (...) VALUES (...);",
  "schema": { "tables": [...], "relations": [...] },
  "warnings": ["Extension 'postgis' not supported by PGlite — skipped."]
}
```

### Drawbacks

- Database must be publicly reachable (or user must whitelist our server IPs).
- Credentials still touch our servers, even if ephemerally.

---

## Mode 2: User-Hosted Proxy ("Bring Your Own Tunnel")

**Best for:** Local development databases, production databases behind VPCs, and security-conscious users who want **zero** credential exposure.

### Concept

We publish a lightweight, open-source proxy (`@pgviz/proxy` or `pgviz-proxy`) that users run on their own machine. The proxy:

1. Connects to their local PostgreSQL using a connection string they provide **locally**.
2. Spins up an HTTP server (e.g., on `localhost:8765`).
3. Exposes that server to the internet via **localtunnel** (open-source, no account required).
4. Accepts signed requests from the pgviz Playground to run introspection queries.
5. Returns results directly to the Playground.

**At no point do credentials leave the user's machine.** Our servers only see the public tunnel URL, which points to the user's proxy.

### Flow

```bash
# User installs and runs the proxy globally
npx pgviz-proxy --db postgres://user:pass@localhost:5432/mydb --tunnel localtunnel

# Output:
# 🚀 Proxy running at http://localhost:8765
# 🌐 Public URL: https://abc123.loca.lt
# 🔒 Fingerprint: sha256:abcd...
```

1. User copies the public URL into the Playground.
2. Playground calls `POST https://abc123.loca.lt/introspect` with a **signed request** (HMAC-SHA256 using a one-time token displayed by the proxy).
3. Proxy validates the signature, queries the local database, returns schema + sample data.
4. Playground hydrates PGlite.

### Proxy Responsibilities

- **Request validation:** Only accept requests signed with the session token.
- **Read-only by default:** Only run `SELECT` queries on `information_schema` / `pg_catalog` + `pg_dump --schema-only` equivalent.
- **CORS:** Lock origin to `https://pgviz.app` (or localhost in dev).
- **Auto-shutdown:** Exit after 5 minutes of inactivity or when the user presses `Ctrl+C`.
- **No persistence:** Never log queries, results, or credentials.

### Security Model

| Threat | Mitigation |
|--------|-----------|
| Random internet scanner hits proxy | Token-based HMAC on every request; short-lived tunnel |
| DNS rebinding / malicious origin | Strict origin whitelist + CORS |
| Proxy exploited to run writes | Reject any non-`SELECT` query on non-catalog tables |
| Replay attack | Include timestamp in signed payload; proxy rejects stale requests |

### Proxy Configuration

```bash
# Minimal (uses localtunnel by default)
npx pgviz-proxy --db $DATABASE_URL

# With explicit tunnel provider
npx pgviz-proxy --db $DATABASE_URL --tunnel localtunnel --subdomain mydb

# Read-only schema introspection only (no data sampling)
npx pgviz-proxy --db $DATABASE_URL --schema-only

# Custom port and timeout
npx pgviz-proxy --db $DATABASE_URL --port 9999 --timeout 10m
```

### Drawbacks

- Requires Node.js/Bun on the user's machine.
- localtunnel URLs are random and change on every restart (unless a custom subdomain is requested).
- Corporate firewalls may block localtunnel domains.

---

## Mode 3: CLI Wrapper ("One-Shot Connect")

**Best for:** Power users who want a single command to spin up a temporary bridge.

### Concept

A tiny CLI (`npx pgviz connect`) that combines Mode 2 with extra UX polish:

1. Prompts for connection string (or reads from `.env`).
2. Generates a temporary proxy.
3. Opens a localtunnel tunnel automatically.
4. Prints a QR code + URL to the terminal.
5. User clicks the link in their browser, which lands on the Playground with the proxy URL pre-filled.
6. When the browser tab closes, the CLI shuts down.

### Flow

```bash
$ npx pgviz connect

? PostgreSQL connection string: postgres://user:pass@localhost:5432/dev
? Sample data rows (0-1000): 100

✔ Proxy started on http://localhost:8765
✔ Tunnel ready: https://abc123.loca.lt
✔ Fingerprint: sha256:9f86d08...

Scan QR code or open:
https://pgviz.app/playground/connect?proxy=https://abc123.loca.lt&token=xyz

Waiting for browser connection... (press Ctrl+C to stop)
```

### Implementation Notes

- Use `commander` + `inquirer` for CLI.
- Use `localtunnel` npm package for tunneling.
- Use `qrcode-terminal` for the QR code.
- The proxy itself can be the same package as Mode 2 (`pgviz-proxy`), just wrapped in a CLI.

---

## Comparison Matrix

| Dimension | Mode 1: Direct | Mode 2: Proxy | Mode 3: CLI |
|-----------|---------------|---------------|-------------|
| **Setup friction** | Low (paste credentials) | Medium (install + run proxy) | Low-Medium (one `npx` command) |
| **Credential exposure** | Ephemeral server access | Zero (stays on user's machine) | Zero (stays on user's machine) |
| **Works with local DB** | No (must be public) | Yes | Yes |
| **Works with VPC DB** | No | Yes (if machine has access) | Yes (if machine has access) |
| **Requires Node.js** | No | Yes | Yes |
| **Requires public IP** | Yes (DB side) | No (proxy uses tunnel) | No (proxy uses tunnel) |
| **Trust model** | Trust pgviz cloud infra | Trust proxy code (OSS, auditable) | Trust proxy code (OSS, auditable) |
| **Best for** | Staging / dev DBs | Local dev / production VPC | Quick one-off local connections |

---

## Unified Playground UX

The Playground connection modal should present all three options as tabs:

```
┌──────────────────────────────────────────────┐
│  Connect Database                              │
│  ┌────────┐  ┌──────────┐  ┌──────────────┐  │
│  │ Direct │  │ Proxy    │  │ CLI / npx    │  │
│  │ (Cloud)│  │ (Tunnel) │  │ (One-shot)   │  │
│  └────────┘  └──────────┘  └──────────────┘  │
│                                                │
│  [Host]     [Port]    [Database]               │
│  [User]     [Password]                         │
│                                                │
│  [ ] Encrypt with passphrase                   │
│                                                │
│  [ Connect & Import Schema ]                   │
└──────────────────────────────────────────────┘
```

- **Direct tab:** Simple form as described in Mode 1.
- **Proxy tab:** Input field for the public proxy URL + fingerprint verification.
- **CLI tab:** Instructions + a "Waiting for connection..." listener that detects when a CLI instance pings `/api/connect/cli` with a tunnel URL.

---

## Schema Introspection: What We Extract

Regardless of the connection mode, the introspection query set must be identical to ensure consistent PGlite hydration.

### Catalog Queries

1. **Tables & Columns**
   - Source: `information_schema.columns`
   - Output: `CREATE TABLE` statements with types, defaults, nullability.

2. **Primary Keys**
   - Source: `information_schema.table_constraints` + `key_column_usage`
   - Output: `PRIMARY KEY` constraints.

3. **Foreign Keys**
   - Source: `information_schema.table_constraints` + `constraint_column_usage`
   - Output: `FOREIGN KEY` constraints.

4. **Indexes**
   - Source: `pg_indexes`
   - Output: `CREATE INDEX` / `CREATE UNIQUE INDEX`.

5. **Enums**
   - Source: `pg_type` + `pg_enum`
   - Output: `CREATE TYPE ... AS ENUM (...)`.

6. **Extensions**
   - Source: `pg_extension`
   - Behavior: If extension is unsupported by PGlite (e.g., `postgis`), skip with a warning.

7. **Triggers & Functions**
   - Source: `information_schema.triggers`, `pg_proc`
   - Behavior: Skip if body uses unsupported PGlite features; otherwise include.

### Sample Data (Optional)

For each table, generate `INSERT INTO` statements:

```sql
SELECT * FROM table_name LIMIT $1;
```

Convert result rows to parameterized `INSERT` statements. This lets users test migrations against realistic data distributions without exporting massive datasets.

### PGlite Compatibility Warnings

The introspection response should include a `warnings` array for anything that cannot be perfectly replicated:

- `"Extension 'pgcrypto' not available in PGlite — cryptographic defaults may differ."`
- `"Custom C function 'my_func' skipped — PGlite does not support C extensions."`
- `"Partitioned table 'logs' recreated as regular table — partitioning not supported."`

---

## Data Flow: From Live DB to PGlite

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  Live DB     │────▶│ Introspector │────▶│  DDL + Data  │────▶│   PGlite     │
│  (Postgres)  │     │ (API/Proxy)  │     │  (JSON/SQL)  │     │  (Browser)   │
└──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘
                                                                      │
                                                                      ▼
                                                             ┌──────────────┐
                                                             │  Playground  │
                                                             │  Notebook    │
                                                             └──────────────┘
```

1. Introspector runs catalog queries.
2. Introspector serializes schema to portable DDL (no `OWNER TO`, no tablespace refs).
3. Introspector optionally samples rows and generates `INSERT` SQL.
4. Playground receives `{ ddl, sampleDataSql, schema, warnings }`.
5. Playground calls `pglite.exec(ddl)` then `pglite.exec(sampleDataSql)`.
6. `introspectSchema()` now reflects the user's real schema.

---

## Open Questions

1. **Should we support SSH tunneling as a 4th mode?**
   - Some users have DBs accessible only via a bastion host.
   - A CLI flag like `--ssh bastion.example.com` could forward a local port to the remote DB, then proxy from there.
   - This adds `ssh2` as a dependency but covers more enterprise use cases.

2. **What is the maximum safe `sampleRows` value?**
   - PGlite stores data in IndexedDB. A 100MB import could crash the browser tab.
   - Recommend default of `100` rows, max `1000` rows, with a total payload size guard (e.g., abort if SQL text exceeds 5MB).

3. **Should we support incremental sync?**
   - If the user's DB schema changes while they're working, should they be able to "refresh" the PGlite snapshot?
   - This could be a "Re-import Schema" button that resets PGlite and replays the introspection.

4. **How do we handle large schemas (1000+ tables)?**
   - Introspection could be slow. Consider streaming the response or paginating by schema.
   - PGlite `exec()` might choke on a 10MB SQL string. Chunk the DDL into statements and feed them sequentially.

5. **Tauri Desktop App as an alternative to CLI?**
   - A Tauri app could embed the proxy + a webview of the Playground.
   - This gives a native feel, auto-updates, and removes the Node.js dependency.
   - But it increases maintenance surface. Start with CLI; evaluate Tauri if CLI adoption is high.

---

## Recommended Implementation Order

| Phase | Feature | Effort |
|-------|---------|--------|
| **1** | Mode 1 (Direct Ephemeral) — `/api/introspect` + encrypted client-side store + hydration | Medium |
| **2** | Playground connection modal with tabbed UX | Low |
| **3** | Mode 2 (OSS Proxy) — `pgviz-proxy` package with HMAC validation + localtunnel integration | Medium |
| **4** | Mode 3 (CLI Wrapper) — `npx pgviz connect` command wrapping the proxy | Low |
| **5** | Schema compatibility warnings + sample data limiting | Low |
| **6** | SSH tunnel support in CLI (stretch goal) | Medium |
| **7** | Tauri desktop app evaluation (stretch goal) | High |

---

## Summary

This three-mode architecture gives users a **sliding scale of trust and convenience**:

- **Just get it done** → Mode 1 (paste credentials, we introspect ephemerally).
- **I don't trust the cloud** → Mode 2 (run our OSS proxy on your machine, zero credentials sent).
- **Make it effortless** → Mode 3 (`npx pgviz connect`, one command, QR code, done).

All three modes converge on the same output: a **PGlite sandbox in the browser** seeded with the user's real schema and optionally sample data. From there, the existing Playground flow (cells, schema diff, export) works unchanged.
