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
      <div className="flex flex-col border-b border-border">
        <div className="flex items-center gap-2 px-4 py-2 border-b border-border/50">
          <span className="text-[11px] font-bold tracking-wide text-foreground">SQL Query</span>
          <span className="text-[10px] text-muted-foreground">⌘+Enter to run</span>
          <div className="flex-1" />
          <button
            onClick={run}
            disabled={loading || !sql.trim()}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-colors disabled:opacity-40 ${
              loading ? 'bg-primary/15 text-primary' : 'bg-primary text-primary-foreground'
            }`}
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
          className="w-full px-4 py-3 text-[13px] font-mono text-foreground bg-background outline-none resize-none min-h-[120px]"
          spellCheck={false}
        />
      </div>

      {/* Results */}
      <div className="flex-1 overflow-auto">
        {error && <div className="p-4 text-[12px] font-mono text-destructive">{error}</div>}

        {result && (
          <>
            <div className="px-4 py-1.5 flex items-center gap-3 text-[10px] text-muted-foreground bg-muted border-b border-border">
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
                      className="sticky top-0 px-3 py-2 whitespace-nowrap text-[11px] font-semibold text-foreground bg-muted border-b border-border"
                    >
                      <div className="flex flex-col gap-0.5">
                        <span>{col.name}</span>
                        <span className="text-muted-foreground font-normal">{col.type}</span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {result.rows.map((row, i) => (
                  <tr
                    key={i}
                    className="hover:bg-muted/50 border-b border-border/50"
                  >
                    {result.columns.map((col) => {
                      const val = row[col.name]
                      return (
                        <td
                          key={col.name}
                          className="px-3 py-1.5 whitespace-nowrap text-[12px] font-mono text-foreground border-b border-border/50"
                        >
                          {val === null || val === undefined ? (
                            <span className="text-muted-foreground italic">null</span>
                          ) : typeof val === 'boolean' ? (
                            <span
                              className={`text-[10px] px-1 rounded ${
                                val
                                  ? 'bg-green-500/15 text-green-400'
                                  : 'bg-red-500/15 text-red-400'
                              }`}
                            >
                              {String(val)}
                            </span>
                          ) : typeof val === 'object' ? (
                            <span className="text-primary">{JSON.stringify(val).slice(0, 80)}</span>
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
          <div className="flex items-center justify-center h-full font-mono text-muted-foreground">
            Write a SELECT query and press Run
          </div>
        )}
      </div>

      {/* History */}
      {history.length > 0 && (
        <div className="px-4 py-2 flex gap-2 overflow-x-auto flex-shrink-0 border-t border-border bg-muted/30">
          {history.map((h, i) => (
            <button
              key={i}
              onClick={() => setSql(h)}
              className="text-[10px] font-mono px-2 py-1 rounded whitespace-nowrap bg-muted text-muted-foreground hover:bg-muted/80 transition-colors truncate max-w-[200px]"
            >
              {h}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
