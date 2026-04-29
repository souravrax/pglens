import { PGlite } from '@electric-sql/pglite'
import type { Schema, Table, Relation } from '@/lib/extract'

const instances = new Map<string, PGlite>()

function getDataDir(projectId: string): string {
  return `idb://pgviz-playground-${projectId}`
}

export async function getPGlite(projectId: string): Promise<PGlite> {
  if (instances.has(projectId)) {
    const pg = instances.get(projectId)!
    if (!pg.closed) return pg
    instances.delete(projectId)
  }
  const pg = new PGlite(getDataDir(projectId))
  await pg.waitReady
  instances.set(projectId, pg)
  return pg
}

export async function closePGlite(projectId: string): Promise<void> {
  const pg = instances.get(projectId)
  if (pg && !pg.closed) {
    await pg.close()
  }
  instances.delete(projectId)
}

export async function resetPGlite(projectId: string): Promise<PGlite> {
  await closePGlite(projectId)
  const pg = new PGlite(getDataDir(projectId))
  await pg.waitReady
  // Hard reset: drop and recreate public schema
  await pg.query('DROP SCHEMA IF EXISTS public CASCADE')
  await pg.query('CREATE SCHEMA public')
  await pg.query('GRANT ALL ON SCHEMA public TO postgres')
  await pg.query('GRANT ALL ON SCHEMA public TO public')
  instances.set(projectId, pg)
  return pg
}

export async function execSql(
  projectId: string,
  sql: string,
): Promise<{ success: boolean; rowCount?: number; error?: string }> {
  const pg = await getPGlite(projectId)
  try {
    await pg.query('BEGIN')
    const result = await pg.exec(sql)
    await pg.query('COMMIT')

    // exec returns an array of results for each statement
    const lastResult = Array.isArray(result) ? result[result.length - 1] : result
    return {
      success: true,
      rowCount: lastResult?.affectedRows ?? lastResult?.rows?.length,
    }
  } catch (err: unknown) {
    try {
      await pg.query('ROLLBACK')
    } catch {}
    const message = err instanceof Error ? err.message : String(err)
    return { success: false, error: message }
  }
}

export async function runMigration(
  projectId: string,
  upSql: string,
): Promise<{ success: boolean; error?: string }> {
  const result = await execSql(projectId, upSql)
  return { success: result.success, error: result.error }
}

export async function rollbackMigration(
  projectId: string,
  downSql: string,
): Promise<{ success: boolean; error?: string }> {
  const result = await execSql(projectId, downSql)
  return { success: result.success, error: result.error }
}

export async function introspectSchema(projectId: string): Promise<Schema> {
  const pg = await getPGlite(projectId)

  const colResult = await pg.query<{
    table_name: string
    column_name: string
    udt_name: string
    is_nullable: string
    column_default: string | null
  }>(`
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

  const pkResult = await pg.query<{
    table_name: string
    column_name: string
  }>(`
    SELECT tc.table_name, kcu.column_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
    WHERE tc.constraint_type = 'PRIMARY KEY'
      AND tc.table_schema = 'public'
  `)

  const fkResult = await pg.query<{
    from_table: string
    from_column: string
    to_table: string
    to_column: string
    constraint_name: string
  }>(`
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

  const idxResult = await pg.query<{
    tablename: string
    indexname: string
    indexdef: string
  }>(`
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

  return { name: 'public', tables: Array.from(tablesMap.values()), relations }
}
