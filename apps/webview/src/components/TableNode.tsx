import { memo } from 'react'
import { Handle, Position, type NodeProps } from 'reactflow'
import type { TableNodeData } from '@/lib/transform'
import type { Schema } from '@/lib/transform'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { useSelectedTable } from './SchemaGraph'
import { EllipsisVerticalIcon, Table2Icon, CopyIcon, CheckIcon } from 'lucide-react'
import { Button } from './ui/button'
import { Popover, PopoverTrigger, PopoverContent } from './ui/popover'
import { useState } from 'react'

const HIGHLIGHT_STYLES = {
  selected: 'ring-2 ring-primary/50 ring-offset-2',
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
  const [copied, setCopied] = useState<'copy_name' | 'copy_sql' | 'copy_markdown' | null>(null)

  const copy = (text: string, type: 'copy_name' | 'copy_sql' | 'copy_markdown') => {
    navigator.clipboard.writeText(text)
    setCopied(type)
    setTimeout(() => setCopied(null), 1500)
  }

  const copyName = () => copy(table.name, 'copy_name')

  const copyAsSQL = () => {
    const columns = table.columns.map((c) => `  ${c.name} ${c.type}${c.nullable ? '' : ' NOT NULL'}`).join(',\n')
    const pk = table.primaryKeys.length
      ? `  PRIMARY KEY (${table.primaryKeys.join(', ')})`
      : ''
    const sql = `CREATE TABLE ${table.name} (\n${columns}${pk ? ',\n' + pk : ''}\n);`
    copy(sql, 'copy_sql')
  }

  const copyAsMarkdown = () => {
    const header = `| Column | Type | Nullable |`
    const separator = `|--------|------|----------|`
    const rows = table.columns
      .map((c) => `| ${c.name} | ${c.type} | ${c.nullable ? 'YES' : 'NO'} |`)
      .join('\n')
    copy(`${header}\n${separator}\n${rows}`, 'copy_markdown')
  }

  return (
    <div
      className={cn(
        'min-w-[280px] rounded overflow-hidden shadow-2xl transition-all duration-300 bg-card border border-border',
        isSelected ? HIGHLIGHT_STYLES.selected : 'ring-0'
      )}
    >
      <Handle type="target" position={Position.Left} className="opacity-0" />

      <div className="px-2.5 py-1.5 flex items-center justify-between bg-muted/30 border-b border-border">
        <div className='flex items-center gap-2'>
          <Table2Icon className="size-4" />
          <span className="text-sm text-foreground font-mono font-medium">{table.name}</span>
          <Badge variant="outline" className='h-5 px-1.5 text-[10px] font-medium bg-background/50 rounded-2xl'>
            {table.columns.length} cols
          </Badge>
        </div>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon-xs" className='rounded text-foreground'><EllipsisVerticalIcon className="size-4" /></Button>
          </PopoverTrigger>
          <PopoverContent align="end" sideOffset={4}>
            <div className="flex flex-col gap-0.5">
              <button
                onClick={copyName}
                className="flex items-center gap-2 rounded px-2 py-1.5 text-xs text-foreground hover:bg-muted transition-colors"
              >
                {copied == 'copy_name' ? <CheckIcon className="size-3.5 text-green-500" /> : <CopyIcon className="size-3.5" />}
                Copy name
              </button>
              <button
                onClick={copyAsSQL}
                className="flex items-center gap-2 rounded px-2 py-1.5 text-xs text-foreground hover:bg-muted transition-colors"
              >
                {copied == 'copy_sql' ? <CheckIcon className="size-3.5 text-green-500" /> : <CopyIcon className="size-3.5" />}
                Copy as SQL
              </button>
              <button
                onClick={copyAsMarkdown}
                className="flex items-center gap-2 rounded px-2 py-1.5 text-xs text-foreground hover:bg-muted transition-colors"
              >
                {copied == 'copy_markdown' ? <CheckIcon className="size-3.5 text-green-500" /> : <CopyIcon className="size-3.5" />}
                Copy as Markdown
              </button>
            </div>
          </PopoverContent>
        </Popover>
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
