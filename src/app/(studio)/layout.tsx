'use client'

import { useEffect, useState } from 'react'
import { useStore } from 'zustand'
import { schemaStore } from '@/lib/store'
import { AppSidebar } from '@/components/app-sidebar'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import { TooltipProvider } from '@/components/ui/tooltip'
import { ModeToggle } from '@/components/mode-toggle'

export default function StudioLayout({ children }: { children: React.ReactNode }) {
  const schema = useStore(schemaStore, (s) => s.schema)
  const setSchema = useStore(schemaStore, (s) => s.setSchema)
  const selectedSchema = useStore(schemaStore, (s) => s.selectedSchema)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/schema?schema=${encodeURIComponent(selectedSchema)}`)
      .then(async (res) => {
        if (!res.ok) {
          const err = await res.json()
          throw new Error(err.error || 'Failed to fetch schema')
        }
        return res.json()
      })
      .then(setSchema)
      .catch((err) => setError(err.message))
  }, [selectedSchema, setSchema])

  if (error) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-3 font-mono">
        <div className="text-sm font-bold text-destructive">Failed to load schema</div>
        <div className="text-xs text-muted-foreground">{error}</div>
        <div className="text-[11px] text-muted-foreground">Make sure DATABASE_URL is set</div>
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
            <div className="ml-auto">
              <ModeToggle />
            </div>
          </header>
          <div className="w-full flex-1 overflow-auto">{children}</div>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  )
}
