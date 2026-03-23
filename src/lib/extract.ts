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
  tables: Table[]
  relations: Relation[]
}

export async function extractSchema(connectionString: string): Promise<Schema> {
  const client = new Client({ connectionString })
  await client.connect()

  try {
    const colResult = await client.query(`
      SELECT
        c.table_name,
        c.column_name,
        c.udt_name,
        c.is_nullable,
        c.column_default
      FROM information_schema.columns c
      WHERE c.table_schema = 'public'
      ORDER BY c.table_name, c.ordinal_position
    `)

    const pkResult = await client.query(`
      SELECT tc.table_name, kcu.column_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
      WHERE tc.constraint_type = 'PRIMARY KEY'
        AND tc.table_schema = 'public'
    `)

    const fkResult = await client.query(`
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
        AND tc.table_schema = 'public'
    `)

    const idxResult = await client.query(`
      SELECT tablename, indexname, indexdef
      FROM pg_indexes
      WHERE schemaname = 'public'
      ORDER BY tablename, indexname
    `)

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

    return { tables: Array.from(tablesMap.values()), relations }
  } finally {
    await client.end()
  }
}
