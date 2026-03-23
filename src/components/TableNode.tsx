'use client'

import { memo } from 'react'
import { useStore } from 'zustand'
import { Handle, Position, type NodeProps } from 'reactflow'
import type { TableNodeData } from '@/lib/transform'
import { schemaStore } from '@/lib/store'

const HIGHLIGHT_STYLES = {
  selected: {
    border: '2px solid #a78bfa',
    boxShadow: '0 0 20px #a78bfa40',
  },
  outgoing: {
    border: '2px solid #22d3ee',
    boxShadow: '0 0 12px #22d3ee25',
  },
  incoming: {
    border: '2px solid #f472b6',
    boxShadow: '0 0 12px #f472b625',
  },
  both: {
    border: '2px solid #a78bfa',
    boxShadow: '0 0 12px #a78bfa25',
  },
} as const

function TableNode({ data, id }: NodeProps<TableNodeData>) {
  const { table, foreignKeys } = data
  const selected = useStore(schemaStore, (s) => s.selectedTable)
  const relations = useStore(schemaStore, (s) => s.schema?.relations)

  const isPK = (col: string) => table.primaryKeys.includes(col)
  const isIndexed = (col: string) => table.indexes.some((idx) => idx.columns.includes(col))
  const getFK = (col: string) => foreignKeys.find((fk) => fk.column === col)

  // Compute highlight directly — no setNodes call needed
  let highlight: 'selected' | 'outgoing' | 'incoming' | 'both' | 'dimmed' | null = null
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
  const highlightStyle =
    highlight && highlight !== 'dimmed' ? HIGHLIGHT_STYLES[highlight] : undefined

  return (
    <div
      className="min-w-[280px] rounded-xl shadow-2xl overflow-hidden"
      style={{
        background: '#18181f',
        border: highlightStyle?.border ?? '1px solid #2a2a35',
        boxShadow: highlightStyle?.boxShadow ?? 'none',
        opacity: isDimmed ? 0.12 : 1,
      }}
    >
      <Handle
        type="target"
        position={Position.Left}
        style={{ opacity: 0 }}
      />

      {/* Header */}
      <div
        className="px-4 py-3 flex items-center gap-2"
        style={{ background: '#1e1e2e', borderBottom: '1px solid #2a2a35' }}
      >
        <span
          className="text-sm font-bold tracking-wide"
          style={{ color: '#e2e2e8' }}
        >
          {table.name}
        </span>
        <span
          className="ml-auto text-[10px] px-2 py-0.5 rounded-full"
          style={{ background: '#2a2a35', color: '#7c7c8a' }}
        >
          {table.columns.length} cols
        </span>
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
              className="px-4 py-1.5 flex items-center gap-2 text-[13px]"
              style={{
                background: pk
                  ? 'rgba(245,158,11,0.06)'
                  : fk
                    ? 'rgba(99,102,241,0.06)'
                    : 'transparent',
              }}
            >
              {/* Key badge */}
              <span className="w-5 text-center flex-shrink-0">
                {pk ? (
                  <span style={{ color: '#f59e0b', fontSize: 10 }}>PK</span>
                ) : fk ? (
                  <span style={{ color: '#818cf8', fontSize: 10 }}>FK</span>
                ) : (
                  <span> </span>
                )}
              </span>

              {/* Column name */}
              <span
                className="font-mono flex-1 truncate"
                style={{
                  color: pk ? '#f59e0b' : fk ? '#a5b4fc' : '#e2e2e8',
                  fontWeight: pk || fk ? 600 : 400,
                }}
              >
                {col.name}
              </span>

              {/* Type */}
              <span
                className="font-mono text-[11px] flex-shrink-0"
                style={{ color: '#7c7c8a' }}
              >
                {col.type}
              </span>

              {/* Badges */}
              <div className="flex gap-1 flex-shrink-0">
                {col.nullable && (
                  <span
                    className="text-[9px] px-1 rounded"
                    style={{ background: '#2a2a35', color: '#7c7c8a' }}
                  >
                    null
                  </span>
                )}
                {indexed && !pk && (
                  <span
                    className="text-[9px] px-1 rounded"
                    style={{
                      background: 'rgba(99,102,241,0.15)',
                      color: '#818cf8',
                    }}
                  >
                    idx
                  </span>
                )}
                {fk && (
                  <span
                    className="text-[9px] px-1 rounded"
                    style={{
                      background: 'rgba(99,102,241,0.15)',
                      color: '#818cf8',
                    }}
                    title={`References ${fk.targetTable}.${fk.targetColumn}`}
                  >
                    → {fk.targetTable}
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <Handle
        type="source"
        position={Position.Right}
        style={{ opacity: 0 }}
      />
    </div>
  )
}

export default memo(TableNode)
