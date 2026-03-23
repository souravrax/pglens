import { NextResponse } from 'next/server'
import { extractSchema } from '@/lib/extract'

export async function GET() {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    return NextResponse.json({ error: 'DATABASE_URL not set' }, { status: 500 })
  }

  try {
    const schema = await extractSchema(databaseUrl)
    return NextResponse.json(schema)
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
