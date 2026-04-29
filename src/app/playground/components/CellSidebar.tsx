'use client'

import { useStore } from 'zustand'
import { playgroundStore } from '@/lib/playground-store'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ChevronUp, ChevronDown, Plus, Trash2 } from 'lucide-react'

export default function CellSidebar({
  projectId,
  cells,
  running,
}: {
  projectId: string
  cells: import('@/lib/playground-store').Cell[]
  running: boolean
}) {
  const activeCellId = useStore(playgroundStore, (s) => s.activeCellId)
  const setActiveCell = useStore(playgroundStore, (s) => s.setActiveCell)
  const reorderCell = useStore(playgroundStore, (s) => s.reorderCell)
  const deleteCell = useStore(playgroundStore, (s) => s.deleteCell)
  const createCell = useStore(playgroundStore, (s) => s.createCell)

  const handleCellClick = (cellId: string) => {
    setActiveCell(cellId)
    // Scroll the cell into view in the main notebook
    const el = document.getElementById(`cell-${cellId}`)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b px-3 py-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Cells
        </span>
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={() => createCell(projectId)}
          disabled={running}
        >
          <Plus className="size-3.5" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="py-1">
          {cells.length === 0 && (
            <div className="px-3 py-4 text-center text-xs text-muted-foreground">No cells yet</div>
          )}
          {cells.map((cell, idx) => {
            const isActive = activeCellId === cell.id
            return (
              <div
                key={cell.id}
                className={cn(
                  'group flex items-center gap-2 px-3 py-1.5 cursor-pointer transition-colors',
                  isActive && 'bg-primary/10',
                  !isActive && 'hover:bg-muted/50',
                )}
                onClick={() => handleCellClick(cell.id)}
              >
                <span className="text-[10px] font-mono text-muted-foreground w-5 text-right shrink-0">
                  {idx + 1}
                </span>

                <div className="flex-1 min-w-0">
                  <span className={cn('text-[11px] truncate block', isActive && 'font-medium')}>
                    {cell.name}
                  </span>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {cell.status === 'success' && (
                    <span
                      className="size-1.5 rounded-full bg-green-500"
                      title="Success"
                    />
                  )}
                  {cell.status === 'error' && (
                    <span
                      className="size-1.5 rounded-full bg-destructive"
                      title="Error"
                    />
                  )}
                  {cell.status === 'pending' && (
                    <span
                      className="size-1.5 rounded-full bg-muted-foreground/30"
                      title="Pending"
                    />
                  )}

                  <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity ml-1">
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      className="size-5"
                      disabled={idx === 0 || running}
                      onClick={(e) => {
                        e.stopPropagation()
                        reorderCell(cell.id, 'up')
                      }}
                    >
                      <ChevronUp className="size-2.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      className="size-5"
                      disabled={idx === cells.length - 1 || running}
                      onClick={(e) => {
                        e.stopPropagation()
                        reorderCell(cell.id, 'down')
                      }}
                    >
                      <ChevronDown className="size-2.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      className="text-muted-foreground hover:text-destructive size-5"
                      disabled={running}
                      onClick={(e) => {
                        e.stopPropagation()
                        deleteCell(cell.id)
                      }}
                    >
                      <Trash2 className="size-2.5" />
                    </Button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </ScrollArea>
    </div>
  )
}
