import { customAlphabet } from 'nanoid'

interface GenerateIdOptions {
  length?: number
}

export function generateId(options?: GenerateIdOptions) {
  const { length = 12 } = options ?? {}
  return customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz', length)()
}
