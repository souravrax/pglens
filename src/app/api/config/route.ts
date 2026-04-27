import { NextResponse } from 'next/server'

export async function GET() {
  const pepper = process.env.SCHEMA_VIZ_SECRET
  if (!pepper) {
    return NextResponse.json({ error: 'Encryption not configured' }, { status: 500 })
  }
  return NextResponse.json({ pepper })
}
