import { NextRequest } from 'next/server'
import { decryptUrl } from '@/lib/crypto'

export async function getDatabaseUrl(req: NextRequest): Promise<string | null> {
  const cipher = req.headers.get('x-db-cipher')
  const iv = req.headers.get('x-db-iv')
  const ts = req.headers.get('x-db-ts')

  if (!cipher || !iv || !ts) return null

  const timestamp = parseInt(ts, 10)
  if (isNaN(timestamp) || Math.abs(Date.now() - timestamp) > 5 * 60 * 1000) {
    return null
  }

  const pepper = process.env.SCHEMA_VIZ_SECRET
  if (!pepper) return null

  try {
    return await decryptUrl(cipher, iv, timestamp, req.method, req.nextUrl.pathname, pepper)
  } catch {
    return null
  }
}
