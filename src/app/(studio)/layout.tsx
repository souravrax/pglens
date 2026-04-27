'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useStore } from 'zustand'
import { schemaStore } from '@/lib/store'
import { AppSidebar } from '@/components/app-sidebar'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import { TooltipProvider } from '@/components/ui/tooltip'
import { ModeToggle } from '@/components/mode-toggle'
import { secureFetch } from '@/lib/api-client'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { DatabaseIcon } from 'lucide-react'
import type { DatabaseConfig } from '@/lib/store'

export default function StudioLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const schema = useStore(schemaStore, (s) => s.schema)
  const databases = useStore(schemaStore, (s) => s.databases)
  const setSchema = useStore(schemaStore, (s) => s.setSchema)
  const selectedSchema = useStore(schemaStore, (s) => s.selectedSchema)
  const activeDatabase = useStore(schemaStore, (s) => s.activeDatabase)
  const setActiveDatabase = useStore(schemaStore, (s) => s.setActiveDatabase)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!activeDatabase) {
      router.push('/')
      return
    }

    secureFetch(`/api/schema?schema=${encodeURIComponent(selectedSchema)}`, activeDatabase.url)
      .then(async (res) => {
        setError(null)
        if (!res.ok) {
          const err = await res.json()
          throw new Error(err.error || 'Failed to fetch schema')
        }
        return res.json()
      })
      .then(setSchema)
      .catch((err) => setError(err.message))
  }, [selectedSchema, setSchema, activeDatabase, router])

  if (!activeDatabase) {
    return null
  }

  if (error) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-3 font-mono">
        <div className="text-sm font-bold text-destructive">Failed to load schema</div>
        <div className="text-xs text-muted-foreground">{error}</div>
        <div className="text-[11px] text-muted-foreground">
          Make sure the connection URL is valid
        </div>
      </div>
    )
  }

  if (!schema) {
    return (
      <div className="flex h-screen items-center justify-center font-mono text-muted-foreground">
        Loading schema...
      </div>
    )
  }

  const handleSelect = (db: DatabaseConfig) => {
    setActiveDatabase(db)
    router.refresh()
  }

  return (
    <TooltipProvider>
      <SidebarProvider>
        <AppSidebar variant="sidebar" />
        <SidebarInset>
          <header className="flex h-10 shrink-0 items-center gap-2 border-b px-4 sticky top-0 z-10 bg-background/50 backdrop-blur-xl">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" />
            <span className="text-sm font-semibold tracking-tight">Database Studio</span>
            <Badge
              variant="secondary"
              className="h-5 px-1.5 text-[10px] font-medium"
            >
              {schema.tables.length} tables
            </Badge>
            <div className="ml-auto flex items-center gap-3">
              <span className="text-xs text-muted-foreground font-mono flex items-center gap-2">
                Connected <span className="h-2 w-2 rounded-full bg-green-500" />
              </span>
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline">{activeDatabase.name}</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Databases</DialogTitle>
                    <DialogDescription>Select the database to visualize</DialogDescription>
                  </DialogHeader>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {databases.map((db) => (
                      <Card
                        key={db.id}
                        className="cursor-pointer hover:border-primary/30 transition-colors"
                        onClick={() => handleSelect(db)}
                      >
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <DatabaseIcon className="size-4 text-muted-foreground" />
                            {db.name}
                          </CardTitle>
                          <CardDescription>
                            Added {new Date(db.createdAt).toLocaleDateString()}
                          </CardDescription>
                        </CardHeader>
                      </Card>
                    ))}
                  </div>
                </DialogContent>
              </Dialog>
              <ModeToggle />
            </div>
          </header>
          <div className="w-full flex-1 overflow-auto">{children}</div>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  )
}
