'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useStore } from 'zustand'
import { schemaStore } from '@/lib/store'
import {
  Database,
  GitFork,
  Table2,
  ArrowRight,
  Link2,
  KeyRound,
  Columns3,
  LayoutDashboardIcon,
} from 'lucide-react'
import { ModeToggle } from '@/components/mode-toggle'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export default function Home() {
  const router = useRouter()
  const schema = useStore(schemaStore, (s) => s.schema)
  const setSchema = useStore(schemaStore, (s) => s.setSchema)
  const schemas = useStore(schemaStore, (s) => s.schemas)
  const setSchemas = useStore(schemaStore, (s) => s.setSchemas)
  const selectedSchema = useStore(schemaStore, (s) => s.selectedSchema)
  const setSelectedSchema = useStore(schemaStore, (s) => s.setSelectedSchema)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/schemas')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setSchemas(data)
      })
      .catch(() => {})
  }, [setSchemas])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setError(null)
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

  const totalColumns = schema?.tables.reduce((sum, t) => sum + t.columns.length, 0) ?? 0
  const totalIndexes = schema?.tables.reduce((sum, t) => sum + t.indexes.length, 0) ?? 0

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex py-2 shrink-0 items-center gap-3 border-b px-6 sticky top-0 z-10 bg-background/50 backdrop-blur-xl">
        <div className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <LayoutDashboardIcon className="size-4" />
          </div>
          <span className="text-sm font-semibold tracking-tight">Database Studio</span>
        </div>
        {schemas.length > 0 && (
          <Select
            value={selectedSchema}
            onValueChange={setSelectedSchema}
          >
            <SelectTrigger size="sm">
              <SelectValue />
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
        )}
        <div className="ml-auto">
          <ModeToggle />
        </div>
      </header>

      <main className="flex flex-1 flex-col items-center px-6 py-16">
        <div className="w-full max-w-3xl">
          <div className="mb-12 text-center">
            <div className="flex items-center gap-2 flex-col">
              <div className="flex p-4 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <LayoutDashboardIcon className="size-8" />
              </div>
              <h1 className="mb-2 text-2xl font-bold tracking-tight">Database Studio</h1>
            </div>
            <p className="text-sm text-muted-foreground">
              Visualize, query, and explore your database schema
            </p>
          </div>

          {error && (
            <div className="mb-8 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-center">
              <p className="text-sm font-medium text-destructive">{error}</p>
              <p className="mt-1 text-xs text-muted-foreground">Make sure DATABASE_URL is set</p>
            </div>
          )}

          {!error && !schema && (
            <div className="flex items-center justify-center py-20 text-sm text-muted-foreground">
              Loading schema...
            </div>
          )}

          {schema && (
            <>
              <div className="mb-10 grid grid-cols-4 gap-3">
                <StatCard
                  icon={Table2}
                  label="Tables"
                  value={schema.tables.length}
                />
                <StatCard
                  icon={Link2}
                  label="Relations"
                  value={schema.relations.length}
                />
                <StatCard
                  icon={Columns3}
                  label="Columns"
                  value={totalColumns}
                />
                <StatCard
                  icon={KeyRound}
                  label="Indexes"
                  value={totalIndexes}
                />
              </div>

              <div className="mb-10 grid grid-cols-3 gap-3">
                <FeatureCard
                  icon={Table2}
                  title="Tables"
                  description="Browse table data with pagination and filtering"
                  onClick={() => router.push('/tables')}
                />
                <FeatureCard
                  icon={Database}
                  title="Query"
                  description="Run raw SQL queries against your database"
                  onClick={() => router.push('/query')}
                />
                <FeatureCard
                  icon={GitFork}
                  title="Visualize"
                  description="Interactive schema graph with relationships"
                  onClick={() => router.push('/visualize')}
                />
              </div>

              <div className="rounded-lg border">
                <div className="border-b px-4 py-3">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    All Tables
                  </span>
                </div>
                <div className="divide-y">
                  {schema.tables.map((table) => {
                    const fkCount = schema.relations.filter(
                      (r) => r.fromTable === table.name || r.toTable === table.name,
                    ).length
                    return (
                      <button
                        key={table.name}
                        onClick={() => router.push('/tables')}
                        className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm hover:bg-muted/50"
                      >
                        <span className="flex-1 font-mono text-xs">{table.name}</span>
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                          <span className="rounded bg-muted px-1.5 py-0.5">
                            {table.columns.length} cols
                          </span>
                          {fkCount > 0 && (
                            <span className="rounded bg-primary/10 px-1.5 py-0.5 text-primary">
                              {fkCount} fk
                            </span>
                          )}
                        </div>
                        <ArrowRight className="size-3.5 text-muted-foreground/40" />
                      </button>
                    )
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  )
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType
  label: string
  value: number
}) {
  return (
    <div className="rounded-lg border p-4 text-center">
      <Icon className="mx-auto mb-2 size-4 text-muted-foreground" />
      <div className="text-xl font-bold tabular-nums">{value}</div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
    </div>
  )
}

function FeatureCard({
  icon: Icon,
  title,
  description,
  onClick,
}: {
  icon: React.ElementType
  title: string
  description: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="group rounded-lg border p-5 text-left transition-colors hover:border-primary/30 hover:bg-muted/30"
    >
      <Icon className="mb-3 size-5 text-muted-foreground transition-colors group-hover:text-primary" />
      <div className="mb-1 text-sm font-semibold">{title}</div>
      <div className="text-xs text-muted-foreground">{description}</div>
    </button>
  )
}
