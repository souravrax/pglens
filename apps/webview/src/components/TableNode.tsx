import { memo } from 'react'
import { Handle, Position, type NodeProps } from 'reactflow'
import type { TableNodeData } from '@/lib/transform'
import type { Schema } from '@/lib/transform'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { useSelectedTable } from './SchemaGraph'

const HIGHLIGHT_STYLES = {
  selected: 'ring-2 ring-primary ring-offset-2 shadow-[0_0_20px_rgba(var(--primary),0.3)]',
  outgoing: 'ring-2 ring-cyan-500 ring-offset-2 shadow-[0_0_12px_rgba(6,182,212,0.2)]',
  incoming: 'ring-2 ring-pink-500 ring-offset-2 shadow-[0_0_12px_rgba(236,72,153,0.2)]',
  both: 'ring-2 ring-primary ring-offset-2 shadow-[0_0_12px_rgba(var(--primary),0.2)]',
} as const

function TableNode({ data, id }: NodeProps<TableNodeData>) {
  const { table, foreignKeys } = data
  const selectedTable = useSelectedTable()

  const isPK = (col: string) => table.primaryKeys.includes(col)
  const isIndexed = (col: string) => table.indexes.some((idx) => idx.columns.includes(col))
  const getFK = (col: string) => foreignKeys.find((fk) => fk.column === col)

  const isSelected = selectedTable && id === selectedTable

  return (
    <div
      className={cn(
        'min-w-[280px] rounded-xl overflow-hidden shadow-2xl transition-all duration-300 bg-card border',
        isSelected ? HIGHLIGHT_STYLES.selected : 'border-border'
      )}
    >
      <Handle type="target" position={Position.Left} className="opacity-0" />

      <div className="px-4 py-3 flex items-center justify-between bg-muted/30 border-b">
        <span className="text-sm font-bold tracking-tight text-foreground">{table.name}</span>
        <Badge variant="outline" className="h-5 px-1.5 text-[10px] font-medium bg-background/50">
          {table.columns.length} cols
        </Badge>
      </div>

      <div className="py-1">
        {table.columns.map((col) => {
          const pk = isPK(col.name)
          const fk = getFK(col.name)
          const indexed = isIndexed(col.name)

          return (
            <div
              key={col.name}
              className={cn(
                'px-4 py-2 flex items-center gap-3 text-[13px] relative group',
                pk && 'bg-amber-500/5',
                fk && 'bg-primary/5'
              )}
            >
              <div className="w-5 flex justify-center shrink-0">
                {pk ? (
                  <Badge variant="default">PK</Badge>
                ) : fk ? (
                  <Badge variant="default">FK</Badge>
                ) : null}
              </div>

              <span
                className={cn(
                  'font-mono flex-1 truncate',
                  pk
                    ? 'text-amber-500 font-bold'
                    : fk
                      ? 'text-primary font-bold'
                      : 'text-foreground/80'
                )}
              >
                {col.name}
              </span>

              <span className="font-mono text-[11px] text-muted-foreground/60">{col.type}</span>

              <div className="flex gap-1.5 ml-1">
                {col.nullable && (
                  <span className="text-[9px] px-1 rounded bg-muted/50 text-muted-foreground/50 border border-border/20">
                    null
                  </span>
                )}
                {indexed && !pk && (
                  <Badge variant="default" className="h-4 px-1 text-[8px] font-bold">
                    idx
                  </Badge>
                )}
                {fk && (
                  <Badge
                    variant="default"
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

      <Handle type="source" position={Position.Right} className="opacity-0" />
    </div>
  )
}

export default memo(TableNode)
