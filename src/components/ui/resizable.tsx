'use client'

import * as React from 'react'
import { GripVertical } from 'lucide-react'
import { Group, Panel, Separator } from 'react-resizable-panels'

import { cn } from '@/lib/utils'

function ResizablePanelGroup({ className, ...props }: React.ComponentProps<typeof Group>) {
  return (
    <Group
      className={cn('flex h-full w-full', className)}
      {...props}
    />
  )
}

function ResizablePanel({ className, children, ...props }: React.ComponentProps<typeof Panel>) {
  return (
    <Panel
      className={cn('overflow-hidden', className)}
      {...props}
    >
      {children}
    </Panel>
  )
}

function ResizableHandle({
  withHandle,
  className,
  ...props
}: React.ComponentProps<typeof Separator> & {
  withHandle?: boolean
}) {
  return (
    <Separator
      className={cn(
        'relative shrink-0 bg-border hover:bg-primary/20 transition-colors',
        'w-[3px]',
        className,
      )}
      {...props}
    >
      {withHandle && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 flex h-7 w-5 items-center justify-center rounded-sm border bg-border shadow-sm cursor-col-resize">
          <GripVertical className="h-3.5 w-3.5 text-muted-foreground" />
        </div>
      )}
    </Separator>
  )
}

export { ResizablePanelGroup, ResizablePanel, ResizableHandle }
