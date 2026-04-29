'use client'

import { useEffect, useState, useMemo } from 'react'
import { useStore } from 'zustand'
import { schemaStore } from '@/lib/store'
import type { Extension, AvailableExtension } from '@/lib/extract'
import { secureFetch } from '@/lib/api-client'
import { Loader2, Puzzle, Plus, Search, Check, Package, Trash2, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export default function ExtensionsPage() {
  const activeDatabase = useStore(schemaStore, (s) => s.activeDatabase)
  const schemas = useStore(schemaStore, (s) => s.schemas)
  const selectedSchema = useStore(schemaStore, (s) => s.selectedSchema)

  const [installed, setInstalled] = useState<Extension[]>([])
  const [available, setAvailable] = useState<AvailableExtension[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [addOpen, setAddOpen] = useState(false)
  const [selectedExtToInstall, setSelectedExtToInstall] = useState<AvailableExtension | null>(null)
  const [installSchema, setInstallSchema] = useState(selectedSchema)
  const [confirmUninstall, setConfirmUninstall] = useState<Extension | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const fetchExtensions = async (signal?: AbortSignal) => {
    if (!activeDatabase) return
    setLoading(true)
    setError(null)
    try {
      const res = await secureFetch('/api/extensions', activeDatabase.url, { signal })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to fetch extensions')
      }
      const data = await res.json()
      setInstalled(data.installed ?? [])
      setAvailable(data.available ?? [])
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        setError((err as Error).message)
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!activeDatabase) return
    const controller = new AbortController()
    fetchExtensions(controller.signal)
    return () => controller.abort()
  }, [activeDatabase])

  // Reset install schema when selected schema changes
  useEffect(() => {
    setInstallSchema(selectedSchema)
  }, [selectedSchema])

  const filteredInstalled = useMemo(() => {
    const term = search.toLowerCase()
    if (!term) return installed
    return installed.filter(
      (e) =>
        e.name.toLowerCase().includes(term) ||
        e.schema.toLowerCase().includes(term) ||
        e.version.toLowerCase().includes(term),
    )
  }, [installed, search])

  const handlePickExtension = (ext: AvailableExtension) => {
    setSelectedExtToInstall(ext)
    setInstallSchema(selectedSchema)
    setAddOpen(false)
  }

  const handleInstall = async () => {
    if (!activeDatabase || !selectedExtToInstall) return
    setActionLoading(selectedExtToInstall.name)
    try {
      const res = await secureFetch('/api/extensions', activeDatabase.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: selectedExtToInstall.name,
          schema: installSchema,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to install extension')
      }
      await fetchExtensions()
      setSelectedExtToInstall(null)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setActionLoading(null)
    }
  }

  const handleUninstall = async (ext: Extension) => {
    if (!activeDatabase) return
    setActionLoading(ext.name)
    try {
      const res = await secureFetch(
        `/api/extensions?name=${encodeURIComponent(ext.name)}`,
        activeDatabase.url,
        { method: 'DELETE' },
      )
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to uninstall extension')
      }
      await fetchExtensions()
      setConfirmUninstall(null)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setActionLoading(null)
    }
  }

  if (!activeDatabase) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        Select a database to manage extensions
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm">Loading extensions...</span>
      </div>
    )
  }

  if (error) {
    return <div className="p-6 text-sm text-destructive font-mono">{error}</div>
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b px-4 py-3 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <Puzzle className="h-4 w-4" />
            Extensions
          </h2>
          <p className="text-xs text-muted-foreground">
            {installed.length} installed · {available.length} available
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => setAddOpen(true)}
        >
          <Plus className="h-3.5 w-3.5 mr-1" />
          Add Extension
        </Button>
      </div>

      <div className="px-4 py-3 border-b">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search installed extensions..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {filteredInstalled.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-sm text-muted-foreground gap-2">
            <Package className="h-8 w-8 opacity-50" />
            {search ? 'No extensions match your search' : 'No extensions installed'}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Version</TableHead>
                <TableHead>Schema</TableHead>
                <TableHead className="w-[100px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInstalled.map((e) => (
                <TableRow key={e.name}>
                  <TableCell className="font-mono font-medium">{e.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{e.version}</Badge>
                  </TableCell>
                  <TableCell className="font-mono text-muted-foreground">{e.schema}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={() => setConfirmUninstall(e)}
                      disabled={actionLoading === e.name}
                    >
                      {actionLoading === e.name ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Pick Extension Dialog */}
      <Dialog
        open={addOpen}
        onOpenChange={setAddOpen}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add Extension
            </DialogTitle>
            <DialogDescription>
              Search and select a PostgreSQL extension to install.
            </DialogDescription>
          </DialogHeader>
          <Command className="rounded-lg border shadow-md">
            <CommandInput placeholder="Search available extensions..." />
            <CommandList>
              <CommandEmpty>No extensions found.</CommandEmpty>
              <CommandGroup heading="Available Extensions">
                {available.map((ext) => (
                  <CommandItem
                    key={ext.name}
                    onSelect={() => handlePickExtension(ext)}
                    className="flex items-center justify-between"
                  >
                    <div className="flex flex-col">
                      <span className="font-mono text-sm">{ext.name}</span>
                      {ext.comment && (
                        <span className="text-xs text-muted-foreground truncate max-w-[320px]">
                          {ext.comment}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="secondary"
                        className="text-[10px]"
                      >
                        v{ext.defaultVersion}
                      </Badge>
                      <Check className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-data-[selected=true]:opacity-100" />
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </DialogContent>
      </Dialog>

      {/* Confirm Install Dialog */}
      <Dialog
        open={selectedExtToInstall !== null}
        onOpenChange={(open) => !open && setSelectedExtToInstall(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Install Extension
            </DialogTitle>
            <DialogDescription>
              Configure where to install{' '}
              <span className="font-mono font-medium">{selectedExtToInstall?.name}</span>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Target Schema</label>
              <Select
                value={installSchema}
                onValueChange={setInstallSchema}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a schema..." />
                </SelectTrigger>
                <SelectContent>
                  {schemas.map((s) => (
                    <SelectItem
                      key={s}
                      value={s}
                    >
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                The extension will be installed into the selected schema.
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setSelectedExtToInstall(null)}
              disabled={actionLoading === selectedExtToInstall?.name}
            >
              Cancel
            </Button>
            <Button
              onClick={handleInstall}
              disabled={actionLoading === selectedExtToInstall?.name}
            >
              {actionLoading === selectedExtToInstall?.name ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
              ) : (
                <Plus className="h-3.5 w-3.5 mr-1.5" />
              )}
              Install
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Uninstall Confirmation Dialog */}
      <Dialog
        open={confirmUninstall !== null}
        onOpenChange={(open) => !open && setConfirmUninstall(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-4 w-4" />
              Uninstall Extension
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to uninstall{' '}
              <span className="font-mono font-medium">{confirmUninstall?.name}</span>? This will
              remove all objects created by the extension and cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setConfirmUninstall(null)}
              disabled={actionLoading === confirmUninstall?.name}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => confirmUninstall && handleUninstall(confirmUninstall)}
              disabled={actionLoading === confirmUninstall?.name}
            >
              {actionLoading === confirmUninstall?.name ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
              ) : (
                <Trash2 className="h-3.5 w-3.5 mr-1.5" />
              )}
              Uninstall
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
