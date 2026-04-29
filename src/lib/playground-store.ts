import { create } from 'zustand'
import { persist, createJSONStorage, type StateStorage } from 'zustand/middleware'
import { get, set, del } from 'idb-keyval'
import { generateId, generateSlug } from '@/lib/id'

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

export type CellStatus = 'pending' | 'success' | 'error'

export type SchemaDiff = {
  createdTables: string[]
  droppedTables: string[]
  alteredTables: string[]
  createdIndexes: string[]
  droppedIndexes: string[]
}

export type Cell = {
  id: string
  projectId: string
  name: string
  sql: string
  order: number
  status: CellStatus
  error: string | null
  output: string | null
  schemaDiff: SchemaDiff | null
  createdAt: number
  updatedAt: number
}

export type Project = {
  id: string
  name: string
  createdAt: number
  updatedAt: number
}

type PlaygroundStore = {
  projects: Project[]
  cells: Cell[]
  activeProjectId: string | null
  activeCellId: string | null

  // Project CRUD
  createProject: (name: string) => string
  deleteProject: (id: string) => void
  renameProject: (id: string, name: string) => void
  setActiveProject: (id: string | null) => void

  // Cell CRUD
  createCell: (projectId: string, name?: string) => string
  deleteCell: (id: string) => void
  updateCell: (id: string, patch: Partial<Pick<Cell, 'sql' | 'name'>>) => void
  setActiveCell: (id: string | null) => void
  reorderCell: (id: string, direction: 'up' | 'down') => void

  // Execution status
  markCellStatus: (
    id: string,
    status: CellStatus,
    output?: string | null,
    error?: string | null,
    schemaDiff?: SchemaDiff | null,
  ) => void
  resetProjectCells: (projectId: string) => void
}

const DEFAULT_SQL_TEMPLATE = `-- SQL Cell
-- Write your DDL here.
-- Example:
-- CREATE TABLE users (
--   id SERIAL PRIMARY KEY,
--   name TEXT NOT NULL
-- );
`

function updateProject(
  state: PlaygroundStore,
  id: string,
  updater: (p: Project) => Project,
): PlaygroundStore {
  return {
    ...state,
    projects: state.projects.map((p) => (p.id === id ? updater(p) : p)),
  }
}

function updateCell(
  state: PlaygroundStore,
  id: string,
  updater: (c: Cell) => Cell,
): PlaygroundStore {
  return {
    ...state,
    cells: state.cells.map((c) => (c.id === id ? updater(c) : c)),
  }
}

function padNumber(n: number, len: number): string {
  return String(n).padStart(len, '0')
}

export const playgroundStore = create<PlaygroundStore>()(
  persist(
    (set, get) => ({
      projects: [],
      cells: [],
      activeProjectId: null,
      activeCellId: null,

      createProject: (name) => {
        const existingIds = new Set(get().projects.map((p) => p.id))
        const id = generateSlug(name, existingIds)
        const project: Project = {
          id,
          name,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        }
        set((s) => ({
          ...s,
          projects: [...s.projects, project],
          activeProjectId: project.id,
        }))
        return project.id
      },

      deleteProject: (id) =>
        set((s) => ({
          ...s,
          projects: s.projects.filter((p) => p.id !== id),
          cells: s.cells.filter((c) => c.projectId !== id),
          activeProjectId: s.activeProjectId === id ? null : s.activeProjectId,
          activeCellId:
            s.activeCellId && s.cells.find((c) => c.id === s.activeCellId)?.projectId === id
              ? null
              : s.activeCellId,
        })),

      renameProject: (id, name) =>
        set((s) => updateProject(s, id, (p) => ({ ...p, name, updatedAt: Date.now() }))),

      setActiveProject: (id) =>
        set((s) => {
          const projectCells = s.cells.filter((c) => c.projectId === id)
          const firstPending = projectCells.find((c) => c.status === 'pending')
          const lastSuccess = [...projectCells].reverse().find((c) => c.status === 'success')
          const targetCell = firstPending ?? lastSuccess ?? projectCells[0]
          return {
            ...s,
            activeProjectId: id,
            activeCellId: targetCell?.id ?? null,
          }
        }),

      createCell: (projectId, name) => {
        const projectCells = get().cells.filter((c) => c.projectId === projectId)
        const maxOrder = projectCells.reduce((max, c) => Math.max(max, c.order), 0)
        const nextOrder = maxOrder + 1
        const cellName = name ?? `${padNumber(nextOrder, 3)}_migration`
        const cell: Cell = {
          id: generateId(),
          projectId,
          name: cellName,
          sql: DEFAULT_SQL_TEMPLATE,
          order: nextOrder,
          status: 'pending',
          error: null,
          output: null,
          schemaDiff: null,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        }
        set((s) => ({
          ...s,
          cells: [...s.cells, cell],
          activeCellId: cell.id,
        }))
        return cell.id
      },

      deleteCell: (id) =>
        set((s) => {
          const deleted = s.cells.find((c) => c.id === id)
          if (!deleted) return s
          const newCells = s.cells.filter((c) => c.id !== id)
          // Reorder remaining cells in the same project
          const projectCells = newCells
            .filter((c) => c.projectId === deleted.projectId)
            .sort((a, b) => a.order - b.order)
          const reordered = projectCells.map((c, idx) => ({ ...c, order: idx + 1 }))
          const finalCells = newCells
            .filter((c) => c.projectId !== deleted.projectId)
            .concat(reordered)
          return {
            ...s,
            cells: finalCells,
            activeCellId: s.activeCellId === id ? (reordered[0]?.id ?? null) : s.activeCellId,
          }
        }),

      updateCell: (id, patch) =>
        set((s) =>
          updateCell(s, id, (c) => ({
            ...c,
            ...patch,
            updatedAt: Date.now(),
          })),
        ),

      setActiveCell: (id) => set({ activeCellId: id }),

      reorderCell: (id, direction) =>
        set((s) => {
          const cell = s.cells.find((c) => c.id === id)
          if (!cell) return s
          const projectCells = s.cells
            .filter((c) => c.projectId === cell.projectId)
            .sort((a, b) => a.order - b.order)
          const idx = projectCells.findIndex((c) => c.id === id)
          if (idx === -1) return s

          const swapIdx = direction === 'up' ? idx - 1 : idx + 1
          if (swapIdx < 0 || swapIdx >= projectCells.length) return s

          const newOrder = [...projectCells]
          const temp = newOrder[idx]!.order
          newOrder[idx]!.order = newOrder[swapIdx]!.order
          newOrder[swapIdx]!.order = temp
          ;[newOrder[idx], newOrder[swapIdx]] = [newOrder[swapIdx]!, newOrder[idx]!]

          const otherCells = s.cells.filter((c) => c.projectId !== cell.projectId)
          return {
            ...s,
            cells: [...otherCells, ...newOrder],
          }
        }),

      markCellStatus: (id, status, output = null, error = null, schemaDiff = null) =>
        set((s) =>
          updateCell(s, id, (c) => ({
            ...c,
            status,
            output,
            error,
            schemaDiff,
            updatedAt: Date.now(),
          })),
        ),

      resetProjectCells: (projectId) =>
        set((s) => ({
          ...s,
          cells: s.cells.map((c) =>
            c.projectId === projectId
              ? { ...c, status: 'pending' as const, error: null, output: null, schemaDiff: null }
              : c,
          ),
        })),
    }),
    {
      name: 'pgviz-playground-v2',
      storage: createJSONStorage(() => idbStorage),
    },
  ),
)
