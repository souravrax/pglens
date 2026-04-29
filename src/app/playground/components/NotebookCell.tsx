'use client'

import { useCallback, useState } from 'react'
import { useStore } from 'zustand'
import CodeMirror from '@uiw/react-codemirror'
import { sql } from '@codemirror/lang-sql'
import { playgroundStore } from '@/lib/playground-store'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Play,
  Trash2,
  Pencil,
  Check,
  X,
  AlertCircle,
  CheckCircle2,
  Table2,
  Trash,
  RefreshCcw,
  Plus,
  FileCode2,
  Loader2,
} from 'lucide-react'

export default function NotebookCell({
  cell,
  index,
  running,
  runningCellId,
  onRun,
}: {
  cell: import('@/lib/playground-store').Cell
  index: number
  running: boolean
  runningCellId: string | null
  onRun: () => void
}) {
  const updateCell = useStore(playgroundStore, (s) => s.updateCell)
  const deleteCell = useStore(playgroundStore, (s) => s.deleteCell)
  const setActiveCell = useStore(playgroundStore, (s) => s.setActiveCell)
  const activeCellId = useStore(playgroundStore, (s) => s.activeCellId)

  const [editingName, setEditingName] = useState(false)
  const [nameValue, setNameValue] = useState(cell.name)
  const isActive = activeCellId === cell.id
  const isRunning = runningCellId === cell.id

  const handleNameSave = useCallback(() => {
    if (nameValue.trim()) {
      updateCell(cell.id, { name: nameValue.trim() })
    }
    setEditingName(false)
  }, [cell.id, nameValue, updateCell])

  const handleEditorChange = useCallback(
    (value: string) => {
      updateCell(cell.id, { sql: value })
    },
    [cell.id, updateCell],
  )

  const statusIcon = isRunning ? (
    <Loader2 className="size-3.5 text-primary animate-spin" />
  ) : cell.status === 'success' ? (
    <CheckCircle2 className="size-3.5 text-green-500" />
  ) : cell.status === 'error' ? (
    <AlertCircle className="size-3.5 text-destructive" />
  ) : (
    <FileCode2 className="size-3.5 text-muted-foreground/50" />
  )

  return (
    <div
      id={`cell-${cell.id}`}
      className={cn(
        'rounded-lg border transition-colors',
        isActive ? 'border-primary/30 ring-1 ring-primary/10' : 'border-border',
        cell.status === 'error' && 'border-destructive/30',
      )}
      onClick={() => setActiveCell(cell.id)}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b bg-muted/20">
        <span className="text-[10px] font-mono text-muted-foreground w-5 text-right shrink-0">
          {index + 1}
        </span>

        {editingName ? (
          <div className="flex flex-1 items-center gap-1 min-w-0">
            <input
              value={nameValue}
              onChange={(e) => setNameValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleNameSave()
                if (e.key === 'Escape') {
                  setNameValue(cell.name)
                  setEditingName(false)
                }
              }}
              autoFocus
              className="flex-1 bg-transparent text-xs outline-none min-w-0"
            />
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={handleNameSave}
            >
              <Check className="size-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => {
                setNameValue(cell.name)
                setEditingName(false)
              }}
            >
              <X className="size-3" />
            </Button>
          </div>
        ) : (
          <button
            onClick={() => {
              setEditingName(true)
              setNameValue(cell.name)
            }}
            className="flex flex-1 items-center gap-1.5 text-left min-w-0 group/name"
          >
            {statusIcon}
            <span className="text-xs font-medium truncate">{cell.name}</span>
            <Pencil className="size-2.5 text-muted-foreground opacity-0 group-hover/name:opacity-100 transition-opacity shrink-0" />
          </button>
        )}

        <div className="flex items-center gap-1 shrink-0">
          <Button
            variant="ghost"
            size="icon-xs"
            className="size-6 text-green-600 hover:text-green-700 hover:bg-green-500/10"
            disabled={running}
            onClick={(e) => {
              e.stopPropagation()
              onRun()
            }}
            title="Run"
          >
            {isRunning ? <Loader2 className="size-3 animate-spin" /> : <Play className="size-3" />}
          </Button>
          <Button
            variant="ghost"
            size="icon-xs"
            className="text-muted-foreground hover:text-destructive size-6"
            disabled={running}
            onClick={(e) => {
              e.stopPropagation()
              deleteCell(cell.id)
            }}
          >
            <Trash2 className="size-3" />
          </Button>
        </div>
      </div>

      {/* Editor */}
      <div className="min-h-[120px] max-h-[400px] overflow-hidden">
        <CodeMirror
          value={cell.sql}
          height="100%"
          theme="dark"
          extensions={[sql()]}
          onChange={handleEditorChange}
          className={cn('text-[13px]', '[&_.cm-editor]:min-h-[120px] [&_.cm-gutters]:bg-muted/30')}
          basicSetup={{
            lineNumbers: true,
            highlightActiveLineGutter: true,
            highlightActiveLine: true,
            foldGutter: false,
          }}
        />
      </div>

      {/* Output */}
      {cell.status === 'success' && cell.output && (
        <div className="border-t bg-green-500/5 px-3 py-2">
          <div className="flex items-start gap-2">
            <CheckCircle2 className="size-3.5 text-green-500 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-medium text-green-600">Success</p>
              {cell.schemaDiff && (
                <div className="mt-1 flex flex-wrap gap-1">
                  {cell.schemaDiff.createdTables.length > 0 && (
                    <DiffBadge
                      icon={<Plus className="size-2.5" />}
                      label="Created"
                      items={cell.schemaDiff.createdTables}
                      color="green"
                    />
                  )}
                  {cell.schemaDiff.droppedTables.length > 0 && (
                    <DiffBadge
                      icon={<Trash className="size-2.5" />}
                      label="Dropped"
                      items={cell.schemaDiff.droppedTables}
                      color="red"
                    />
                  )}
                  {cell.schemaDiff.alteredTables.length > 0 && (
                    <DiffBadge
                      icon={<RefreshCcw className="size-2.5" />}
                      label="Altered"
                      items={cell.schemaDiff.alteredTables}
                      color="amber"
                    />
                  )}
                  {cell.schemaDiff.createdIndexes.length > 0 && (
                    <DiffBadge
                      icon={<Table2 className="size-2.5" />}
                      label="Indexes"
                      items={cell.schemaDiff.createdIndexes}
                      color="blue"
                    />
                  )}
                </div>
              )}
              {cell.output && cell.output !== 'Schema unchanged' && (
                <p className="mt-1 text-[11px] text-green-600/80">{cell.output}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {cell.status === 'error' && cell.error && (
        <div className="border-t bg-destructive/5 px-3 py-2">
          <div className="flex items-start gap-2">
            <AlertCircle className="size-3.5 text-destructive shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-medium text-destructive">Error</p>
              <pre className="mt-1 text-[11px] text-destructive/80 whitespace-pre-wrap font-mono break-words">
                {cell.error}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function DiffBadge({
  icon,
  label,
  items,
  color,
}: {
  icon: React.ReactNode
  label: string
  items: string[]
  color: 'green' | 'red' | 'amber' | 'blue'
}) {
  const colorMap = {
    green: 'bg-green-500/10 text-green-600 border-green-500/20',
    red: 'bg-red-500/10 text-red-600 border-red-500/20',
    amber: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
    blue: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-medium',
        colorMap[color],
      )}
      title={items.join(', ')}
    >
      {icon}
      {label}: {items.length}
    </span>
  )
}
