'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useStore } from 'zustand'
import { schemaStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import {
  ArrowLeft,
  Moon,
  Sun,
  Monitor,
  Trash2,
  Database,
  Package,
  Key,
  ExternalLink,
  CheckCircle2,
} from 'lucide-react'
import { useTheme } from 'next-themes'
import {
  getLicense,
  activateLicense,
  deactivateLicense,
  type LicenseInfo,
} from '@/lib/tauri-api'
import { Input } from '@/components/ui/input'

export default function SettingsPage() {
  const router = useRouter()
  const { theme, setTheme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const databases = useStore(schemaStore, (s) => s.databases)
  const deleteDatabase = useStore(schemaStore, (s) => s.deleteDatabase)

  const [license, setLicense] = useState<LicenseInfo | null>(null)
  const [licenseKey, setLicenseKey] = useState('')
  const [licenseError, setLicenseError] = useState<string | null>(null)
  const [licenseLoading, setLicenseLoading] = useState(false)

  useEffect(() => {
    setMounted(true)
    getLicense().then(setLicense).catch(() => setLicense(null))
  }, [])

  const handleActivate = async () => {
    if (!licenseKey.trim()) return
    setLicenseLoading(true)
    setLicenseError(null)
    try {
      await activateLicense(licenseKey.trim(), 'pgviz')
      const l = await getLicense()
      setLicense(l)
      setLicenseKey('')
    } catch (err: unknown) {
      setLicenseError(err instanceof Error ? err.message : String(err))
    } finally {
      setLicenseLoading(false)
    }
  }

  const handleDeactivate = async () => {
    try {
      await deactivateLicense()
      setLicense(null)
    } catch {
      // ignore
    }
  }

  const handleDeleteAll = async () => {
    if (window.confirm('Are you sure? This will remove all saved connections.')) {
      for (const db of databases) {
        await deleteDatabase(db.id)
      }
    }
  }

  if (!mounted) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-sm text-muted-foreground">Loading...</div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="flex h-12 shrink-0 items-center gap-3 border-b px-6">
        <Button variant="ghost" size="icon" onClick={() => router.push('/')}>
          <ArrowLeft className="size-4" />
        </Button>
        <span className="text-sm font-semibold">Settings</span>
      </header>

      {/* Main */}
      <main className="flex-1 px-6 py-8">
        <div className="mx-auto max-w-2xl">
          {/* Title */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Configure preferences and manage your data
            </p>
          </div>

          <div className="space-y-8">
            {/* Appearance */}
            <section>
              <h2 className="text-base font-semibold">Appearance</h2>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Customize how pgviz looks and feels
              </p>

              <div className="mt-4 rounded-xl border bg-card p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {resolvedTheme === 'dark' ? (
                      <Moon className="size-5 text-muted-foreground" />
                    ) : (
                      <Sun className="size-5 text-muted-foreground" />
                    )}
                    <div>
                      <Label className="text-sm font-medium">Theme</Label>
                      <p className="text-xs text-muted-foreground">
                        Choose your preferred color scheme
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant={theme === 'light' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setTheme('light')}
                    >
                      <Sun className="size-3.5 mr-1.5" />
                      Light
                    </Button>
                    <Button
                      variant={theme === 'dark' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setTheme('dark')}
                    >
                      <Moon className="size-3.5 mr-1.5" />
                      Dark
                    </Button>
                    <Button
                      variant={theme === 'system' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setTheme('system')}
                    >
                      <Monitor className="size-3.5 mr-1.5" />
                      System
                    </Button>
                  </div>
                </div>
              </div>
            </section>

            {/* Saved Connections */}
            <section>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-semibold">Saved Connections</h2>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {databases.length} connection{databases.length !== 1 ? 's' : ''} stored locally
                  </p>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleDeleteAll}
                  disabled={databases.length === 0}
                >
                  <Trash2 className="size-3.5 mr-1.5" />
                  Clear All
                </Button>
              </div>

              {databases.length > 0 && (
                <div className="mt-4 space-y-2">
                  {databases.map((db) => (
                    <div
                      key={db.id}
                      className="flex items-center justify-between rounded-xl border bg-card px-4 py-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                          <Database className="size-4 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{db.name}</p>
                          <p className="text-xs text-muted-foreground font-mono">
                            {db.url.replace(/(:\/\/[^:\/]+:)[^@]+(@)/, '$1*****$2')}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => deleteDatabase(db.id)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* License */}
            <section>
              <h2 className="text-base font-semibold">License</h2>
              <p className="mt-0.5 text-sm text-muted-foreground">
                BSL 1.1 — Free for personal use. Commercial requires a license.
              </p>
              <div className="mt-4 rounded-xl border bg-card p-4">
                {license ? (
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="size-5 text-green-500" />
                      <div>
                        <p className="text-sm font-medium">Licensed</p>
                        <p className="text-xs text-muted-foreground font-mono">
                          {license.key.slice(0, 8)}••••••••
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleDeactivate}
                    >
                      Deactivate License
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-3">
                      <Key className="size-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">No license active</p>
                        <p className="text-xs text-muted-foreground">
                          Personal use is free. Commercial use requires a license.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Input
                        placeholder="Enter license key"
                        value={licenseKey}
                        onChange={(e) => {
                          setLicenseKey(e.target.value)
                          setLicenseError(null)
                        }}
                        className="font-mono text-sm"
                      />
                      <Button
                        size="sm"
                        onClick={handleActivate}
                        disabled={licenseLoading || !licenseKey.trim()}
                      >
                        {licenseLoading ? 'Activating...' : 'Activate'}
                      </Button>
                    </div>
                    {licenseError && (
                      <p className="text-xs text-destructive">{licenseError}</p>
                    )}
                    <a
                      href="https://pgviz.lemonsqueezy.com/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                      <ExternalLink className="size-3" />
                      Buy a license on Lemon Squeezy
                    </a>
                  </div>
                )}
              </div>
            </section>

            {/* About */}
            <section>
              <h2 className="text-base font-semibold">About</h2>
              <div className="mt-4 rounded-xl border bg-card p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <Package className="size-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">pgviz</p>
                    <p className="text-xs text-muted-foreground">v0.1.0</p>
                  </div>
                </div>
                <Separator className="my-3" />
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Interactive PostgreSQL schema visualizer and query tool. Built with
                  Next.js, Tauri, and Rust.
                </p>
                <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                  Licensed under Business Source License 1.1 (BSL 1.1).
                  Free for personal, educational, and non-commercial use.
                  Commercial use requires a license — available at pgviz.lemonsqueezy.com
                </p>
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  )
}
