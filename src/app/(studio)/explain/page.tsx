'use client'

import { useState, useCallback } from 'react'
import { useStore } from 'zustand'
import { schemaStore } from '@/lib/store'
import { Play, Loader2, Route, AlertCircle, CircleHelp } from 'lucide-react'
import { secureFetch } from '@/lib/api-client'
import ExplainGraph, { type ExplainResult } from '@/components/ExplainGraph'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

export default function ExplainPage() {
  const activeDatabase = useStore(schemaStore, (s) => s.activeDatabase)
  const [sql, setSql] = useState('')
  const [result, setResult] = useState<ExplainResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [analyze, setAnalyze] = useState(false)
  const [buffers, setBuffers] = useState(false)
  const [history, setHistory] = useState<string[]>([])
  const [helpOpen, setHelpOpen] = useState(false)

  const run = useCallback(async () => {
    if (!activeDatabase) return
    const trimmed = sql.trim()
    if (!trimmed) return

    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const res = await secureFetch('/api/explain', activeDatabase.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sql: trimmed, analyze, buffers }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Explain failed')
      setResult(data)
      setHistory((h) => [trimmed, ...h].slice(0, 20))
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }, [sql, activeDatabase, analyze, buffers])

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
        <div className="flex items-center gap-4 px-4 py-2 border-b border-border/50">
          <div className="flex items-center gap-2">
            <Route className="w-4 h-4 text-muted-foreground" />
            <span className="text-[11px] font-bold tracking-wide text-foreground">Query Plan</span>
          </div>
          <span className="text-[10px] text-muted-foreground">&ldquo;+Enter to run</span>
          <div className="flex-1" />
          <button
            onClick={() => setHelpOpen(true)}
            className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium text-muted-foreground hover:bg-muted transition-colors"
            title="Help"
          >
            <CircleHelp className="w-3.5 h-3.5" />
            Help
          </button>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Switch
                id="analyze"
                checked={analyze}
                onCheckedChange={setAnalyze}
                size="sm"
              />
              <Label
                htmlFor="analyze"
                className="text-[10px] font-medium cursor-pointer"
              >
                ANALYZE
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="buffers"
                checked={buffers}
                onCheckedChange={setBuffers}
                size="sm"
                disabled={!analyze}
              />
              <Label
                htmlFor="buffers"
                className={cn(
                  'text-[10px] font-medium cursor-pointer',
                  !analyze && 'opacity-40 cursor-not-allowed',
                )}
              >
                BUFFERS
              </Label>
            </div>
          </div>
          <button
            onClick={run}
            disabled={loading || !sql.trim() || !activeDatabase}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-colors disabled:opacity-40',
              loading ? 'bg-primary/15 text-primary' : 'bg-primary text-primary-foreground',
            )}
          >
            {loading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Play className="w-3.5 h-3.5" />
            )}
            Explain
          </button>
        </div>
        <textarea
          value={sql}
          onChange={(e) => setSql(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="SELECT * FROM users WHERE email = 'alice@example.com';"
          className="w-full px-4 py-3 text-[13px] font-mono text-foreground bg-background outline-none resize-none min-h-[100px]"
          spellCheck={false}
        />
        {/* Summary bar */}
        {result && (
          <div className="flex items-center gap-4 px-4 py-1.5 text-[10px] text-muted-foreground bg-muted border-t border-border/50">
            {result.planningTime !== null && (
              <span>Planning: {result.planningTime.toFixed(3)}ms</span>
            )}
            {result.executionTime !== null && (
              <span>Execution: {result.executionTime.toFixed(3)}ms</span>
            )}
          </div>
        )}
      </div>

      {/* Results */}
      <div className="flex-1 overflow-hidden">
        {error && (
          <div className="flex items-center justify-center h-full gap-2 text-destructive">
            <AlertCircle className="w-5 h-5" />
            <span className="text-sm font-mono">{error}</span>
          </div>
        )}

        {result && <ExplainGraph result={result} />}

        {!result && !error && !loading && (
          <div className="flex items-center justify-center h-full font-mono text-muted-foreground">
            Write a SELECT query and press Explain
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

      {/* Help Dialog */}
      <Dialog
        open={helpOpen}
        onOpenChange={setHelpOpen}
      >
        <DialogContent className="min-w-fit max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <CircleHelp className="w-5 h-5 text-muted-foreground" />
              Understanding Query Execution Plans
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              A visual guide to reading PostgreSQL EXPLAIN output — from the big picture down to the
              details
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 text-sm max-w-4xl">
            {/* 1. The Big Picture (outer) */}
            <section>
              <h3 className="text-xs font-bold uppercase tracking-wider text-foreground mb-2">
                The Big Picture
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                When you run a SQL query, PostgreSQL does not just blindly scan every row. It builds
                an <strong>execution plan</strong> — a tree of operations that describes exactly how
                it will fetch, join, filter, sort, and return your data. This page turns that tree
                into an interactive graph so you can see the strategy at a glance.
              </p>
              <p className="text-muted-foreground leading-relaxed mt-2">
                The graph flows <strong>left to right</strong>. The leftmost node is the
                <strong> root</strong> (the final result your query returns). Child nodes branch to
                the right — these are the operations that feed data upward. Think of it as a
                pipeline: raw data enters at the leaf nodes (table scans), gets joined, filtered,
                sorted, and finally returns at the root.
              </p>
              <p className="text-muted-foreground leading-relaxed mt-2">
                The <strong>sequence number</strong> in the corner of each node shows the order
                PostgreSQL visits operations during execution.
              </p>
            </section>

            {/* 2. The Building Blocks (node types) */}
            <section>
              <h3 className="text-xs font-bold uppercase tracking-wider text-foreground mb-2">
                The Building Blocks
              </h3>
              <p className="text-muted-foreground leading-relaxed text-xs mb-2">
                Every box in the graph is an operation. The color tells you what kind:
              </p>
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <div
                    className="w-4 h-4 border shrink-0"
                    style={{
                      background: 'var(--node-scan-bg)',
                      borderColor: 'var(--node-scan-border)',
                    }}
                  />
                  <div>
                    <span className="font-semibold text-foreground">Scan</span>
                    <span className="text-muted-foreground text-xs ml-2">
                      Reads raw data from a table or index. Seq Scan, Index Scan, Bitmap Heap Scan.
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div
                    className="w-4 h-4 border shrink-0"
                    style={{
                      background: 'var(--node-join-bg)',
                      borderColor: 'var(--node-join-border)',
                    }}
                  />
                  <div>
                    <span className="font-semibold text-foreground">Join</span>
                    <span className="text-muted-foreground text-xs ml-2">
                      Combines rows from two inputs. Hash Join, Merge Join, Nested Loop.
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div
                    className="w-4 h-4 border shrink-0"
                    style={{
                      background: 'var(--node-sort-bg)',
                      borderColor: 'var(--node-sort-border)',
                    }}
                  />
                  <div>
                    <span className="font-semibold text-foreground">Sort / Aggregate</span>
                    <span className="text-muted-foreground text-xs ml-2">
                      Reorders or groups rows. Sort, Aggregate, Group, Window Agg.
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div
                    className="w-4 h-4 border shrink-0"
                    style={{
                      background: 'var(--node-generic-bg)',
                      borderColor: 'var(--node-generic-border)',
                    }}
                  />
                  <div>
                    <span className="font-semibold text-foreground">Generic</span>
                    <span className="text-muted-foreground text-xs ml-2">
                      Everything else: Limit, Result, Materialize, Unique, etc.
                    </span>
                  </div>
                </div>
              </div>
            </section>

            {/* 3. First Metric Layer: Cost */}
            <section>
              <h3 className="text-xs font-bold uppercase tracking-wider text-foreground mb-2">
                Layer 1 — Cost (always visible)
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                Every node shows a <strong>cost</strong> estimate — PostgreSQL&rsquo;s prediction of
                how expensive the operation is, in arbitrary units. It has two parts:
              </p>
              <ul className="mt-2 space-y-1 text-muted-foreground list-disc list-inside text-xs">
                <li>
                  <strong>Startup Cost</strong> — work needed before the first row can be returned
                </li>
                <li>
                  <strong>Total Cost</strong> — work needed to return every row
                </li>
              </ul>
              <p className="text-muted-foreground leading-relaxed mt-2 text-xs">
                Lower is better. A node with a very high cost (especially a Scan) is usually your
                bottleneck. Click the node to see the exact numbers in the details panel.
              </p>
            </section>

            {/* 4. Second Metric Layer: Actual Time */}
            <section>
              <h3 className="text-xs font-bold uppercase tracking-wider text-foreground mb-2">
                Layer 2 — Actual Time (enable ANALYZE)
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                Cost is just a guess. To see <em>real</em> performance, enable the{' '}
                <strong>ANALYZE</strong> toggle. This actually runs the query and records:
              </p>
              <ul className="mt-2 space-y-1 text-muted-foreground list-disc list-inside text-xs">
                <li>
                  <strong>time=0.5..2.3ms</strong> — 0.5ms to produce the first row, 2.3ms for all
                  rows
                </li>
                <li>
                  <strong>rows=420x3</strong> — 420 rows produced per loop, and the loop ran 3 times
                </li>
              </ul>
              <p className="text-muted-foreground leading-relaxed mt-2 text-xs">
                <strong>Pro tip:</strong> Compare <em>Actual Rows</em> vs <em>Planned Rows</em> in
                the details panel. If they differ by 10x or more, PostgreSQL&rsquo;s statistics are
                stale — run{' '}
                <code className="bg-muted px-1 rounded text-[10px] font-mono">
                  ANALYZE table_name;
                </code>{' '}
                to refresh them.
              </p>
            </section>

            {/* 5. Deepest Metric Layer: Buffers */}
            <section>
              <h3 className="text-xs font-bold uppercase tracking-wider text-foreground mb-2">
                Layer 3 — Buffers (enable ANALYZE + BUFFERS)
              </h3>
              <p className="text-muted-foreground leading-relaxed text-xs">
                The deepest layer of detail. Buffers count how many database pages (8KB chunks) each
                node had to touch:
              </p>
              <ul className="mt-2 space-y-1 text-muted-foreground list-disc list-inside text-xs">
                <li>
                  <strong>Shared Hit</strong> — page was already in RAM (fast, microseconds)
                </li>
                <li>
                  <strong>Shared Read</strong> — page had to be read from disk (slow, milliseconds)
                </li>
                <li>
                  <strong>Temp Read/Written</strong> — data was too big for memory and spilled to
                  temporary disk files (very slow)
                </li>
              </ul>
              <p className="text-muted-foreground leading-relaxed mt-2 text-xs">
                If you see high <strong>Shared Read</strong> or any <strong>Temp I/O</strong> on a
                node, that node is your performance culprit. An index might fix it, or the query
                might need restructuring.
              </p>
            </section>

            {/* 6. Tail — Putting It Into Practice */}
            <section>
              <h3 className="text-xs font-bold uppercase tracking-wider text-foreground mb-2">
                Putting It Into Practice
              </h3>
              <ul className="space-y-1.5 text-muted-foreground list-disc list-inside text-xs">
                <li>
                  Click any node to see full details — cost breakdown, buffers, conditions, and the
                  raw plan JSON.
                </li>
                <li>
                  A <strong>Seq Scan</strong> on a large table almost always means a missing index.
                  Check the Filter or Index Cond in the node details.
                </li>
                <li>
                  <strong>Nested Loop</strong> with high loops means the inner side is being
                  re-scanned for every outer row. Indexing the join column usually fixes it.
                </li>
                <li>
                  <strong>Hash Join</strong> with high memory use might spill to disk (check Temp
                  Written). Increasing{' '}
                  <code className="bg-muted px-1 rounded text-[10px] font-mono">work_mem</code> can
                  help, or you can filter rows earlier.
                </li>
                <li>
                  Start without <strong>ANALYZE</strong> for a safe, instant plan preview. Turn it
                  on when you need real timings.
                </li>
              </ul>
            </section>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
