import { NextRequest, NextResponse } from 'next/server'
import { listSchemas } from '@/lib/extract'
import { getDatabaseUrl } from '@/lib/api-utils'

export async function GET(req: NextRequest) {
  const databaseUrl = await getDatabaseUrl(req)
  if (!databaseUrl) {
    return NextResponse.json({ error: 'Database connection URL not provided' }, { status: 500 })
  }

  try {
    const schemas = await listSchemas(databaseUrl)
    return NextResponse.json(schemas)
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
