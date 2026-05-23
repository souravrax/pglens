'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useStore } from 'zustand'
import { schemaStore } from '@/lib/store'
import type { DatabaseConfig } from '@/lib/tauri-api'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { Database, Plus, Trash2, Settings, ArrowRight, Check } from 'lucide-react'

function isTauriEnv(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
}

// ── Tauri App View ──────────────────────────────────────────────────────────
function AppView() {
  const router = useRouter()
  const databases = useStore(schemaStore, (s) => s.databases)
  const deleteDatabase = useStore(schemaStore, (s) => s.deleteDatabase)
  const setActiveDatabase = useStore(schemaStore, (s) => s.setActiveDatabase)

  useEffect(() => {
    schemaStore.getState()._loadDatabases()
  }, [])

  const handleRemove = async (id: string) => {
    try {
      await deleteDatabase(id)
    } catch {
      // handled silently
    }
  }

  const handleSelect = (db: DatabaseConfig) => {
    setActiveDatabase(db)
    router.push('/dashboard')
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex h-12 shrink-0 items-center justify-between border-b px-6">
        <div className="flex items-center gap-2">
          <Database className="size-5 text-primary" />
          <span className="text-sm font-semibold">pgviz</span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push('/settings')}
            title="Settings"
          >
            <Settings className="size-4 text-muted-foreground" />
          </Button>
        </div>
      </header>

      <main className="flex-1 px-6 py-8">
        <div className="mx-auto max-w-3xl">
          <div className="mb-8">
            <h1 className="text-2xl font-bold tracking-tight">Connections</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Manage your PostgreSQL database connections
            </p>
          </div>

          <div className="mb-6 flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">
              {databases.length} connection{databases.length !== 1 ? 's' : ''}
            </span>
            <Button size="sm" onClick={() => router.push('/connections/new')}>
              <Plus className="size-4 mr-1.5" />
              New Connection
            </Button>
          </div>

          {databases.length === 0 && (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                <Database className="size-6 text-muted-foreground" />
              </div>
              <p className="mt-4 text-sm font-medium">No connections yet</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Add a connection to start exploring your database
              </p>
              <Button className="mt-4" size="sm" onClick={() => router.push('/connections/new')}>
                <Plus className="size-4 mr-1.5" />
                New Connection
              </Button>
            </div>
          )}

          {databases.length > 0 && (
            <div className="space-y-3">
              {databases.map((db) => (
                <Card
                  key={db.id}
                  className="group cursor-pointer transition-colors hover:border-primary/40 hover:bg-muted/20"
                  onClick={() => handleSelect(db)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                          <Database className="size-4 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-base">{db.name}</CardTitle>
                          <CardDescription className="text-xs font-mono">
                            {db.url.replace(/(:\/\/[^:\/]+:)[^@]+(@)/, '$1*****$2')}
                          </CardDescription>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleRemove(db.id)
                          }}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                        <ArrowRight className="size-4 text-muted-foreground" />
                      </div>
                    </div>
                  </CardHeader>
                  <CardFooter className="pt-0 text-xs text-muted-foreground">
                    Added {new Date(db.createdAt).toLocaleDateString()}
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

// ── Web Landing Page ────────────────────────────────────────────────────────
function LandingPage() {
  const features = [
    {
      title: 'Schema Visualization',
      desc: 'Interactive ER diagrams generated from your PostgreSQL database. See tables, columns, and relationships at a glance.',
    },
    {
      title: 'Query Explorer',
      desc: 'Browse table data with filtering, sorting, and pagination. No more writing SELECT * just to peek at rows.',
    },
    {
      title: 'SQL Execution',
      desc: 'Write and run queries with full syntax highlighting via CodeMirror. Results formatted in a clean data grid.',
    },
    {
      title: 'Query Analysis',
      desc: 'Run EXPLAIN plans with visual breakdowns. Understand query performance without memorizing Postgres internals.',
    },
    {
      title: 'Metadata Browser',
      desc: 'Explore triggers, functions, views, extensions, constraints, sequences, and more in one unified interface.',
    },
    {
      title: 'Native & Fast',
      desc: 'Built with Rust and Tauri. Not an Electron app. Starts instantly, feels native, stays out of your way.',
    },
  ]

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="flex h-14 items-center justify-between border-b px-6">
        <div className="flex items-center gap-2">
          <Database className="size-5 text-primary" />
          <span className="text-sm font-semibold">pgviz</span>
        </div>
        <nav className="flex items-center gap-4 text-sm">
          <a href="#features" className="text-muted-foreground hover:text-foreground transition-colors">
            Features
          </a>
          <a href="#pricing" className="text-muted-foreground hover:text-foreground transition-colors">
            Pricing
          </a>
          <a
            href="https://github.com/souravrax/pgviz"
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            GitHub
          </a>
        </nav>
      </header>

      {/* Hero */}
      <section className="flex flex-col items-center justify-center px-6 py-20 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 mb-6">
          <Database className="size-8 text-primary" />
        </div>
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          PostgreSQL, visualized
        </h1>
        <p className="mt-4 max-w-lg text-lg text-muted-foreground">
          A fast, native desktop app for exploring PostgreSQL databases. No Electron bloat. No web server. Just your data, beautifully.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row gap-3">
          <Button size="lg" asChild>
            <a href="https://your-lemonsqueezy-link-here" target="_blank" rel="noopener noreferrer">
              Buy Now — $10
            </a>
          </Button>
          <Button variant="outline" size="lg" asChild>
            <a href="https://github.com/souravrax/pgviz" target="_blank" rel="noopener noreferrer">
              View on GitHub
            </a>
          </Button>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          One-time purchase. Free lifetime updates. macOS, Windows & Linux.
        </p>
      </section>

      {/* Screenshot Placeholder */}
      <section className="px-6 py-12">
        <div className="mx-auto max-w-4xl rounded-xl border bg-muted/30 aspect-[16/10] flex items-center justify-center">
          <div className="text-center">
            <Database className="size-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Screenshot coming soon</p>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="px-6 py-20">
        <div className="mx-auto max-w-4xl">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-bold tracking-tight">Everything you need</h2>
            <p className="mt-2 text-muted-foreground">
              Built for developers who work with PostgreSQL every day
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <div key={f.title} className="rounded-xl border bg-card p-5">
                <div className="flex items-center gap-2 mb-2">
                  <Check className="size-4 text-primary" />
                  <h3 className="text-sm font-semibold">{f.title}</h3>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="px-6 py-20 border-t">
        <div className="mx-auto max-w-sm text-center">
          <h2 className="text-2xl font-bold tracking-tight">Simple pricing</h2>
          <p className="mt-2 text-muted-foreground">One payment, yours forever</p>
          <div className="mt-8 rounded-xl border bg-card p-6">
            <div className="flex items-baseline justify-center gap-1">
              <span className="text-4xl font-bold">$10</span>
              <span className="text-muted-foreground">one-time</span>
            </div>
            <ul className="mt-6 space-y-3 text-left text-sm">
              {[
                'All features included',
                'Free lifetime updates',
                'macOS, Windows & Linux',
                'Source code available (noncommercial)',
              ].map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <Check className="size-4 text-primary shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <Button className="mt-6 w-full" size="lg" asChild>
              <a href="https://your-lemonsqueezy-link-here" target="_blank" rel="noopener noreferrer">
                Buy on Lemon Squeezy
              </a>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t px-6 py-8">
        <div className="mx-auto max-w-4xl flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <Database className="size-4" />
            <span className="font-semibold text-foreground">pgviz</span>
            <span>© {new Date().getFullYear()}</span>
          </div>
          <div className="flex items-center gap-4">
            <a href="https://github.com/souravrax/pgviz" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">
              GitHub
            </a>
            <a href="https://your-lemonsqueezy-link-here" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">
              Buy
            </a>
            <span>Licensed under PolyForm Noncommercial 1.0.0</span>
          </div>
        </div>
      </footer>
    </div>
  )
}

// ── Entry Point ─────────────────────────────────────────────────────────────
export default function Home() {
  const [isTauri, setIsTauri] = useState<boolean | null>(null)

  useEffect(() => {
    setIsTauri(isTauriEnv())
  }, [])

  // Prevent flash while detecting environment
  if (isTauri === null) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-sm text-muted-foreground">Loading...</div>
      </div>
    )
  }

  return isTauri ? <AppView /> : <LandingPage />
}
