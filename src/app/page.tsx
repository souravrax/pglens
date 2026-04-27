'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useStore } from 'zustand'
import { schemaStore } from '@/lib/store'
import type { DatabaseConfig } from '@/lib/store'
import { AddDatabaseDialog } from '@/components/AddDatabaseDialog'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { Database, LayoutDashboardIcon, Plus, Trash2 } from 'lucide-react'
import { ModeToggle } from '@/components/mode-toggle'

export default function Home() {
  const router = useRouter()
  const databases = useStore(schemaStore, (s) => s.databases)
  const addDatabase = useStore(schemaStore, (s) => s.addDatabase)
  const deleteDatabase = useStore(schemaStore, (s) => s.deleteDatabase)
  const setActiveDatabase = useStore(schemaStore, (s) => s.setActiveDatabase)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleAdd = (name: string, url: string) => {
    try {
      addDatabase(name, url)
      setError(null)
    } catch {
      setError('Failed to add database')
    }
  }

  const handleRemove = (id: string) => {
    try {
      deleteDatabase(id)
      setError(null)
    } catch {
      setError('Failed to remove database')
    }
  }

  const handleSelect = (db: DatabaseConfig) => {
    setActiveDatabase(db)
    router.push('/dashboard')
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex py-2 shrink-0 items-center gap-3 border-b px-6 sticky top-0 z-10 bg-background/50 backdrop-blur-xl">
        <div className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <LayoutDashboardIcon className="size-4" />
          </div>
          <span className="text-sm font-semibold tracking-tight">Database Studio</span>
        </div>
        <div className="ml-auto">
          <ModeToggle />
        </div>
      </header>

      <main className="flex flex-1 flex-col items-center px-6 py-16">
        <div className="w-full max-w-3xl">
          <div className="mb-12 text-center">
            <div className="flex items-center gap-2 flex-col">
              <div className="flex p-4 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Database className="size-8" />
              </div>
              <h1 className="mb-2 text-2xl font-bold tracking-tight">Database Studio</h1>
            </div>
            <p className="text-sm text-muted-foreground">
              Manage and explore your PostgreSQL databases
            </p>
          </div>

          {error && (
            <div className="mb-8 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-center">
              <p className="text-sm font-medium text-destructive">{error}</p>
            </div>
          )}

          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Databases</h2>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="size-4 mr-1.5" />
              Add Database
            </Button>
          </div>

          {databases.length === 0 && (
            <div className="rounded-lg border border-dashed p-10 text-center">
              <Database className="mx-auto mb-3 size-8 text-muted-foreground/40" />
              <p className="text-sm font-medium text-muted-foreground">No databases added yet</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Click &quot;Add Database&quot; to connect your first PostgreSQL database
              </p>
            </div>
          )}

          {databases.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {databases.map((db) => (
                <Card
                  key={db.id}
                  className="cursor-pointer hover:border-primary/30 transition-colors"
                  onClick={() => handleSelect(db)}
                >
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Database className="size-4 text-muted-foreground" />
                      {db.name}
                    </CardTitle>
                    <CardDescription>
                      Added {new Date(db.createdAt).toLocaleDateString()}
                    </CardDescription>
                  </CardHeader>
                  <CardFooter className="flex justify-end">
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      className="text-muted-foreground hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleRemove(db.id)
                      }}
                    >
                      <Trash2 className="size-4" />
                      <span className="sr-only">Remove database</span>
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>

      <AddDatabaseDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleAdd}
        existingNames={databases.map((d) => d.name)}
      />
    </div>
  )
}
