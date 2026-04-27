const ALGORITHM = 'AES-GCM'

async function deriveKeyData(
  method: string,
  path: string,
  timestamp: number,
  pepper: string,
): Promise<ArrayBuffer> {
  const encoder = new TextEncoder()
  const input = `${pepper}:${method}:${path}:${timestamp}`
  return crypto.subtle.digest('SHA-256', encoder.encode(input))
}

async function deriveCryptoKey(
  method: string,
  path: string,
  timestamp: number,
  pepper: string,
): Promise<CryptoKey> {
  const keyData = await deriveKeyData(method, path, timestamp, pepper)
  return crypto.subtle.importKey('raw', keyData, { name: ALGORITHM }, false, ['encrypt', 'decrypt'])
}

export async function encryptUrl(
  url: string,
  method: string,
  path: string,
  timestamp: number,
  pepper: string,
): Promise<{ cipher: string; iv: string }> {
  const key = await deriveCryptoKey(method, path, timestamp, pepper)
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encrypted = await crypto.subtle.encrypt(
    { name: ALGORITHM, iv },
    key,
    new TextEncoder().encode(url),
  )
  return {
    cipher: btoa(String.fromCharCode(...new Uint8Array(encrypted))),
    iv: btoa(String.fromCharCode(...iv)),
  }
}

export async function decryptUrl(
  cipher: string,
  iv: string,
  timestamp: number,
  method: string,
  path: string,
  pepper: string,
): Promise<string> {
  const key = await deriveCryptoKey(method, path, timestamp, pepper)
  const encrypted = Uint8Array.from(atob(cipher), (c) => c.charCodeAt(0))
  const ivBytes = Uint8Array.from(atob(iv), (c) => c.charCodeAt(0))
  const decrypted = await crypto.subtle.decrypt({ name: ALGORITHM, iv: ivBytes }, key, encrypted)
  return new TextDecoder().decode(decrypted)
}
