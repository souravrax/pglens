import { NextRequest, NextResponse } from 'next/server'
import { extractMetadata } from '@/lib/extract'
import { getDatabaseUrl } from '@/lib/api-utils'

export async function GET(req: NextRequest) {
  const databaseUrl = await getDatabaseUrl(req)
  if (!databaseUrl) {
    return NextResponse.json({ error: 'Database connection URL not provided' }, { status: 500 })
  }

  const schemaName = req.nextUrl.searchParams.get('schema') ?? 'public'

  try {
    const metadata = await extractMetadata(databaseUrl, schemaName)
    return NextResponse.json(metadata)
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
