'use client'

import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Download, Trash2, FileCode2 } from 'lucide-react'

export type ExportFile = {
  id: string
  name: string
  sql: string
  order: number
}

export default function ExportDialog({
  open,
  onOpenChange,
  files,
  onExport,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  files: ExportFile[]
  onExport: (files: ExportFile[]) => void
}) {
  const [draftFiles, setDraftFiles] = useState<ExportFile[]>([])

  // Sync draft when dialog opens
  const handleOpen = useCallback(
    (isOpen: boolean) => {
      if (isOpen) {
        setDraftFiles(files.map((f) => ({ ...f })))
      }
      onOpenChange(isOpen)
    },
    [files, onOpenChange],
  )

  const handleRename = (id: string, newName: string) => {
    setDraftFiles((prev) => prev.map((f) => (f.id === id ? { ...f, name: newName } : f)))
  }

  const handleDelete = (id: string) => {
    setDraftFiles((prev) => {
      const filtered = prev.filter((f) => f.id !== id)
      // Reorder remaining
      return filtered.map((f, idx) => ({ ...f, order: idx + 1 }))
    })
  }

  const handleExport = () => {
    const remaining = draftFiles.filter((f) => f.sql.trim().length > 0)
    if (remaining.length === 0) return
    onExport(remaining)
    onOpenChange(false)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={handleOpen}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="size-4 text-primary" />
            Export Migrations
          </DialogTitle>
          <DialogDescription>
            Review, rename, or remove files before exporting as SQL.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[320px] mt-2">
          <div className="flex flex-col gap-1">
            {draftFiles.length === 0 && (
              <div className="py-8 text-center text-sm text-muted-foreground">
                No files to export
              </div>
            )}
            {draftFiles.map((file, idx) => (
              <div
                key={file.id}
                className="flex items-center gap-2 rounded-md border px-3 py-2 group"
              >
                <span className="text-[10px] font-mono text-muted-foreground w-5 text-right shrink-0">
                  {idx + 1}
                </span>
                <FileCode2 className="size-3.5 text-muted-foreground shrink-0" />
                <input
                  value={file.name}
                  onChange={(e) => handleRename(file.id, e.target.value)}
                  className="flex-1 bg-transparent text-xs outline-none min-w-0"
                />
                <span className="text-[10px] text-muted-foreground shrink-0">.sql</span>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive shrink-0"
                  onClick={() => handleDelete(file.id)}
                >
                  <Trash2 className="size-3" />
                </Button>
              </div>
            ))}
          </div>
        </ScrollArea>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            onClick={handleExport}
            disabled={draftFiles.length === 0}
            className="gap-1.5"
          >
            <Download className="size-3.5" />
            Export {draftFiles.length > 0 && `(${draftFiles.length})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
