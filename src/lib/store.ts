import { create } from 'zustand'
import { persist, createJSONStorage, type StateStorage } from 'zustand/middleware'
import { get, set, del } from 'idb-keyval'
import type { Schema } from '@/lib/extract'

export type DatabaseConfig = {
  id: string
  name: string
  url: string
  createdAt: number
}

type SchemaStore = {
  databases: DatabaseConfig[]
  addDatabase: (name: string, url: string) => void
  deleteDatabase: (id: string) => void
  activeDatabase: DatabaseConfig | null
  setActiveDatabase: (db: DatabaseConfig | null) => void
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

const idbStorage: StateStorage = {
  getItem: async (name) => {
    const value = await get(name)
    return value ?? null
  },
  setItem: async (name, value) => {
    await set(name, value)
  },
  removeItem: async (name) => {
    await del(name)
  },
}

export const schemaStore = create<SchemaStore>()(
  persist(
    (set) => ({
      databases: [],
      addDatabase: (name, url) =>
        set((s) => ({
          databases: [
            ...s.databases,
            { id: crypto.randomUUID(), name, url, createdAt: Date.now() },
          ],
        })),
      deleteDatabase: (id) =>
        set((s) => ({
          databases: s.databases.filter((d) => d.id !== id),
          activeDatabase: s.activeDatabase?.id === id ? null : s.activeDatabase,
        })),
      activeDatabase: null,
      setActiveDatabase: (db) => set({ activeDatabase: db, schema: null, selectedTable: null }),
      schemas: [],
      setSchemas: (schemas) => set({ schemas }),
      selectedSchema: 'public',
      setSelectedSchema: (schema) =>
        set({ selectedSchema: schema, schema: null, selectedTable: null }),
      schema: null,
      setSchema: (schema) => set({ schema }),
      selectedTable: null,
      setSelectedTable: (table) =>
        set((s) => ({ selectedTable: s.selectedTable === table ? null : table })),
      search: '',
      setSearch: (search) => set({ search }),
    }),
    {
      name: 'pgviz-db',
      storage: createJSONStorage(() => idbStorage),
      partialize: (state) => ({
        databases: state.databases,
        activeDatabase: state.activeDatabase,
        selectedSchema: state.selectedSchema,
      }),
    },
  ),
)
