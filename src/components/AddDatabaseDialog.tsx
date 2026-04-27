'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'

export type AddDatabaseDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (name: string, url: string) => void
  existingNames: string[]
}

export function AddDatabaseDialog({
  open,
  onOpenChange,
  onSubmit,
  existingNames,
}: AddDatabaseDialogProps) {
  const [name, setName] = useState('')
  const [url, setUrl] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = () => {
    const trimmedName = name.trim()
    const trimmedUrl = url.trim()

    if (!trimmedName) {
      setError('Name is required')
      return
    }
    if (!trimmedUrl) {
      setError('Connection URL is required')
      return
    }
    if (existingNames.includes(trimmedName)) {
      setError('A database with this name already exists')
      return
    }

    onSubmit(trimmedName, trimmedUrl)
    setName('')
    setUrl('')
    setError(null)
    onOpenChange(false)
  }

  const handleClose = () => {
    setName('')
    setUrl('')
    setError(null)
    onOpenChange(false)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={handleClose}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Database</DialogTitle>
          <DialogDescription>
            Enter a unique name and the PostgreSQL connection URL.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid gap-1.5">
            <Label htmlFor="db-name">Name</Label>
            <Input
              id="db-name"
              placeholder="e.g. production-db"
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                setError(null)
              }}
              aria-invalid={!!error && !name.trim()}
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="db-url">Connection URL</Label>
            <Textarea
              id="db-url"
              placeholder="postgresql://user:password@host:port/database?sslmode=require"
              value={url}
              onChange={(e) => {
                setUrl(e.target.value)
                setError(null)
              }}
              aria-invalid={!!error && !url.trim()}
            />
            <p className="text-[10px] text-muted-foreground">
              Include the full URL with credentials.
            </p>
          </div>

          {error && <p className="text-xs text-destructive font-medium">{error}</p>}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit}>Add Database</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
