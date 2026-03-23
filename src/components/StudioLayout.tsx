'use client'

import { useState, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useStore } from 'zustand'
import { schemaStore } from '@/lib/store'
import { Database, GitFork, Terminal, Search } from 'lucide-react'

export default function StudioLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const schema = useStore(schemaStore, (s) => s.schema)
  const setSchema = useStore(schemaStore, (s) => s.setSchema)
  const selectedTable = useStore(schemaStore, (s) => s.selectedTable)
  const setSelectedTable = useStore(schemaStore, (s) => s.setSelectedTable)
  const search = useStore(schemaStore, (s) => s.search)
  const setSearch = useStore(schemaStore, (s) => s.setSearch)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/schema')
      .then(async (res) => {
        if (!res.ok) {
          const err = await res.json()
          throw new Error(err.error || 'Failed to fetch schema')
        }
        return res.json()
      })
      .then(setSchema)
      .catch((err) => setError(err.message))
  }, [setSchema])

  const routes = [
    { path: '/tables', icon: <Database className="w-5 h-5" />, label: 'Tables' },
    { path: '/query', icon: <Terminal className="w-5 h-5" />, label: 'Query' },
    { path: '/visualize', icon: <GitFork className="w-5 h-5" />, label: 'Visualize' },
  ]

  const activeRoute = routes.find((r) => pathname?.startsWith(r.path))?.path ?? '/tables'

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-3 font-mono">
        <div style={{ color: '#ef4444', fontSize: 14, fontWeight: 'bold' }}>
          Failed to load schema
        </div>
        <div style={{ color: '#7c7c8a', fontSize: 12 }}>{error}</div>
        <div style={{ color: '#7c7c8a', fontSize: 11 }}>Make sure DATABASE_URL is set</div>
      </div>
    )
  }

  if (!schema) {
    return (
      <div
        className="flex items-center justify-center h-screen font-mono"
        style={{ color: '#7c7c8a' }}
      >
        Loading schema...
      </div>
    )
  }

  const filteredTables = schema.tables.filter((t) =>
    t.name.toLowerCase().includes(search.toLowerCase()),
  )

  return (
    <div
      className="flex flex-col h-screen"
      style={{ background: '#0e0e12' }}
    >
      {/* Header */}
      <div
        className="flex items-center px-4 h-10 flex-shrink-0"
        style={{ background: '#12121a', borderBottom: '1px solid #2a2a35' }}
      >
        <span
          className="text-[13px] font-bold tracking-wide"
          style={{ color: '#e2e2e8' }}
        >
          DB Studio
        </span>
        <span
          className="ml-3 text-[10px] px-2 py-0.5 rounded-full"
          style={{ background: '#1e1e2e', color: '#7c7c8a' }}
        >
          {schema.tables.length} tables
        </span>
        <span
          className="ml-auto text-[10px] font-mono"
          style={{ color: '#555' }}
        >
          postgres
        </span>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Icon Rail */}
        <div
          className="flex flex-col items-center py-3 gap-1 flex-shrink-0"
          style={{ width: 48, background: '#12121a', borderRight: '1px solid #2a2a35' }}
        >
          {routes.map((route) => (
            <RailButton
              key={route.path}
              icon={route.icon}
              label={route.label}
              active={activeRoute === route.path}
              onClick={() => router.push(route.path)}
            />
          ))}
        </div>

        {/* Table list sidebar */}
        <div
          className="flex flex-col overflow-hidden flex-shrink-0"
          style={{ width: 240, background: '#18181f', borderRight: '1px solid #2a2a35' }}
        >
          <div
            className="p-3"
            style={{ borderBottom: '1px solid #2a2a35' }}
          >
            <div className="relative">
              <Search
                className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5"
                style={{ color: '#7c7c8a' }}
              />
              <input
                type="text"
                placeholder="Filter tables..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-lg text-[12px] outline-none"
                style={{ background: '#0e0e12', border: '1px solid #2a2a35', color: '#e2e2e8' }}
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto py-1">
            {filteredTables.map((table) => {
              const isSelected = selectedTable === table.name
              const fkCount = schema.relations.filter(
                (r) => r.fromTable === table.name || r.toTable === table.name,
              ).length

              return (
                <button
                  key={table.name}
                  onClick={() => setSelectedTable(table.name)}
                  className="w-full px-3 py-1.5 text-left flex items-center gap-2 transition-colors hover:bg-white/5"
                  style={{
                    background: isSelected ? 'rgba(99,102,241,0.1)' : 'transparent',
                    borderLeft: isSelected ? '2px solid #6366f1' : '2px solid transparent',
                  }}
                >
                  <span
                    className="text-[12px] font-mono flex-1 truncate"
                    style={{ color: isSelected ? '#a5b4fc' : '#e2e2e8' }}
                  >
                    {table.name}
                  </span>
                  <span
                    className="text-[9px] px-1.5 py-0.5 rounded"
                    style={{ background: '#2a2a35', color: '#7c7c8a' }}
                  >
                    {table.columns.length}
                  </span>
                  {fkCount > 0 && (
                    <span
                      className="text-[9px] px-1.5 py-0.5 rounded"
                      style={{ background: 'rgba(99,102,241,0.15)', color: '#818cf8' }}
                    >
                      {fkCount}
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          <div
            className="px-3 py-2 text-[10px] flex gap-3"
            style={{ borderTop: '1px solid #2a2a35', color: '#7c7c8a' }}
          >
            <span>{schema.tables.length} tables</span>
            <span>{schema.relations.length} fks</span>
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 overflow-hidden">{children}</div>
      </div>
    </div>
  )
}

function RailButton({
  icon,
  label,
  active,
  onClick,
}: {
  icon: React.ReactNode
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="relative group flex items-center justify-center w-10 h-10 rounded-lg transition-colors"
      style={{
        background: active ? 'rgba(99,102,241,0.15)' : 'transparent',
        color: active ? '#a5b4fc' : '#7c7c8a',
      }}
    >
      {active && (
        <div
          className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r"
          style={{ background: '#6366f1' }}
        />
      )}
      {icon}
      <div
        className="absolute left-full ml-2 px-2 py-1 rounded text-[11px] whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-50"
        style={{ background: '#2a2a35', color: '#e2e2e8' }}
      >
        {label}
      </div>
    </button>
  )
}
