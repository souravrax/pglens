import pg from 'pg'

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

let clients = new Map<string, pg.Client>()

async function getClient(url: string): Promise<pg.Client> {
  if (clients.has(url)) {
    const client = clients.get(url)!
    // ping to verify connection
    try {
      await client.query('SELECT 1')
      return client
    } catch {
      // reconnect
      await client.end().catch(() => {})
      clients.delete(url)
    }
  }
  const client = new pg.Client({ connectionString: url })
  await client.connect()
  clients.set(url, client)
  return client
}

export async function disconnectAll(): Promise<void> {
  for (const [, client] of clients) {
    await client.end().catch(() => {})
  }
  clients.clear()
}

export async function listSchemas(url: string, showInternal: boolean): Promise<string[]> {
  const client = await getClient(url)
  const sql = showInternal
    ? `SELECT schema_name FROM information_schema.schemata ORDER BY schema_name`
    : `SELECT schema_name FROM information_schema.schemata
       WHERE schema_name NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
         AND schema_name NOT LIKE 'pg_temp_%'
         AND schema_name NOT LIKE 'pg_toast_temp_%'
       ORDER BY schema_name`
  const result = await client.query(sql)
  return result.rows.map((r) => r.schema_name as string)
}

export async function extractSchema(url: string, schemaName: string): Promise<Schema> {
  const client = await getClient(url)

  const colResult = await client.query(
    `SELECT c.table_name, c.column_name, c.udt_name, c.is_nullable, c.column_default
     FROM information_schema.columns c
     WHERE c.table_schema = $1
     ORDER BY c.table_name, c.ordinal_position`,
    [schemaName]
  )

  const pkResult = await client.query(
    `SELECT tc.table_name, kcu.column_name
     FROM information_schema.table_constraints tc
     JOIN information_schema.key_column_usage kcu
       ON tc.constraint_name = kcu.constraint_name
     WHERE tc.constraint_type = 'PRIMARY KEY'
       AND tc.table_schema = $1`,
    [schemaName]
  )

  const fkResult = await client.query(
    `SELECT tc.table_name AS from_table, kcu.column_name AS from_column,
             ccu.table_name AS to_table, ccu.column_name AS to_column, tc.constraint_name
     FROM information_schema.table_constraints tc
     JOIN information_schema.key_column_usage kcu
       ON tc.constraint_name = kcu.constraint_name
     JOIN information_schema.constraint_column_usage ccu
       ON ccu.constraint_name = tc.constraint_name
     WHERE tc.constraint_type = 'FOREIGN KEY'
       AND tc.table_schema = $1`,
    [schemaName]
  )

  const idxResult = await client.query(
    `SELECT tablename, indexname, indexdef
     FROM pg_indexes
     WHERE schemaname = $1
     ORDER BY tablename, indexname`,
    [schemaName]
  )

  const tablesMap = new Map<string, Table>()

  for (const row of colResult.rows) {
    const tableName = row.table_name as string
    if (!tablesMap.has(tableName)) {
      tablesMap.set(tableName, {
        name: tableName,
        columns: [],
        primaryKeys: [],
        indexes: [],
      })
    }
    tablesMap.get(tableName)!.columns.push({
      name: row.column_name as string,
      type: row.udt_name as string,
      nullable: row.is_nullable === 'YES',
      defaultValue: row.column_default ?? null,
    })
  }

  const pkMap = new Map<string, string[]>()
  for (const row of pkResult.rows) {
    const tableName = row.table_name as string
    const columnName = row.column_name as string
    if (!pkMap.has(tableName)) pkMap.set(tableName, [])
    pkMap.get(tableName)!.push(columnName)
  }
  for (const [tableName, pks] of pkMap) {
    if (tablesMap.has(tableName)) {
      tablesMap.get(tableName)!.primaryKeys = pks
    }
  }

  for (const row of idxResult.rows) {
    const tablename = row.tablename as string
    const indexdef = row.indexdef as string
    if (tablesMap.has(tablename)) {
      const columns = extractIndexColumns(indexdef)
      tablesMap.get(tablename)!.indexes.push({
        name: row.indexname as string,
        columns,
        unique: indexdef.startsWith('CREATE UNIQUE'),
      })
    }
  }

  const relations: Relation[] = fkResult.rows.map((row) => ({
    fromTable: row.from_table as string,
    fromColumn: row.from_column as string,
    toTable: row.to_table as string,
    toColumn: row.to_column as string,
    constraintName: row.constraint_name as string,
  }))

  return {
    name: schemaName,
    tables: Array.from(tablesMap.values()),
    relations,
  }
}

function extractIndexColumns(indexdef: string): string[] {
  const start = indexdef.indexOf('(')
  const end = indexdef.indexOf(')')
  if (start !== -1 && end !== -1 && end > start) {
    return indexdef
      .slice(start + 1, end)
      .split(',')
      .map((s) => s.trim())
  }
  return []
}
