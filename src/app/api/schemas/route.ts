import { NextResponse } from 'next/server'
import { listSchemas } from '@/lib/extract'

export async function GET() {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    return NextResponse.json({ error: 'DATABASE_URL not set' }, { status: 500 })
  }

  try {
    const schemas = await listSchemas(databaseUrl)
    return NextResponse.json(schemas)
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
