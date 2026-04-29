'use client'

import { memo } from 'react'
import { Handle, Position, type NodeProps } from 'reactflow'
import type { TriggerNodeData } from '@/lib/trigger-transform'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Table, Zap, Braces } from 'lucide-react'

function TriggerFunctionNode({ data, selected: isSelected }: NodeProps<TriggerNodeData>) {
  const { type } = data

  if (type === 'table') {
    const hasTriggers = data.triggerCount > 0
    return (
      <div
        className={cn(
          'min-w-[220px] rounded-xl overflow-hidden shadow-lg transition-all duration-300 border bg-card',
          isSelected ? 'ring-2 ring-primary ring-offset-2' : 'border-border',
        )}
      >
        <Handle
          type="target"
          position={Position.Left}
          className="opacity-0"
        />
        <div className="px-4 py-3 flex items-center gap-3 bg-muted/30">
          <Table className="w-4 h-4 text-muted-foreground shrink-0" />
          <span className="text-sm font-bold tracking-tight text-foreground truncate">
            {data.name}
          </span>
          {hasTriggers && (
            <Badge
              variant="outline"
              className="h-5 px-1.5 text-[10px] font-medium bg-background/50 ml-auto shrink-0"
            >
              {data.triggerCount}
            </Badge>
          )}
        </div>
        <Handle
          type="source"
          position={Position.Right}
          className="opacity-0"
        />
      </div>
    )
  }

  if (type === 'trigger') {
    const { trigger } = data
    return (
      <div
        className={cn(
          'relative transition-all duration-300',
          isSelected ? 'ring-2 ring-primary ring-offset-2 rounded-md' : '',
        )}
      >
        <Handle
          type="target"
          position={Position.Left}
          className="opacity-0"
        />
        <div
          className="min-w-[200px] shadow-lg"
          style={{
            clipPath: 'polygon(8% 0, 92% 0, 100% 50%, 92% 100%, 8% 100%, 0% 50%)',
          }}
        >
          <div
            className="px-5 py-3 flex items-center gap-3"
            style={{ background: 'var(--node-trigger-bg)' }}
          >
            <Zap
              className="w-4 h-4 shrink-0"
              style={{ color: 'var(--node-trigger-fg)' }}
            />
            <div className="flex flex-col min-w-0">
              <span
                className="text-xs font-bold tracking-tight truncate"
                style={{ color: 'var(--node-trigger-fg)' }}
              >
                {trigger.name}
              </span>
              <span
                className="text-[10px] font-mono truncate opacity-80"
                style={{ color: 'var(--node-trigger-fg)' }}
              >
                {trigger.timing} {trigger.event}
              </span>
            </div>
            {!trigger.enabled && (
              <Badge
                variant="outline"
                className="h-4 px-1 text-[8px] font-bold ml-auto shrink-0 border-current opacity-60"
                style={{ color: 'var(--node-trigger-fg)' }}
              >
                OFF
              </Badge>
            )}
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

  if (type === 'function') {
    const { fn } = data
    return (
      <div
        className={cn(
          'min-w-[220px] rounded-full overflow-hidden shadow-lg transition-all duration-300 border',
          isSelected ? 'ring-2 ring-primary ring-offset-2' : '',
        )}
        style={{
          background: 'var(--node-function-bg)',
          borderColor: 'var(--node-function-border)',
        }}
      >
        <Handle
          type="target"
          position={Position.Left}
          className="opacity-0"
        />
        <div className="px-5 py-3 flex items-center gap-3">
          <Braces
            className="w-4 h-4 shrink-0"
            style={{ color: 'var(--node-function-fg)' }}
          />
          <div className="flex flex-col min-w-0">
            <span
              className="text-xs font-bold tracking-tight truncate"
              style={{ color: 'var(--node-function-fg)' }}
            >
              {fn.name}
            </span>
            <span
              className="text-[10px] font-mono truncate opacity-80"
              style={{ color: 'var(--node-function-fg)' }}
            >
              {fn.returnType}
            </span>
          </div>
          {data.dependentTriggers.length > 1 && (
            <Badge
              variant="outline"
              className="h-4 px-1 text-[8px] font-bold ml-auto shrink-0 border-current opacity-60"
              style={{ color: 'var(--node-function-fg)' }}
            >
              {data.dependentTriggers.length}
            </Badge>
          )}
        </div>
        <Handle
          type="source"
          position={Position.Right}
          className="opacity-0"
        />
      </div>
    )
  }

  return null
}

export default memo(TriggerFunctionNode)
