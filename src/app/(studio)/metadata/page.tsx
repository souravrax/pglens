'use client'

import { useEffect, useState } from 'react'
import { useStore } from 'zustand'
import { schemaStore } from '@/lib/store'
import type { Metadata, Trigger, Function as PgFunction } from '@/lib/extract'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Loader2 } from 'lucide-react'

type CodePanelState =
  | { type: 'trigger'; item: Trigger }
  | { type: 'function'; item: PgFunction }
  | null

export default function MetadataPage() {
  const selectedSchema = useStore(schemaStore, (s) => s.selectedSchema)
  const [metadata, setMetadata] = useState<Metadata | null>(null)
  const [metadataSchema, setMetadataSchema] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [codePanel, setCodePanel] = useState<CodePanelState>(null)

  const loading = metadataSchema !== selectedSchema

  useEffect(() => {
    const controller = new AbortController()
    fetch(`/api/metadata?schema=${encodeURIComponent(selectedSchema)}`, {
      signal: controller.signal,
    })
      .then(async (res) => {
        if (!res.ok) {
          const err = await res.json()
          throw new Error(err.error || 'Failed to fetch metadata')
        }
        return res.json()
      })
      .then((data) => {
        setError(null)
        setMetadata(data)
        setMetadataSchema(selectedSchema)
      })
      .catch((err) => {
        if (err.name !== 'AbortError') setError(err.message)
      })
    return () => controller.abort()
  }, [selectedSchema])

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm">Loading metadata...</span>
      </div>
    )
  }

  if (error) {
    return <div className="p-6 text-sm text-destructive font-mono">{error}</div>
  }

  if (!metadata) return null

  const hasAnyData =
    metadata.triggers.length > 0 ||
    metadata.functions.length > 0 ||
    metadata.views.length > 0 ||
    metadata.materializedViews.length > 0 ||
    metadata.sequences.length > 0 ||
    metadata.enums.length > 0 ||
    metadata.extensions.length > 0 ||
    metadata.constraints.length > 0 ||
    metadata.tableSizes.length > 0 ||
    metadata.rlsPolicies.length > 0 ||
    metadata.grants.length > 0

  return (
    <div className="flex h-full flex-col">
      <div className="border-b px-4 py-3">
        <h2 className="text-sm font-semibold">Database Metadata</h2>
        <p className="text-xs text-muted-foreground">
          Schema: <span className="font-mono">{selectedSchema}</span>
        </p>
      </div>

      {!hasAnyData ? (
        <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
          No metadata found for this schema
        </div>
      ) : (
        <Tabs
          defaultValue={
            metadata.triggers.length > 0
              ? 'triggers'
              : metadata.functions.length > 0
                ? 'functions'
                : 'triggers'
          }
          className="flex flex-1 flex-col"
        >
          <div className="border-b px-4">
            <TabsList variant="line">
              {metadata.triggers.length > 0 && (
                <TabsTrigger value="triggers">
                  Triggers
                  <Badge
                    variant="secondary"
                    className="ml-1 h-4 px-1 text-[10px]"
                  >
                    {metadata.triggers.length}
                  </Badge>
                </TabsTrigger>
              )}
              {metadata.functions.length > 0 && (
                <TabsTrigger value="functions">
                  Functions
                  <Badge
                    variant="secondary"
                    className="ml-1 h-4 px-1 text-[10px]"
                  >
                    {metadata.functions.length}
                  </Badge>
                </TabsTrigger>
              )}
              {metadata.views.length > 0 && (
                <TabsTrigger value="views">
                  Views
                  <Badge
                    variant="secondary"
                    className="ml-1 h-4 px-1 text-[10px]"
                  >
                    {metadata.views.length}
                  </Badge>
                </TabsTrigger>
              )}
              {metadata.materializedViews.length > 0 && (
                <TabsTrigger value="matviews">
                  Mat. Views
                  <Badge
                    variant="secondary"
                    className="ml-1 h-4 px-1 text-[10px]"
                  >
                    {metadata.materializedViews.length}
                  </Badge>
                </TabsTrigger>
              )}
              {metadata.sequences.length > 0 && (
                <TabsTrigger value="sequences">
                  Sequences
                  <Badge
                    variant="secondary"
                    className="ml-1 h-4 px-1 text-[10px]"
                  >
                    {metadata.sequences.length}
                  </Badge>
                </TabsTrigger>
              )}
              {metadata.enums.length > 0 && (
                <TabsTrigger value="enums">
                  Enums
                  <Badge
                    variant="secondary"
                    className="ml-1 h-4 px-1 text-[10px]"
                  >
                    {metadata.enums.length}
                  </Badge>
                </TabsTrigger>
              )}
              {metadata.extensions.length > 0 && (
                <TabsTrigger value="extensions">
                  Extensions
                  <Badge
                    variant="secondary"
                    className="ml-1 h-4 px-1 text-[10px]"
                  >
                    {metadata.extensions.length}
                  </Badge>
                </TabsTrigger>
              )}
              {metadata.constraints.length > 0 && (
                <TabsTrigger value="constraints">
                  Constraints
                  <Badge
                    variant="secondary"
                    className="ml-1 h-4 px-1 text-[10px]"
                  >
                    {metadata.constraints.length}
                  </Badge>
                </TabsTrigger>
              )}
              {metadata.rlsPolicies.length > 0 && (
                <TabsTrigger value="policies">
                  RLS Policies
                  <Badge
                    variant="secondary"
                    className="ml-1 h-4 px-1 text-[10px]"
                  >
                    {metadata.rlsPolicies.length}
                  </Badge>
                </TabsTrigger>
              )}
              {metadata.grants.length > 0 && (
                <TabsTrigger value="grants">
                  Grants
                  <Badge
                    variant="secondary"
                    className="ml-1 h-4 px-1 text-[10px]"
                  >
                    {metadata.grants.length}
                  </Badge>
                </TabsTrigger>
              )}
              {metadata.tableSizes.length > 0 && (
                <TabsTrigger value="sizes">
                  Table Sizes
                  <Badge
                    variant="secondary"
                    className="ml-1 h-4 px-1 text-[10px]"
                  >
                    {metadata.tableSizes.length}
                  </Badge>
                </TabsTrigger>
              )}
            </TabsList>
          </div>

          {/* Triggers */}
          <TabsContent
            value="triggers"
            className="flex-1 overflow-auto"
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Table</TableHead>
                  <TableHead>Event</TableHead>
                  <TableHead>Timing</TableHead>
                  <TableHead>Function</TableHead>
                  <TableHead>Enabled</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {metadata.triggers.map((t) => (
                  <TableRow
                    key={t.name}
                    className="cursor-pointer"
                    onClick={() => setCodePanel({ type: 'trigger', item: t })}
                  >
                    <TableCell className="font-mono">{t.name}</TableCell>
                    <TableCell className="font-mono">{t.table}</TableCell>
                    <TableCell>{t.event}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{t.timing}</Badge>
                    </TableCell>
                    <TableCell className="font-mono">{t.function}</TableCell>
                    <TableCell>
                      <Badge variant={t.enabled ? 'default' : 'secondary'}>
                        {t.enabled ? 'Yes' : 'No'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TabsContent>

          {/* Functions */}
          <TabsContent
            value="functions"
            className="flex-1 overflow-auto"
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Arguments</TableHead>
                  <TableHead>Returns</TableHead>
                  <TableHead>Language</TableHead>
                  <TableHead>Security</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {metadata.functions.map((f) => (
                  <TableRow
                    key={f.name}
                    className="cursor-pointer"
                    onClick={() => setCodePanel({ type: 'function', item: f })}
                  >
                    <TableCell className="font-mono">{f.name}</TableCell>
                    <TableCell className="font-mono text-muted-foreground">
                      {f.arguments || <span className="italic">none</span>}
                    </TableCell>
                    <TableCell className="font-mono">{f.returnType}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{f.language}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={f.securityType === 'DEFINER' ? 'secondary' : 'ghost'}>
                        {f.securityType}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TabsContent>

          {/* Views */}
          <TabsContent
            value="views"
            className="flex-1 overflow-auto"
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[200px]">Name</TableHead>
                  <TableHead>Definition</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {metadata.views.map((v) => (
                  <TableRow key={v.name}>
                    <TableCell className="font-mono">{v.name}</TableCell>
                    <TableCell>
                      <pre className="whitespace-pre-wrap font-mono text-[11px] text-muted-foreground">
                        {v.definition}
                      </pre>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TabsContent>

          {/* Materialized Views */}
          <TabsContent
            value="matviews"
            className="flex-1 overflow-auto"
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[200px]">Name</TableHead>
                  <TableHead>Has Indexes</TableHead>
                  <TableHead>Definition</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {metadata.materializedViews.map((v) => (
                  <TableRow key={v.name}>
                    <TableCell className="font-mono">{v.name}</TableCell>
                    <TableCell>
                      <Badge variant={v.hasIndexes ? 'default' : 'secondary'}>
                        {v.hasIndexes ? 'Yes' : 'No'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <pre className="whitespace-pre-wrap font-mono text-[11px] text-muted-foreground">
                        {v.definition}
                      </pre>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TabsContent>

          {/* Sequences */}
          <TabsContent
            value="sequences"
            className="flex-1 overflow-auto"
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Data Type</TableHead>
                  <TableHead>Start</TableHead>
                  <TableHead>Min</TableHead>
                  <TableHead>Max</TableHead>
                  <TableHead>Increment</TableHead>
                  <TableHead>Owned By</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {metadata.sequences.map((s) => (
                  <TableRow key={s.name}>
                    <TableCell className="font-mono">{s.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{s.dataType}</Badge>
                    </TableCell>
                    <TableCell className="font-mono">{s.startValue}</TableCell>
                    <TableCell className="font-mono text-muted-foreground">{s.minValue}</TableCell>
                    <TableCell className="font-mono text-muted-foreground">{s.maxValue}</TableCell>
                    <TableCell className="font-mono">{s.increment}</TableCell>
                    <TableCell className="font-mono">
                      {s.ownedBy ?? <span className="italic text-muted-foreground">none</span>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TabsContent>

          {/* Enums */}
          <TabsContent
            value="enums"
            className="flex-1 overflow-auto"
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[200px]">Name</TableHead>
                  <TableHead>Labels</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {metadata.enums.map((e) => (
                  <TableRow key={e.name}>
                    <TableCell className="font-mono">{e.name}</TableCell>
                    <TableCell className="flex flex-wrap gap-1">
                      {e.labels.map((label) => (
                        <Badge
                          key={label}
                          variant="outline"
                        >
                          {label}
                        </Badge>
                      ))}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TabsContent>

          {/* Extensions */}
          <TabsContent
            value="extensions"
            className="flex-1 overflow-auto"
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Version</TableHead>
                  <TableHead>Schema</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {metadata.extensions.map((e) => (
                  <TableRow key={e.name}>
                    <TableCell className="font-mono">{e.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{e.version}</Badge>
                    </TableCell>
                    <TableCell className="font-mono text-muted-foreground">{e.schema}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TabsContent>

          {/* Constraints */}
          <TabsContent
            value="constraints"
            className="flex-1 overflow-auto"
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Table</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Definition</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {metadata.constraints.map((c) => (
                  <TableRow key={`${c.table}.${c.name}`}>
                    <TableCell className="font-mono">{c.name}</TableCell>
                    <TableCell className="font-mono">{c.table}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          c.type === 'PRIMARY KEY'
                            ? 'default'
                            : c.type === 'FOREIGN KEY'
                              ? 'secondary'
                              : c.type === 'UNIQUE'
                                ? 'outline'
                                : 'ghost'
                        }
                      >
                        {c.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-muted-foreground">
                      {c.definition}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TabsContent>

          {/* RLS Policies */}
          {metadata.rlsPolicies.length > 0 && (
            <TabsContent
              value="policies"
              className="flex-1 overflow-auto"
            >
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Table</TableHead>
                    <TableHead>Command</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Roles</TableHead>
                    <TableHead>Using</TableHead>
                    <TableHead>With Check</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {metadata.rlsPolicies.map((p) => (
                    <TableRow key={`${p.table}.${p.name}`}>
                      <TableCell className="font-mono">{p.name}</TableCell>
                      <TableCell className="font-mono">{p.table}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{p.command}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={p.permissive === 'PERMISSIVE' ? 'secondary' : 'ghost'}>
                          {p.permissive}
                        </Badge>
                      </TableCell>
                      <TableCell className="flex flex-wrap gap-1">
                        {p.roles.map((role) => (
                          <Badge
                            key={role}
                            variant="outline"
                            className="font-mono text-[10px]"
                          >
                            {role}
                          </Badge>
                        ))}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground max-w-[200px] truncate">
                        {p.usingExpr || <span className="italic">none</span>}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground max-w-[200px] truncate">
                        {p.checkExpr || <span className="italic">none</span>}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TabsContent>
          )}

          {/* Grants */}
          {metadata.grants.length > 0 && (
            <TabsContent
              value="grants"
              className="flex-1 overflow-auto"
            >
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Table</TableHead>
                    <TableHead>Grantee</TableHead>
                    <TableHead>Privilege</TableHead>
                    <TableHead>Grantable</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {metadata.grants.map((g, i) => (
                    <TableRow key={`${g.table}.${g.grantee}.${g.privilegeType}-${i}`}>
                      <TableCell className="font-mono">{g.table}</TableCell>
                      <TableCell className="font-mono">{g.grantee}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{g.privilegeType}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={g.isGrantable ? 'default' : 'secondary'}>
                          {g.isGrantable ? 'Yes' : 'No'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TabsContent>
          )}

          {/* Table Sizes */}
          <TabsContent
            value="sizes"
            className="flex-1 overflow-auto"
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Table</TableHead>
                  <TableHead>Total Size</TableHead>
                  <TableHead>Index Size</TableHead>
                  <TableHead>Toast Size</TableHead>
                  <TableHead className="text-right">Rows</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {metadata.tableSizes.map((t) => (
                  <TableRow key={t.name}>
                    <TableCell className="font-mono">{t.name}</TableCell>
                    <TableCell className="font-mono">{t.totalSize}</TableCell>
                    <TableCell className="font-mono text-muted-foreground">{t.indexSize}</TableCell>
                    <TableCell className="font-mono text-muted-foreground">{t.toastSize}</TableCell>
                    <TableCell className="text-right font-mono tabular-nums">
                      {t.rowCount.toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TabsContent>
        </Tabs>
      )}

      {/* Code viewer dialog */}
      <Dialog
        open={codePanel !== null}
        onOpenChange={(open) => !open && setCodePanel(null)}
      >
        <DialogContent className="sm:max-w-xl max-h-[80vh] overflow-y-auto">
          {codePanel && (
            <>
              <DialogHeader>
                <DialogTitle className="font-mono">{codePanel.item.name}</DialogTitle>
                <DialogDescription>
                  {codePanel.type === 'trigger' ? (
                    <span>
                      Trigger on{' '}
                      <span className="font-mono">{(codePanel.item as Trigger).table}</span>
                      {' · '}
                      {(codePanel.item as Trigger).event}
                      {' · '}
                      {(codePanel.item as Trigger).timing}
                    </span>
                  ) : (
                    <span>
                      Function &middot;{' '}
                      <span className="font-mono">{(codePanel.item as PgFunction).language}</span>
                      {' · '}
                      {(codePanel.item as PgFunction).returnType}
                    </span>
                  )}
                </DialogDescription>
              </DialogHeader>

              {codePanel.type === 'trigger' &&
                (() => {
                  const fn = metadata.functions.find(
                    (f) => f.name === (codePanel.item as Trigger).function,
                  )
                  return fn ? (
                    <button
                      className="flex items-center gap-2 rounded-md border px-3 py-2 text-left text-xs hover:bg-accent transition-colors"
                      onClick={() => setCodePanel({ type: 'function', item: fn })}
                    >
                      <span className="text-muted-foreground">Executes:</span>
                      <span className="font-mono font-medium">{fn.name}</span>
                      <span className="text-muted-foreground">
                        ({fn.language} &middot; returns {fn.returnType})
                      </span>
                    </button>
                  ) : null
                })()}

              {codePanel.type === 'function' &&
                (() => {
                  const dependents = metadata.triggers.filter(
                    (t) => t.function === (codePanel.item as PgFunction).name,
                  )
                  return dependents.length > 0 ? (
                    <div className="space-y-1">
                      <span className="text-xs text-muted-foreground">
                        Called by {dependents.length === 1 ? 'trigger' : 'triggers'}:
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {dependents.map((t) => (
                          <button
                            key={t.name}
                            className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-mono hover:bg-accent transition-colors"
                            onClick={() => setCodePanel({ type: 'trigger', item: t })}
                          >
                            {t.name}
                            <span className="text-muted-foreground font-normal">({t.table})</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null
                })()}

              <pre className="whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-foreground bg-muted rounded-md p-3 overflow-x-auto">
                {codePanel.item.body}
              </pre>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
