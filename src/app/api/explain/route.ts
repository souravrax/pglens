import { NextRequest, NextResponse } from 'next/server'
import { Client } from 'pg'
import { getDatabaseUrl } from '@/lib/api-utils'

const DANGEROUS = /^\s*(INSERT|UPDATE|DELETE|DROP|ALTER|TRUNCATE|CREATE|GRANT|REVOKE)\b/i
const ALLOWED = /^\s*(SELECT|WITH|EXPLAIN|SHOW|VALUES)\b/i

export async function POST(req: NextRequest) {
  const databaseUrl = await getDatabaseUrl(req)
  if (!databaseUrl) {
    return NextResponse.json({ error: 'Database connection URL not provided' }, { status: 500 })
  }

  const body = await req.json()
  const sql: string = body.sql
  const analyze: boolean = body.analyze ?? false
  const buffers: boolean = body.buffers ?? false

  if (!sql || typeof sql !== 'string') {
    return NextResponse.json({ error: 'sql is required' }, { status: 400 })
  }

  // Only allow read-only queries
  if (!ALLOWED.test(sql)) {
    return NextResponse.json(
      { error: 'Only SELECT, WITH, EXPLAIN, SHOW, and VALUES queries are allowed' },
      { status: 400 },
    )
  }

  // Block dangerous keywords even if present in strings
  if (DANGEROUS.test(sql)) {
    return NextResponse.json(
      { error: 'Query contains forbidden operations (INSERT, UPDATE, DELETE, etc.)' },
      { status: 400 },
    )
  }

  const client = new Client({ connectionString: databaseUrl })
  await client.connect()

  try {
    const options = ['FORMAT JSON']
    if (analyze) options.push('ANALYZE')
    if (buffers && analyze) options.push('BUFFERS')

    const explainSql = `EXPLAIN (${options.join(', ')}) ${sql}`
    const result = await client.query(explainSql)

    // PostgreSQL returns EXPLAIN as rows with a single "QUERY PLAN" column.
    // When FORMAT JSON, the pg driver may auto-parse it into an object,
    // or return it as a JSON string depending on version/settings.
    const planValue = result.rows[0]['QUERY PLAN']
    const planJson = typeof planValue === 'string' ? JSON.parse(planValue) : planValue

    return NextResponse.json({
      plan: planJson[0].Plan,
      settings: planJson[0]['Settings'] ?? null,
      planningTime: planJson[0]['Planning Time'] ?? null,
      executionTime: planJson[0]['Execution Time'] ?? null,
    })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 })
  } finally {
    await client.end()
  }
}
