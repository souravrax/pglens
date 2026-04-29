'use client'

import { Button } from '@/components/ui/button'
import { Download, ArrowLeft, FlaskConical } from 'lucide-react'

export default function NotebookToolbar({
  projectName,
  cells,
  running,
  onBack,
  onExport,
}: {
  projectName: string
  cells: { id: string; name: string; sql: string; order: number }[]
  running: boolean
  onBack: () => void
  onExport: () => void
}) {
  return (
    <header className="flex h-10 shrink-0 items-center gap-3 border-b px-4 bg-background/50 backdrop-blur-xl">
      <Button
        variant="ghost"
        size="icon-xs"
        onClick={onBack}
        className="text-muted-foreground"
      >
        <ArrowLeft className="size-4" />
      </Button>

      <div className="flex items-center gap-2">
        <FlaskConical className="size-4 text-primary" />
        <span className="text-sm font-semibold tracking-tight">pgviz</span>
        <span className="text-xs text-muted-foreground">Playground</span>
      </div>

      <div className="h-4 w-px bg-border mx-1" />

      <span className="text-xs font-medium truncate max-w-[200px]">{projectName}</span>

      <div className="ml-auto flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          className="h-7 gap-1.5 text-[11px]"
          disabled={running || cells.length === 0}
          onClick={onExport}
        >
          <Download className="size-3" />
          Export
        </Button>
      </div>
    </header>
  )
}
