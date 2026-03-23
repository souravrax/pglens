'use client'

import { useState, useCallback } from 'react'
import { Play, Loader2 } from 'lucide-react'

type QueryResult = {
  rows: Record<string, unknown>[]
  columns: { name: string; type: string }[]
  rowCount: number
  duration: number
}

export default function QueryPage() {
  const [sql, setSql] = useState('')
  const [result, setResult] = useState<QueryResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [history, setHistory] = useState<string[]>([])

  const run = useCallback(async () => {
    const trimmed = sql.trim()
    if (!trimmed) return

    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const res = await fetch('/api/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sql: trimmed }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Query failed')
      setResult(data)
      setHistory((h) => [trimmed, ...h].slice(0, 20))
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }, [sql])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault()
      run()
    }
  }

  return (
    <div className="h-full flex flex-col">
      {/* Editor */}
      <div
        className="flex flex-col"
        style={{ borderBottom: '1px solid #2a2a35' }}
      >
        <div
          className="flex items-center gap-2 px-4 py-2"
          style={{ borderBottom: '1px solid #1e1e2e' }}
        >
          <span
            className="text-[11px] font-bold tracking-wide"
            style={{ color: '#e2e2e8' }}
          >
            SQL Query
          </span>
          <span
            className="text-[10px]"
            style={{ color: '#555' }}
          >
            ⌘+Enter to run
          </span>
          <div className="flex-1" />
          <button
            onClick={run}
            disabled={loading || !sql.trim()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-colors disabled:opacity-40"
            style={{
              background: loading ? 'rgba(99,102,241,0.15)' : '#6366f1',
              color: loading ? '#a5b4fc' : '#fff',
            }}
          >
            {loading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Play className="w-3.5 h-3.5" />
            )}
            Run
          </button>
        </div>
        <textarea
          value={sql}
          onChange={(e) => setSql(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="SELECT * FROM merchants LIMIT 10;"
          className="w-full px-4 py-3 text-[13px] font-mono outline-none resize-none"
          style={{
            background: '#0e0e12',
            color: '#e2e2e8',
            minHeight: 120,
            border: 'none',
          }}
          spellCheck={false}
        />
      </div>

      {/* Results */}
      <div className="flex-1 overflow-auto">
        {error && (
          <div
            className="p-4 text-[12px] font-mono"
            style={{ color: '#ef4444' }}
          >
            {error}
          </div>
        )}

        {result && (
          <>
            <div
              className="px-4 py-1.5 flex items-center gap-3 text-[10px]"
              style={{ background: '#1e1e2e', borderBottom: '1px solid #2a2a35', color: '#7c7c8a' }}
            >
              <span>{result.rowCount} rows</span>
              <span>{result.columns.length} columns</span>
              <span>{result.duration}ms</span>
            </div>
            <table className="w-full text-left border-collapse">
              <thead>
                <tr>
                  {result.columns.map((col) => (
                    <th
                      key={col.name}
                      className="sticky top-0 px-3 py-2 whitespace-nowrap text-[11px] font-semibold"
                      style={{
                        background: '#1e1e2e',
                        borderBottom: '1px solid #2a2a35',
                        color: '#94a3b8',
                      }}
                    >
                      <div className="flex flex-col gap-0.5">
                        <span>{col.name}</span>
                        <span style={{ color: '#555', fontWeight: 400 }}>{col.type}</span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {result.rows.map((row, i) => (
                  <tr
                    key={i}
                    className="hover:bg-white/[0.02]"
                    style={{ borderBottom: '1px solid #1e1e2e' }}
                  >
                    {result.columns.map((col) => {
                      const val = row[col.name]
                      return (
                        <td
                          key={col.name}
                          className="px-3 py-1.5 whitespace-nowrap text-[12px] font-mono"
                          style={{ borderBottom: '1px solid #1e1e2e', color: '#e2e2e8' }}
                        >
                          {val === null || val === undefined ? (
                            <span style={{ color: '#555', fontStyle: 'italic' }}>null</span>
                          ) : typeof val === 'boolean' ? (
                            <span
                              className="text-[10px] px-1 rounded"
                              style={{
                                background: val ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
                                color: val ? '#4ade80' : '#f87171',
                              }}
                            >
                              {String(val)}
                            </span>
                          ) : typeof val === 'object' ? (
                            <span style={{ color: '#818cf8' }}>
                              {JSON.stringify(val).slice(0, 80)}
                            </span>
                          ) : (
                            <span className="truncate block max-w-[250px]">{String(val)}</span>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        {!result && !error && !loading && (
          <div
            className="flex items-center justify-center h-full font-mono"
            style={{ color: '#7c7c8a' }}
          >
            Write a SELECT query and press Run
          </div>
        )}
      </div>

      {/* History */}
      {history.length > 0 && (
        <div
          className="px-4 py-2 flex gap-2 overflow-x-auto flex-shrink-0"
          style={{ borderTop: '1px solid #2a2a35', background: '#12121a' }}
        >
          {history.map((h, i) => (
            <button
              key={i}
              onClick={() => setSql(h)}
              className="text-[10px] font-mono px-2 py-1 rounded whitespace-nowrap hover:bg-white/5 transition-colors truncate max-w-[200px]"
              style={{ background: '#1e1e2e', color: '#7c7c8a' }}
            >
              {h}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
