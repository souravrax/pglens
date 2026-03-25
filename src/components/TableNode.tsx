'use client'

import { memo } from 'react'
import { useStore } from 'zustand'
import { Handle, Position, type NodeProps } from 'reactflow'
import type { TableNodeData } from '@/lib/transform'
import { schemaStore } from '@/lib/store'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'

const HIGHLIGHT_STYLES = {
  selected: "ring-2 ring-primary ring-offset-2 shadow-[0_0_20px_rgba(var(--primary),0.3)]",
  outgoing: "ring-2 ring-cyan-500 ring-offset-2 shadow-[0_0_12px_rgba(6,182,212,0.2)]",
  incoming: "ring-2 ring-pink-500 ring-offset-2 shadow-[0_0_12px_rgba(236,72,153,0.2)]",
  both: "ring-2 ring-primary ring-offset-2 shadow-[0_0_12px_rgba(var(--primary),0.2)]",
} as const

function TableNode({ data, id }: NodeProps<TableNodeData>) {
  const { table, foreignKeys } = data
  const selected = useStore(schemaStore, (s) => s.selectedTable)
  const relations = useStore(schemaStore, (s) => s.schema?.relations)

  const isPK = (col: string) => table.primaryKeys.includes(col)
  const isIndexed = (col: string) => table.indexes.some((idx) => idx.columns.includes(col))
  const getFK = (col: string) => foreignKeys.find((fk) => fk.column === col)

  // Compute highlight directly — no setNodes call needed
  let highlight: keyof typeof HIGHLIGHT_STYLES | 'dimmed' | null = null
  if (selected && relations) {
    if (id === selected) {
      highlight = 'selected'
    } else {
      const isOut = relations.some((r) => r.fromTable === selected && r.toTable === id)
      const isIn = relations.some((r) => r.toTable === selected && r.fromTable === id)
      if (isOut && isIn) highlight = 'both'
      else if (isOut) highlight = 'outgoing'
      else if (isIn) highlight = 'incoming'
      else highlight = 'dimmed'
    }
  }

  const isDimmed = highlight === 'dimmed'

  return (
    <div
      className={cn(
        "min-w-[280px] rounded-xl overflow-hidden shadow-2xl transition-all duration-300 bg-card border",
        highlight && highlight !== 'dimmed' ? HIGHLIGHT_STYLES[highlight] : "border-border",
        isDimmed && "opacity-20 grayscale-[0.5]"
      )}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="opacity-0"
      />

      {/* Header */}
      <div className="px-4 py-3 flex items-center justify-between bg-muted/30 border-b">
        <span className="text-sm font-bold tracking-tight text-foreground">
          {table.name}
        </span>
        <Badge variant="outline" className="h-5 px-1.5 text-[10px] font-medium bg-background/50">
          {table.columns.length} cols
        </Badge>
      </div>

      {/* Columns */}
      <div className="py-1">
        {table.columns.map((col) => {
          const pk = isPK(col.name)
          const fk = getFK(col.name)
          const indexed = isIndexed(col.name)

          return (
            <div
              key={col.name}
              className={cn(
                "px-4 py-2 flex items-center gap-3 text-[13px] relative group",
                pk && "bg-amber-500/5",
                fk && "bg-primary/5"
              )}
            >
              {/* Key identifier */}
              <div className="w-5 flex justify-center shrink-0">
                {pk ? (
                  <Badge variant="pk">PK</Badge>
                ) : fk ? (
                  <Badge variant="fk">FK</Badge>
                ) : null}
              </div>

              {/* Column name */}
              <span
                className={cn(
                  "font-mono flex-1 truncate",
                  pk ? "text-amber-500 font-bold" : fk ? "text-primary font-bold" : "text-foreground/80"
                )}
              >
                {col.name}
              </span>

              {/* Type */}
              <span className="font-mono text-[11px] text-muted-foreground/60">
                {col.type}
              </span>

              {/* Status Badges */}
              <div className="flex gap-1.5 ml-1">
                {col.nullable && (
                  <span className="text-[9px] px-1 rounded bg-muted/50 text-muted-foreground/50 border border-border/20">
                    null
                  </span>
                )}
                {indexed && !pk && (
                  <Badge variant="idx" className="h-4 px-1 text-[8px] font-bold">
                    idx
                  </Badge>
                )}
                {fk && (
                  <Badge 
                    variant="fk" 
                    className="h-4 px-1 text-[8px] font-mono border-primary/20"
                    title={`References ${fk.targetTable}.${fk.targetColumn}`}
                  >
                    → {fk.targetTable}
                  </Badge>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <Handle
        type="source"
        position={Position.Right}
        className="opacity-0"
      />
    </div>
  )
}

export default memo(TableNode)
