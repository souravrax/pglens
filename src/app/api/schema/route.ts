import { NextRequest, NextResponse } from 'next/server'
import { extractSchema } from '@/lib/extract'

export async function GET(req: NextRequest) {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    return NextResponse.json({ error: 'DATABASE_URL not set' }, { status: 500 })
  }

  const schemaName = req.nextUrl.searchParams.get('schema') ?? 'public'

  try {
    const schema = await extractSchema(databaseUrl, schemaName)
    return NextResponse.json(schema)
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
