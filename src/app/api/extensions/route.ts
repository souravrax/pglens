import { NextRequest, NextResponse } from 'next/server'
import {
  listInstalledExtensions,
  listAvailableExtensions,
  installExtension,
  dropExtension,
} from '@/lib/extract'
import { getDatabaseUrl } from '@/lib/api-utils'

export async function GET(req: NextRequest) {
  const databaseUrl = await getDatabaseUrl(req)
  if (!databaseUrl) {
    return NextResponse.json({ error: 'Database connection URL not provided' }, { status: 500 })
  }

  try {
    const [installed, available] = await Promise.all([
      listInstalledExtensions(databaseUrl),
      listAvailableExtensions(databaseUrl),
    ])

    const installedNames = new Set(installed.map((e) => e.name))
    const notInstalled = available.filter((e) => !installedNames.has(e.name))

    return NextResponse.json({ installed, available: notInstalled })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const databaseUrl = await getDatabaseUrl(req)
  if (!databaseUrl) {
    return NextResponse.json({ error: 'Database connection URL not provided' }, { status: 500 })
  }

  try {
    const body = await req.json()
    const { name, schema, version } = body

    if (!name || typeof name !== 'string') {
      return NextResponse.json({ error: 'Extension name is required' }, { status: 400 })
    }

    await installExtension(databaseUrl, name, schema, version)
    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const databaseUrl = await getDatabaseUrl(req)
  if (!databaseUrl) {
    return NextResponse.json({ error: 'Database connection URL not provided' }, { status: 500 })
  }

  try {
    const { searchParams } = new URL(req.url)
    const name = searchParams.get('name')

    if (!name) {
      return NextResponse.json({ error: 'Extension name is required' }, { status: 400 })
    }

    await dropExtension(databaseUrl, name)
    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
