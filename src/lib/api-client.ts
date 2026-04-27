import { encryptUrl } from './crypto'

let pepper: string | null = null

export async function fetchPepper(): Promise<string | null> {
  if (pepper) return pepper
  const res = await fetch('/api/config')
  if (!res.ok) throw new Error('Failed to fetch encryption config')
  const data = await res.json()
  if (!data.pepper) throw new Error('No encryption pepper returned')
  pepper = data.pepper
  return pepper
}

export async function secureFetch(
  url: string,
  dbUrl: string,
  options: RequestInit = {},
): Promise<Response> {
  const p = await fetchPepper()
  const method = options.method || 'GET'
  const path = new URL(
    url,
    typeof window !== 'undefined' ? window.location.href : 'http://localhost',
  ).pathname
  const timestamp = Date.now()
  const { cipher, iv } = await encryptUrl(dbUrl, method, path, timestamp, p!)

  return fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      'x-db-cipher': cipher,
      'x-db-iv': iv,
      'x-db-ts': String(timestamp),
    },
  })
}
