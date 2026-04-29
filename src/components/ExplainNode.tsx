'use client'

import { memo } from 'react'
import { Handle, Position, type NodeProps } from 'reactflow'
import type { ExplainNodeData } from '@/lib/explain-transform'
import { cn } from '@/lib/utils'

const NODE_STYLES: Record<ExplainNodeData['type'], { bg: string; border: string; fg: string }> = {
  scan: {
    bg: 'var(--node-scan-bg)',
    border: 'var(--node-scan-border)',
    fg: 'var(--node-scan-fg)',
  },
  join: {
    bg: 'var(--node-join-bg)',
    border: 'var(--node-join-border)',
    fg: 'var(--node-join-fg)',
  },
  sort: {
    bg: 'var(--node-sort-bg)',
    border: 'var(--node-sort-border)',
    fg: 'var(--node-sort-fg)',
  },
  generic: {
    bg: 'var(--node-generic-bg)',
    border: 'var(--node-generic-border)',
    fg: 'var(--node-generic-fg)',
  },
}

function formatCost(cost: { startup: number; total: number }): string {
  if (cost.startup === 0) return `cost=${cost.total.toFixed(2)}`
  return `cost=${cost.startup.toFixed(2)}..${cost.total.toFixed(2)}`
}

function formatActual(actual: ExplainNodeData['actual']): string | null {
  if (!actual) return null
  const rows = actual.loops > 1 ? `${actual.rows}x${actual.loops}` : `${actual.rows}`
  return `time=${actual.startup.toFixed(2)}..${actual.total.toFixed(2)}ms rows=${rows}`
}

function ExplainNode({ data, selected: isSelected }: NodeProps<ExplainNodeData>) {
  const style = NODE_STYLES[data.type]
  const actualText = formatActual(data.actual)
  const costText = formatCost(data.cost)

  return (
    <div
      className={cn(
        'min-w-[260px] max-w-[320px] transition-all duration-300 border',
        isSelected && 'ring-2 ring-primary ring-offset-2',
      )}
      style={{
        background: style.bg,
        borderColor: style.border,
      }}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="opacity-0"
      />
      <div className="px-4 py-2.5">
        <div className="flex items-start gap-2 min-w-0">
          <div
            className="flex items-center justify-center w-5 h-5 shrink-0 text-[10px] font-bold"
            style={{
              background: style.border,
              color: style.bg,
            }}
          >
            {data.seq}
          </div>
          <div className="flex-1 min-w-0">
            <div
              className="text-[11px] font-bold truncate leading-tight"
              style={{ color: style.fg }}
            >
              {data.label}
            </div>
            <div className="flex items-center gap-1.5 mt-1">
              <span
                className="text-[9px] font-mono opacity-80"
                style={{ color: style.fg }}
              >
                {costText}
              </span>
              {actualText && (
                <span
                  className="text-[9px] font-mono opacity-80"
                  style={{ color: style.fg }}
                >
                  {actualText}
                </span>
              )}
            </div>
            {data.condition && (
              <div
                className="text-[9px] font-mono truncate mt-1 opacity-70"
                style={{ color: style.fg }}
              >
                {data.condition}
              </div>
            )}
          </div>
        </div>
      </div>
      <Handle
        type="source"
        position={Position.Right}
        className="opacity-0"
      />
    </div>
  )
}

export default memo(ExplainNode)
