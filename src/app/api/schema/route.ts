import { NextRequest, NextResponse } from 'next/server'
import { extractSchema } from '@/lib/extract'
import { getDatabaseUrl } from '@/lib/api-utils'

export async function GET(req: NextRequest) {
  const databaseUrl = await getDatabaseUrl(req)
  if (!databaseUrl) {
    return NextResponse.json({ error: 'Database connection URL not provided' }, { status: 500 })
  }

  const schemaName = req.nextUrl.searchParams.get('schema') ?? 'public'

  try {
    const schema = await extractSchema(databaseUrl, schemaName)
    return NextResponse.json(schema)
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
