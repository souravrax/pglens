'use client'

import { use, useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useStore } from 'zustand'
import { playgroundStore, type Cell, type SchemaDiff } from '@/lib/playground-store'
import type { Schema } from '@/lib/extract'
import { resetPGlite, execSql, introspectSchema } from '@/lib/pglite-client'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import NotebookToolbar from '../components/NotebookToolbar'
import CellSidebar from '../components/CellSidebar'
import NotebookCell from '../components/NotebookCell'
import SchemaPreview from '../components/SchemaPreview'
import ExportDialog from '../components/ExportDialog'
import { Play, RotateCcw } from 'lucide-react'

function schemaTablesSet(schema: Schema): Set<string> {
  return new Set(schema.tables.map((t) => t.name))
}

function schemaIndexesSet(schema: Schema): Set<string> {
  const idx = new Set<string>()
  for (const t of schema.tables) {
    for (const i of t.indexes) {
      idx.add(`${t.name}.${i.name}`)
    }
  }
  return idx
}

function computeSchemaDiff(before: Schema | null, after: Schema | null): SchemaDiff {
  const beforeTables = before ? schemaTablesSet(before) : new Set<string>()
  const afterTables = after ? schemaTablesSet(after) : new Set<string>()
  const beforeIndexes = before ? schemaIndexesSet(before) : new Set<string>()
  const afterIndexes = after ? schemaIndexesSet(after) : new Set<string>()

  const createdTables: string[] = []
  const droppedTables: string[] = []
  const alteredTables: string[] = []
  const createdIndexes: string[] = []
  const droppedIndexes: string[] = []

  for (const t of afterTables) {
    if (!beforeTables.has(t)) createdTables.push(t)
  }
  for (const t of beforeTables) {
    if (!afterTables.has(t)) droppedTables.push(t)
  }

  // Detect altered tables: same name but different column count or types
  if (before && after) {
    const beforeMap = new Map(before.tables.map((t) => [t.name, t]))
    const afterMap = new Map(after.tables.map((t) => [t.name, t]))
    for (const [name, afterTable] of afterMap) {
      const beforeTable = beforeMap.get(name)
      if (!beforeTable) continue
      if (beforeTable.columns.length !== afterTable.columns.length) {
        alteredTables.push(name)
        continue
      }
      for (let i = 0; i < beforeTable.columns.length; i++) {
        const bc = beforeTable.columns[i]
        const ac = afterTable.columns[i]
        if (
          bc.name !== ac.name ||
          bc.type !== ac.type ||
          bc.nullable !== ac.nullable ||
          bc.defaultValue !== ac.defaultValue
        ) {
          alteredTables.push(name)
          break
        }
      }
    }
  }

  for (const idx of afterIndexes) {
    if (!beforeIndexes.has(idx)) createdIndexes.push(idx)
  }
  for (const idx of beforeIndexes) {
    if (!afterIndexes.has(idx)) droppedIndexes.push(idx)
  }

  return { createdTables, droppedTables, alteredTables, createdIndexes, droppedIndexes }
}

function formatDiff(diff: SchemaDiff): string {
  const parts: string[] = []
  if (diff.createdTables.length) parts.push(`Created tables: ${diff.createdTables.join(', ')}`)
  if (diff.droppedTables.length) parts.push(`Dropped tables: ${diff.droppedTables.join(', ')}`)
  if (diff.alteredTables.length) parts.push(`Altered tables: ${diff.alteredTables.join(', ')}`)
  if (diff.createdIndexes.length) parts.push(`Created indexes: ${diff.createdIndexes.length}`)
  if (diff.droppedIndexes.length) parts.push(`Dropped indexes: ${diff.droppedIndexes.length}`)
  if (parts.length === 0) return 'Schema unchanged'
  return parts.join('. ')
}

export default function NotebookPage({ params }: { params: Promise<{ projectId: string }> }) {
  const router = useRouter()
  const { projectId } = use(params)

  const projects = useStore(playgroundStore, (s) => s.projects)
  const allCells = useStore(playgroundStore, (s) => s.cells)
  const markCellStatus = useStore(playgroundStore, (s) => s.markCellStatus)
  const resetProjectCells = useStore(playgroundStore, (s) => s.resetProjectCells)
  const createCell = useStore(playgroundStore, (s) => s.createCell)

  const project = projects.find((p) => p.id === projectId)
  const cells = useMemo(
    () => allCells.filter((c) => c.projectId === projectId).sort((a, b) => a.order - b.order),
    [allCells, projectId],
  )

  const [schema, setSchema] = useState<Schema | null>(null)
  const [running, setRunning] = useState(false)
  const [runningCellId, setRunningCellId] = useState<string | null>(null)
  const [exportOpen, setExportOpen] = useState(false)

  const refreshSchema = useCallback(async () => {
    try {
      const s = await introspectSchema(projectId)
      setSchema(s)
    } catch {
      setSchema(null)
    }
  }, [projectId])

  // Initial schema load
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const s = await introspectSchema(projectId)
        if (!cancelled) setSchema(s)
      } catch {
        if (!cancelled) setSchema(null)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [projectId])

  const executeCells = useCallback(
    async (targetCells: Cell[]) => {
      setRunning(true)
      let currentSchema: Schema | null = null

      for (const cell of targetCells) {
        setRunningCellId(cell.id)
        const before = currentSchema ?? (await introspectSchema(projectId).catch(() => null))
        const result = await execSql(projectId, cell.sql)

        if (result.success) {
          const after = await introspectSchema(projectId).catch(() => null)
          currentSchema = after
          const diff = computeSchemaDiff(before, after)
          markCellStatus(cell.id, 'success', formatDiff(diff), null, diff)
        } else {
          markCellStatus(cell.id, 'error', null, result.error ?? 'Execution failed')
          // Stop execution on error
          break
        }
      }

      setRunningCellId(null)
      await refreshSchema()
      setRunning(false)
    },
    [projectId, markCellStatus, refreshSchema],
  )

  const handleRun = useCallback(
    async (cellId: string) => {
      const targetIndex = cells.findIndex((c) => c.id === cellId)
      if (targetIndex === -1) return
      // Reset DB and replay from start through this cell
      await resetPGlite(projectId)
      resetProjectCells(projectId)
      const toRun = cells.slice(0, targetIndex + 1)
      await executeCells(toRun)
    },
    [cells, projectId, resetProjectCells, executeCells],
  )

  const handleReset = useCallback(async () => {
    setRunning(true)
    await resetPGlite(projectId)
    resetProjectCells(projectId)
    await refreshSchema()
    setRunning(false)
  }, [projectId, resetProjectCells, refreshSchema])

  const handleRunAll = useCallback(async () => {
    await resetPGlite(projectId)
    resetProjectCells(projectId)
    const lastCell = cells[cells.length - 1]
    await executeCells(cells)
  }, [cells, projectId, resetProjectCells, executeCells])

  const handleExport = useCallback((files: { name: string; sql: string; order: number }[]) => {
    for (const file of files) {
      const blob = new Blob([file.sql], { type: 'text/sql' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${file.name}.sql`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    }
  }, [])

  const handleAddCell = useCallback(() => {
    createCell(projectId)
  }, [createCell, projectId])

  if (!project) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-sm text-muted-foreground">Project not found</p>
          <button
            onClick={() => router.push('/playground')}
            className="mt-4 text-sm text-primary hover:underline"
          >
            Back to Playground
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen flex-col bg-background">
      <NotebookToolbar
        projectName={project.name}
        cells={cells.map((c) => ({ id: c.id, name: c.name, sql: c.sql, order: c.order }))}
        running={running}
        onBack={() => router.push('/playground')}
        onExport={() => setExportOpen(true)}
      />

      <div className="flex flex-1 overflow-hidden">
        {/* Left: Cell Sidebar */}
        <div className="w-[220px] shrink-0 border-r">
          <CellSidebar
            projectId={projectId}
            cells={cells}
            running={running}
          />
        </div>

        {/* Center: Notebook */}
        <div className="flex-1 min-w-0 flex flex-col">
          {/* Sticky notebook toolbar */}
          <div className="sticky top-0 z-10 flex items-center gap-2 border-b bg-background/95 backdrop-blur px-4 py-2">
            <span className="text-xs font-semibold text-muted-foreground mr-2">Notebook</span>
            <Button
              size="sm"
              className="h-7 gap-1.5 text-[11px]"
              disabled={running || cells.length === 0}
              onClick={handleRunAll}
            >
              <Play className="size-3" />
              Run All
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-7 gap-1.5 text-[11px]"
              disabled={running}
              onClick={handleReset}
            >
              <RotateCcw className="size-3" />
              Reset DB
            </Button>
          </div>

          <ScrollArea className="flex-1">
            <div className="flex flex-col gap-2 p-4">
              {cells.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 text-center text-sm text-muted-foreground">
                  <p>No cells yet</p>
                  <button
                    onClick={handleAddCell}
                    className="mt-2 text-primary hover:underline"
                  >
                    Add your first cell
                  </button>
                </div>
              )}
              {cells.map((cell, index) => (
                <NotebookCell
                  key={cell.id}
                  cell={cell}
                  index={index}
                  running={running}
                  runningCellId={runningCellId}
                  onRun={() => handleRun(cell.id)}
                />
              ))}
              {cells.length > 0 && (
                <button
                  onClick={handleAddCell}
                  className="mt-2 flex items-center justify-center gap-2 rounded-md border border-dashed py-3 text-xs text-muted-foreground hover:border-primary/30 hover:text-primary transition-colors"
                >
                  + Add Cell
                </button>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Right: Schema Preview */}
        <div className="w-1/2 shrink-0 border-l">
          <SchemaPreview schema={schema} />
        </div>
      </div>

      <ExportDialog
        open={exportOpen}
        onOpenChange={setExportOpen}
        files={cells.map((c) => ({ id: c.id, name: c.name, sql: c.sql, order: c.order }))}
        onExport={handleExport}
      />
    </div>
  )
}
