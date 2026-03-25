import { Client } from 'pg'

export type Column = {
  name: string
  type: string
  nullable: boolean
  defaultValue: string | null
}

export type Index = {
  name: string
  columns: string[]
  unique: boolean
}

export type Table = {
  name: string
  columns: Column[]
  primaryKeys: string[]
  indexes: Index[]
}

export type Relation = {
  fromTable: string
  fromColumn: string
  toTable: string
  toColumn: string
  constraintName: string
}

export type Schema = {
  name: string
  tables: Table[]
  relations: Relation[]
}

export async function listSchemas(connectionString: string): Promise<string[]> {
  const client = new Client({ connectionString })
  await client.connect()

  try {
    const result = await client.query(`
      SELECT schema_name
      FROM information_schema.schemata
      WHERE schema_name NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
        AND schema_name NOT LIKE 'pg_temp_%'
        AND schema_name NOT LIKE 'pg_toast_temp_%'
      ORDER BY schema_name
    `)
    return result.rows.map((r) => r.schema_name)
  } finally {
    await client.end()
  }
}

export async function extractSchema(
  connectionString: string,
  schemaName: string = 'public',
): Promise<Schema> {
  const client = new Client({ connectionString })
  await client.connect()

  try {
    const colResult = await client.query(
      `
      SELECT
        c.table_name,
        c.column_name,
        c.udt_name,
        c.is_nullable,
        c.column_default
      FROM information_schema.columns c
      WHERE c.table_schema = $1
      ORDER BY c.table_name, c.ordinal_position
    `,
      [schemaName],
    )

    const pkResult = await client.query(
      `
      SELECT tc.table_name, kcu.column_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
      WHERE tc.constraint_type = 'PRIMARY KEY'
        AND tc.table_schema = $1
    `,
      [schemaName],
    )

    const fkResult = await client.query(
      `
      SELECT
        tc.table_name AS from_table,
        kcu.column_name AS from_column,
        ccu.table_name AS to_table,
        ccu.column_name AS to_column,
        tc.constraint_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage ccu
        ON ccu.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = $1
    `,
      [schemaName],
    )

    const idxResult = await client.query(
      `
      SELECT tablename, indexname, indexdef
      FROM pg_indexes
      WHERE schemaname = $1
      ORDER BY tablename, indexname
    `,
      [schemaName],
    )

    const tablesMap = new Map<string, Table>()

    for (const row of colResult.rows) {
      if (!tablesMap.has(row.table_name)) {
        tablesMap.set(row.table_name, {
          name: row.table_name,
          columns: [],
          primaryKeys: [],
          indexes: [],
        })
      }
      tablesMap.get(row.table_name)!.columns.push({
        name: row.column_name,
        type: row.udt_name,
        nullable: row.is_nullable === 'YES',
        defaultValue: row.column_default,
      })
    }

    const pkMap = new Map<string, string[]>()
    for (const row of pkResult.rows) {
      if (!pkMap.has(row.table_name)) pkMap.set(row.table_name, [])
      pkMap.get(row.table_name)!.push(row.column_name)
    }
    for (const [tableName, pks] of pkMap) {
      const table = tablesMap.get(tableName)
      if (table) table.primaryKeys = pks
    }

    for (const row of idxResult.rows) {
      const table = tablesMap.get(row.tablename)
      if (!table) continue
      const match = row.indexdef.match(/\(([^)]+)\)/)
      const columns = match ? match[1].split(',').map((c: string) => c.trim()) : []
      table.indexes.push({
        name: row.indexname,
        columns,
        unique: row.indexdef.startsWith('CREATE UNIQUE'),
      })
    }

    const relations: Relation[] = fkResult.rows.map((row) => ({
      fromTable: row.from_table,
      fromColumn: row.from_column,
      toTable: row.to_table,
      toColumn: row.to_column,
      constraintName: row.constraint_name,
    }))

    return { name: schemaName, tables: Array.from(tablesMap.values()), relations }
  } finally {
    await client.end()
  }
}

// ── Metadata types ──

export type Trigger = {
  name: string
  table: string
  event: string
  timing: string
  function: string
  enabled: boolean
  body: string
}

export type Function = {
  name: string
  returnType: string
  arguments: string
  language: string
  securityType: string
  body: string
}

export type View = {
  name: string
  definition: string
}

export type MaterializedView = {
  name: string
  definition: string
  hasIndexes: boolean
}

export type Sequence = {
  name: string
  dataType: string
  startValue: string
  minValue: string
  maxValue: string
  increment: string
  ownedBy: string | null
}

export type EnumType = {
  name: string
  labels: string[]
}

export type Extension = {
  name: string
  version: string
  schema: string
}

export type Constraint = {
  name: string
  table: string
  type: string
  definition: string
}

export type TableSize = {
  name: string
  totalSize: string
  indexSize: string
  toastSize: string
  rowCount: number
}

export type RlsPolicy = {
  name: string
  table: string
  command: string
  permissive: string
  roles: string[]
  usingExpr: string | null
  checkExpr: string | null
}

export type Grant = {
  table: string
  grantee: string
  privilegeType: string
  isGrantable: boolean
}

export type Metadata = {
  triggers: Trigger[]
  functions: Function[]
  views: View[]
  materializedViews: MaterializedView[]
  sequences: Sequence[]
  enums: EnumType[]
  extensions: Extension[]
  constraints: Constraint[]
  tableSizes: TableSize[]
  rlsPolicies: RlsPolicy[]
  grants: Grant[]
}

export async function extractMetadata(
  connectionString: string,
  schemaName: string = 'public',
): Promise<Metadata> {
  const client = new Client({ connectionString })
  await client.connect()

  try {
    const [
      triggers,
      functions,
      views,
      materializedViews,
      sequences,
      enums,
      extensions,
      constraints,
      tableSizes,
      rlsPolicies,
      grants,
    ] = await Promise.all([
      client.query(
        `
          SELECT
            t.tgname AS name,
            c.relname AS "table",
            array_to_string(array_remove(ARRAY[
              CASE WHEN t.tgtype::int::bit(7) & b'0000001'::bit(7) != b'0000000'::bit(7) THEN 'INSERT' END,
              CASE WHEN t.tgtype::int::bit(7) & b'0000010'::bit(7) != b'0000000'::bit(7) THEN 'UPDATE' END,
              CASE WHEN t.tgtype::int::bit(7) & b'0000100'::bit(7) != b'0000000'::bit(7) THEN 'DELETE' END,
              CASE WHEN t.tgtype::int::bit(7) & b'0001000'::bit(7) != b'0000000'::bit(7) THEN 'TRUNCATE' END
            ], NULL), ', ') AS event,
            CASE
              WHEN t.tgtype::int & 2 != 0 THEN 'BEFORE'
              WHEN t.tgtype::int & 64 != 0 THEN 'INSTEAD OF'
              ELSE 'AFTER'
            END AS timing,
            p.proname AS function,
            t.tgenabled != 'D' AS enabled,
            pg_get_triggerdef(t.oid) AS body
          FROM pg_trigger t
          JOIN pg_class c ON t.tgrelid = c.oid
          JOIN pg_namespace n ON c.relnamespace = n.oid
          JOIN pg_proc p ON t.tgfoid = p.oid
          WHERE NOT t.tgisinternal
            AND n.nspname = $1
          ORDER BY c.relname, t.tgname
        `,
        [schemaName],
      ),
      client.query(
        `
          SELECT
            p.proname AS name,
            pg_catalog.format_type(p.prorettype, NULL) AS "returnType",
            pg_catalog.pg_get_function_arguments(p.oid) AS arguments,
            l.lanname AS language,
            CASE p.prosecdef WHEN true THEN 'DEFINER' ELSE 'INVOKER' END AS "securityType",
            pg_get_functiondef(p.oid) AS body
          FROM pg_proc p
          JOIN pg_namespace n ON p.pronamespace = n.oid
          JOIN pg_language l ON p.prolang = l.oid
          WHERE n.nspname = $1
            AND p.prokind IN ('f', 'p')
          ORDER BY p.proname
        `,
        [schemaName],
      ),
      client.query(
        `
          SELECT table_name AS name, view_definition AS definition
          FROM information_schema.views
          WHERE table_schema = $1
          ORDER BY table_name
        `,
        [schemaName],
      ),
      client.query(
        `
          SELECT
            mv.matviewname AS name,
            mv.definition,
            EXISTS (
              SELECT 1 FROM pg_indexes i
              WHERE i.schemaname = mv.schemaname
                AND i.tablename = mv.matviewname
            ) AS "hasIndexes"
          FROM pg_matviews mv
          WHERE mv.schemaname = $1
          ORDER BY mv.matviewname
        `,
        [schemaName],
      ),
      client.query(
        `
          SELECT
            s.sequencename AS name,
            s.data_type AS "dataType",
            s.start_value AS "startValue",
            s.min_value AS "minValue",
            s.max_value AS "maxValue",
            s.increment_by AS "increment",
            null::text AS "ownedBy"
          FROM pg_sequences s
          WHERE s.schemaname = $1
          ORDER BY s.sequencename
        `,
        [schemaName],
      ),
      client.query(
        `
          SELECT
            t.typname AS name,
            string_agg(e.enumlabel, ',' ORDER BY e.enumsortorder) AS labels
          FROM pg_type t
          JOIN pg_namespace n ON t.typnamespace = n.oid
          JOIN pg_enum e ON t.oid = e.enumtypid
          WHERE n.nspname = $1
          GROUP BY t.typname
          ORDER BY t.typname
        `,
        [schemaName],
      ),
      client.query(
        `
          SELECT
            e.extname AS name,
            e.extversion AS version,
            n.nspname AS schema
          FROM pg_extension e
          JOIN pg_namespace n ON e.extnamespace = n.oid
          ORDER BY e.extname
        `,
      ),
      client.query(
        `
          SELECT
            con.conname AS name,
            cl.relname AS "table",
            CASE con.contype
              WHEN 'c' THEN 'CHECK'
              WHEN 'u' THEN 'UNIQUE'
              WHEN 'x' THEN 'EXCLUDE'
              WHEN 'p' THEN 'PRIMARY KEY'
              WHEN 'f' THEN 'FOREIGN KEY'
              ELSE con.contype::text
            END AS type,
            pg_get_constraintdef(con.oid) AS definition
          FROM pg_constraint con
          JOIN pg_class cl ON con.conrelid = cl.oid
          JOIN pg_namespace n ON cl.relnamespace = n.oid
          WHERE n.nspname = $1
          ORDER BY cl.relname, con.conname
        `,
        [schemaName],
      ),
      client.query(
        `
          SELECT
            c.relname AS name,
            pg_size_pretty(pg_total_relation_size(c.oid)) AS "totalSize",
            pg_size_pretty(pg_indexes_size(c.oid)) AS "indexSize",
            pg_size_pretty(pg_total_relation_size(c.reltoastrelid)) AS "toastSize",
            COALESCE(s.n_live_tup, 0)::bigint AS "rowCount"
          FROM pg_class c
          JOIN pg_namespace n ON c.relnamespace = n.oid
          LEFT JOIN pg_stat_user_tables s ON s.schemaname = n.nspname AND s.relname = c.relname
          WHERE n.nspname = $1
            AND c.relkind = 'r'
          ORDER BY pg_total_relation_size(c.oid) DESC
        `,
        [schemaName],
      ),
      client.query(
        `
          SELECT
            pol.polname AS name,
            cl.relname AS "table",
            CASE pol.polcmd
              WHEN 'r' THEN 'SELECT'
              WHEN 'a' THEN 'INSERT'
              WHEN 'w' THEN 'UPDATE'
              WHEN 'd' THEN 'DELETE'
              WHEN '*' THEN 'ALL'
              ELSE pol.polcmd::text
            END AS command,
            CASE pol.polpermissive WHEN true THEN 'PERMISSIVE' ELSE 'RESTRICTIVE' END AS permissive,
            ARRAY(
              SELECT rolname FROM pg_roles
              WHERE oid = ANY(pol.polroles)
              ORDER BY rolname
            ) AS roles,
            pg_get_expr(pol.polqual, pol.polrelid) AS "usingExpr",
            pg_get_expr(pol.polwithcheck, pol.polrelid) AS "checkExpr"
          FROM pg_policy pol
          JOIN pg_class cl ON pol.polrelid = cl.oid
          JOIN pg_namespace n ON cl.relnamespace = n.oid
          WHERE n.nspname = $1
          ORDER BY cl.relname, pol.polname
        `,
        [schemaName],
      ),
      client.query(
        `
          SELECT
            table_name AS "table",
            grantee,
            privilege_type AS "privilegeType",
            is_grantable = 'YES' AS "isGrantable"
          FROM information_schema.role_table_grants
          WHERE table_schema = $1
            AND grantee NOT IN ('postgres')
          ORDER BY table_name, grantee, privilege_type
        `,
        [schemaName],
      ),
    ])

    return {
      triggers: triggers.rows.map((r) => ({
        name: r.name,
        table: r.table,
        event: r.event,
        timing: r.timing,
        function: r.function,
        enabled: r.enabled,
        body: r.body,
      })),
      functions: functions.rows.map((r) => ({
        name: r.name,
        returnType: r.returnType,
        arguments: r.arguments,
        language: r.language,
        securityType: r.securityType,
        body: r.body,
      })),
      views: views.rows.map((r) => ({ name: r.name, definition: r.definition })),
      materializedViews: materializedViews.rows.map((r) => ({
        name: r.name,
        definition: r.definition,
        hasIndexes: r.hasIndexes,
      })),
      sequences: sequences.rows.map((r) => ({
        name: r.name,
        dataType: r.dataType,
        startValue: r.startValue,
        minValue: r.minValue,
        maxValue: r.maxValue,
        increment: r.increment,
        ownedBy: r.ownedBy,
      })),
      enums: enums.rows.map((r) => ({ name: r.name, labels: (r.labels as string).split(',') })),
      extensions: extensions.rows.map((r) => ({
        name: r.name,
        version: r.version,
        schema: r.schema,
      })),
      constraints: constraints.rows.map((r) => ({
        name: r.name,
        table: r.table,
        type: r.type,
        definition: r.definition,
      })),
      tableSizes: tableSizes.rows.map((r) => ({
        name: r.name,
        totalSize: r.totalSize,
        indexSize: r.indexSize,
        toastSize: r.toastSize,
        rowCount: Number(r.rowCount),
      })),
      rlsPolicies: rlsPolicies.rows.map((r) => ({
        name: r.name,
        table: r.table,
        command: r.command,
        permissive: r.permissive,
        roles: r.roles,
        usingExpr: r.usingExpr,
        checkExpr: r.checkExpr,
      })),
      grants: grants.rows.map((r) => ({
        table: r.table,
        grantee: r.grantee,
        privilegeType: r.privilegeType,
        isGrantable: r.isGrantable,
      })),
    }
  } finally {
    await client.end()
  }
}
