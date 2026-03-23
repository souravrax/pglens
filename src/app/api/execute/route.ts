import { NextRequest, NextResponse } from 'next/server'
import { Client } from 'pg'

const DANGEROUS = /^\s*(INSERT|UPDATE|DELETE|DROP|ALTER|TRUNCATE|CREATE|GRANT|REVOKE)\b/i
const SELECT = /^\s*(SELECT|WITH|EXPLAIN|SHOW)\b/i

export async function POST(req: NextRequest) {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    return NextResponse.json({ error: 'DATABASE_URL not set' }, { status: 500 })
  }

  const body = await req.json()
  const sql: string = body.sql

  if (!sql || typeof sql !== 'string') {
    return NextResponse.json({ error: 'sql is required' }, { status: 400 })
  }

  // Only allow read-only queries
  if (!SELECT.test(sql)) {
    return NextResponse.json(
      { error: 'Only SELECT, WITH, EXPLAIN, and SHOW queries are allowed' },
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
    const start = Date.now()
    const result = await client.query(sql)
    const duration = Date.now() - start

    // Infer columns from first row
    const columns =
      result.fields?.map((f) => ({
        name: f.name,
        type: f.dataTypeID?.toString() ?? '',
      })) ?? []

    return NextResponse.json({
      rows: result.rows,
      columns,
      rowCount: result.rowCount ?? 0,
      duration,
    })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 })
  } finally {
    await client.end()
  }
}
