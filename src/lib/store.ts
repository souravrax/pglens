import { createStore } from 'zustand'
import type { Schema } from '@/lib/extract'

type SchemaStore = {
  schemas: string[]
  setSchemas: (schemas: string[]) => void
  selectedSchema: string
  setSelectedSchema: (schema: string) => void
  schema: Schema | null
  setSchema: (schema: Schema) => void
  selectedTable: string | null
  setSelectedTable: (table: string | null) => void
  search: string
  setSearch: (search: string) => void
}

export const schemaStore = createStore<SchemaStore>((set) => ({
  schemas: [],
  setSchemas: (schemas) => set({ schemas }),
  selectedSchema: 'public',
  setSelectedSchema: (schema) => set({ selectedSchema: schema, schema: null, selectedTable: null }),
  schema: null,
  setSchema: (schema) => set({ schema }),
  selectedTable: null,
  setSelectedTable: (table) =>
    set((s) => ({ selectedTable: s.selectedTable === table ? null : table })),
  search: '',
  setSearch: (search) => set({ search }),
}))
