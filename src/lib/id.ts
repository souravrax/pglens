import { customAlphabet } from 'nanoid'

interface GenerateIdOptions {
  length?: number
}

export function generateId(options?: GenerateIdOptions) {
  const { length = 12 } = options ?? {}
  return customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz', length)()
}

export function generateSlug(name: string, existing: Set<string>): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .replace(/-+/g, '-')
    .slice(0, 50)

  if (!base) {
    const fallback = `project-${Date.now()}`
    return existing.has(fallback) ? `${fallback}-1` : fallback
  }

  if (!existing.has(base)) return base

  let counter = 1
  let slug = `${base}-${counter}`
  while (existing.has(slug)) {
    counter++
    slug = `${base}-${counter}`
  }
  return slug
}
