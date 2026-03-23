import { NextRequest, NextResponse } from 'next/server'
import { Client } from 'pg'

export async function GET(req: NextRequest) {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    return NextResponse.json({ error: 'DATABASE_URL not set' }, { status: 500 })
  }

  const { searchParams } = req.nextUrl
  const table = searchParams.get('table')
  const page = parseInt(searchParams.get('page') ?? '1', 10)
  const pageSize = parseInt(searchParams.get('pageSize') ?? '20', 10)
  const sort = searchParams.get('sort') // e.g. "name:asc"
  const filters = searchParams.get('filters') // JSON: { column: "value" }

  if (!table) {
    return NextResponse.json({ error: 'table param required' }, { status: 400 })
  }

  // Validate table name to prevent SQL injection
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(table)) {
    return NextResponse.json({ error: 'Invalid table name' }, { status: 400 })
  }

  const client = new Client({ connectionString: databaseUrl })
  await client.connect()

  try {
    // Build WHERE from filters
    const whereClauses: string[] = []
    const params: unknown[] = []
    let paramIdx = 1

    if (filters) {
      try {
        const parsed = JSON.parse(filters) as Record<string, string>
        for (const [col, val] of Object.entries(parsed)) {
          if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(col)) continue
          whereClauses.push(`"${col}"::text ILIKE $${paramIdx}`)
          params.push(`%${val}%`)
          paramIdx++
        }
      } catch {
        // ignore bad filters
      }
    }

    const whereSql = whereClauses.length ? `WHERE ${whereClauses.join(' AND ')}` : ''

    // Build ORDER BY
    let orderSql = ''
    if (sort) {
      const [col, dir] = sort.split(':')
      if (col && /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(col) && ['asc', 'desc'].includes(dir ?? '')) {
        orderSql = `ORDER BY "${col}" ${dir === 'desc' ? 'DESC' : 'ASC'}`
      }
    }

    // Count
    const countResult = await client.query(
      `SELECT COUNT(*) as total FROM "${table}" ${whereSql}`,
      params,
    )
    const total = parseInt(countResult.rows[0].total, 10)

    // Fetch page
    const offset = (page - 1) * pageSize
    const dataResult = await client.query(
      `SELECT * FROM "${table}" ${whereSql} ${orderSql} LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
      [...params, pageSize, offset],
    )

    // Get column info
    const colResult = await client.query(
      `SELECT column_name, udt_name FROM information_schema.columns WHERE table_name = $1 ORDER BY ordinal_position`,
      [table],
    )

    return NextResponse.json({
      rows: dataResult.rows,
      total,
      page,
      pageSize,
      columns: colResult.rows.map((r) => ({
        name: r.column_name,
        type: r.udt_name,
      })),
    })
  } finally {
    await client.end()
  }
}
