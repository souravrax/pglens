import { createStore } from 'zustand'
import type { Schema } from '@/lib/extract'

type SchemaStore = {
  schema: Schema | null
  setSchema: (schema: Schema) => void
  selectedTable: string | null
  setSelectedTable: (table: string | null) => void
  search: string
  setSearch: (search: string) => void
}

export const schemaStore = createStore<SchemaStore>((set) => ({
  schema: null,
  setSchema: (schema) => set({ schema }),
  selectedTable: null,
  setSelectedTable: (table) =>
    set((s) => ({ selectedTable: s.selectedTable === table ? null : table })),
  search: '',
  setSearch: (search) => set({ search }),
}))
