import { invoke } from '@tauri-apps/api/core'

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

export type ColumnInfo = { name: string; type: string }

export type QueryResult = {
  rows: Record<string, unknown>[]
  total: number
  page: number
  page_size: number
  columns: ColumnInfo[]
}

export type ExecuteResult = {
  rows: Record<string, unknown>[]
  columns: ColumnInfo[]
  row_count: number
  duration: number
}

export type ExplainPlan = {
  plan: Record<string, unknown>
  settings: Record<string, unknown> | null
  planning_time: number | null
  execution_time: number | null
}

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

export type AvailableExtension = {
  name: string
  defaultVersion: string
  installedVersion: string | null
  comment: string | null
}

export type ExtensionsResult = {
  installed: Extension[]
  available: AvailableExtension[]
}

export async function getSchema(url: string, schema: string): Promise<Schema> {
  return invoke<Schema>('get_schema', { url, schema })
}

export async function listSchemas(url: string): Promise<string[]> {
  return invoke<string[]>('list_schemas', { url })
}

export async function queryTable(
  url: string,
  table: string,
  schema: string,
  page: number,
  pageSize: number,
  sort?: string,
  filters?: string,
): Promise<QueryResult> {
  return invoke<QueryResult>('query_table', { url, table, schema, page, pageSize, sort, filters })
}

export async function executeSql(url: string, sql: string): Promise<ExecuteResult> {
  return invoke<ExecuteResult>('execute_sql', { url, sql })
}

export async function explainSql(
  url: string,
  sql: string,
  analyze: boolean,
  buffers: boolean,
): Promise<ExplainPlan> {
  return invoke<ExplainPlan>('explain_sql', { url, sql, analyze, buffers })
}

export async function getMetadata(url: string, schema: string): Promise<Metadata> {
  return invoke<Metadata>('get_metadata', { url, schema })
}

export async function listExtensions(url: string): Promise<ExtensionsResult> {
  return invoke<ExtensionsResult>('list_extensions', { url })
}

export async function installExtension(
  url: string,
  name: string,
  schema?: string,
  version?: string,
): Promise<void> {
  return invoke<void>('install_extension', { url, name, schema, version })
}

export async function dropExtension(url: string, name: string): Promise<void> {
  return invoke<void>('drop_extension', { url, name })
}

// Stronghold credential store
export type DatabaseConfig = {
  id: string
  name: string
  url: string
  createdAt: number
}

export async function getDatabases(): Promise<DatabaseConfig[]> {
  return invoke<DatabaseConfig[]>('get_databases')
}

export async function addDatabase(
  id: string,
  name: string,
  url: string,
  createdAt: number,
): Promise<void> {
  return invoke<void>('add_database', { id, name, url, createdAt })
}

export async function removeDatabase(id: string): Promise<void> {
  return invoke<void>('remove_database', { id })
}

// ── License validation ─────────────────────────────────────────────────────

export type LicenseInfo = {
  key: string
  activatedAt: number
  productId: string
}

export async function activateLicense(
  key: string,
  productId: string,
): Promise<void> {
  return invoke<void>('activate_license', { key, productId })
}

export async function getLicense(): Promise<LicenseInfo | null> {
  return invoke<LicenseInfo | null>('get_license')
}

export async function deactivateLicense(): Promise<void> {
  return invoke<void>('deactivate_license')
}
