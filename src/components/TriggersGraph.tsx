'use client'

import { useMemo, useEffect, useCallback, useState } from 'react'
import { useStore } from 'zustand'
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  ReactFlowProvider,
  useNodesState,
  useEdgesState,
  useReactFlow,
  BackgroundVariant,
} from 'reactflow'
import 'reactflow/dist/style.css'
import TriggerFunctionNode from './TriggerFunctionNode'
import { schemaStore } from '@/lib/store'
import {
  metadataToGraph,
  applyTriggerElkLayout,
  type TriggerNodeData,
} from '@/lib/trigger-transform'
import { secureFetch } from '@/lib/api-client'
import type { Metadata, Trigger, Function as PgFunction } from '@/lib/extract'

import { X, Zap, Table, AlertCircle, Maximize2, Braces } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

const OUTGOING_COLOR = 'var(--node-trigger-border)'
const INCOMING_COLOR = 'var(--node-function-border)'
const DEFAULT_EDGE = 'oklch(0.556 0 0 / 40%)'
const DIMMED_OPACITY = 0.1

type SelectedNode =
  | { type: 'table'; id: string }
  | { type: 'trigger'; id: string }
  | { type: 'function'; id: string }

function FlowGraph() {
  const nodeTypes = useMemo(() => ({ triggerNode: TriggerFunctionNode }), [])
  const edgeTypes = useMemo(() => ({}), [])
  const fitViewOptions = useMemo(() => ({ padding: 0.15 }), [])

  const { fitView } = useReactFlow()
  const schema = useStore(schemaStore, (s) => s.schema)
  const selectedTableFromStore = useStore(schemaStore, (s) => s.selectedTable)
  const setSelectedTable = useStore(schemaStore, (s) => s.setSelectedTable)
  const activeDatabase = useStore(schemaStore, (s) => s.activeDatabase)
  const selectedSchema = useStore(schemaStore, (s) => s.selectedSchema)

  const [metadata, setMetadata] = useState<Metadata | null>(null)
  const [metadataSchema, setMetadataSchema] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<SelectedNode | null>(null)

  const loading = metadataSchema !== selectedSchema

  // Fetch metadata
  useEffect(() => {
    if (!activeDatabase) return
    const controller = new AbortController()
    secureFetch(`/api/metadata?schema=${encodeURIComponent(selectedSchema)}`, activeDatabase.url, {
      signal: controller.signal,
    })
      .then(async (res) => {
        if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          throw new Error(err.error || 'Failed to fetch metadata')
        }
        return res.json()
      })
      .then((data: Metadata) => {
        setError(null)
        setMetadata(data)
        setMetadataSchema(selectedSchema)
      })
      .catch((err) => {
        if (err.name !== 'AbortError') setError(err.message)
      })
    return () => controller.abort()
  }, [selectedSchema, activeDatabase])

  // Sync sidebar table selection into graph selection
  useEffect(() => {
    if (selectedTableFromStore) {
      setSelected({ type: 'table', id: `table-${selectedTableFromStore}` })
    } else {
      setSelected(null)
    }
  }, [selectedTableFromStore])

  const { nodes: rawNodes, edges: rawEdges } = useMemo(() => {
    if (!schema || !metadata) return { nodes: [], edges: [] }
    return metadataToGraph(schema, metadata.triggers, metadata.functions)
  }, [schema, metadata])

  const [nodes, setNodes, onNodesChange] = useNodesState<TriggerNodeData>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const [layoutReady, setLayoutReady] = useState(false)

  // Layout effect
  useEffect(() => {
    if (!rawNodes.length) return
    setLayoutReady(false)
    applyTriggerElkLayout(rawNodes, rawEdges).then((layouted) => {
      setNodes(layouted)
      setEdges(rawEdges)
      setLayoutReady(true)
      requestAnimationFrame(() => fitView({ padding: 0.15, duration: 300 }))
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawNodes, rawEdges])

  // Highlight effect
  useEffect(() => {
    if (!layoutReady) return

    if (!selected) {
      setEdges((eds) =>
        eds.map((e) => ({
          ...e,
          style: { ...e.style, opacity: 1, strokeWidth: 1.5 },
        })),
      )
      setNodes((nds) =>
        nds.map((n) => ({
          ...n,
          style: { ...n.style, opacity: 1 },
        })),
      )
      return
    }

    const selectedId = selected.id
    const connectedNodeIds = new Set<string>([selectedId])

    // Use rawEdges for topology (stable reference) instead of mutable edges state
    for (const e of rawEdges) {
      if (e.source === selectedId || e.target === selectedId) {
        connectedNodeIds.add(e.source)
        connectedNodeIds.add(e.target)
      }
    }

    // Second-degree connections
    for (const e of rawEdges) {
      if (connectedNodeIds.has(e.source) && connectedNodeIds.has(e.target)) {
        connectedNodeIds.add(e.source)
        connectedNodeIds.add(e.target)
      }
    }

    setEdges((eds) =>
      eds.map((e) => {
        const isDirect = e.source === selectedId || e.target === selectedId
        const isNeighbor = connectedNodeIds.has(e.source) && connectedNodeIds.has(e.target)
        if (isDirect || isNeighbor) {
          const isOut = e.source === selectedId
          const isIn = e.target === selectedId
          const color = isOut ? OUTGOING_COLOR : isIn ? INCOMING_COLOR : DEFAULT_EDGE
          return {
            ...e,
            style: { ...e.style, stroke: color, opacity: 1, strokeWidth: 2.5 },
          }
        }
        return {
          ...e,
          style: {
            ...e.style,
            opacity: DIMMED_OPACITY,
            strokeWidth: 1,
          },
        }
      }),
    )

    setNodes((nds) =>
      nds.map((n) => ({
        ...n,
        style: {
          ...n.style,
          opacity: connectedNodeIds.has(n.id) ? 1 : 0.15,
        },
      })),
    )
  }, [selected, layoutReady, setEdges, setNodes, rawEdges])

  const handleNodeClick = useCallback(
    (_: unknown, node: { id: string; data: TriggerNodeData }) => {
      const type = node.data.type
      if (type === 'table') {
        const tableName = node.data.name
        setSelectedTable(tableName)
        setSelected({ type: 'table', id: node.id })
      } else if (type === 'trigger') {
        setSelectedTable(null)
        setSelected({ type: 'trigger', id: node.id })
      } else if (type === 'function') {
        setSelectedTable(null)
        setSelected({ type: 'function', id: node.id })
      }
    },
    [setSelectedTable],
  )

  const handlePaneClick = useCallback(() => {
    setSelectedTable(null)
    setSelected(null)
  }, [setSelectedTable])

  const handleFitView = useCallback(() => {
    setSelected(null)
    setSelectedTable(null)
    fitView({ padding: 0.15, duration: 400 })
  }, [setSelectedTable, fitView])

  // Selected data for panel
  const selectedTrigger = useMemo(() => {
    if (selected?.type !== 'trigger' || !metadata) return null
    return metadata.triggers.find((t) => `trigger-${t.name}` === selected.id) ?? null
  }, [selected, metadata])

  const selectedFunction = useMemo(() => {
    if (selected?.type !== 'function' || !metadata) return null
    return metadata.functions.find((f) => `function-${f.name}` === selected.id) ?? null
  }, [selected, metadata])

  const selectedTableData = useMemo(() => {
    if (selected?.type !== 'table' || !schema) return null
    return schema.tables.find((t) => `table-${t.name}` === selected.id) ?? null
  }, [selected, schema])

  const selectedTableTriggers = useMemo(() => {
    if (!selectedTableData || !metadata) return []
    return metadata.triggers.filter((t) => t.table === selectedTableData.name)
  }, [selectedTableData, metadata])

  const minimapNodeColor = useCallback(
    (miniNode: { id: string }) => {
      const node = nodes.find((n) => n.id === miniNode.id)
      if (!selected) {
        if (node?.data.type === 'table') return 'oklch(0.556 0 0 / 30%)'
        if (node?.data.type === 'trigger') return 'var(--node-trigger-border)'
        return 'var(--node-function-border)'
      }
      if (miniNode.id === selected.id) return 'var(--primary)'
      const isConnected = edges.some(
        (e) =>
          (e.source === selected.id && e.target === miniNode.id) ||
          (e.target === selected.id && e.source === miniNode.id),
      )
      return isConnected ? 'var(--primary)' : 'oklch(0.269 0 0)'
    },
    [selected, edges, nodes],
  )

  if (!schema) return null

  if (loading) {
    return (
      <div className="w-full h-full flex items-center justify-center gap-2 text-muted-foreground">
        <Zap className="h-4 w-4 animate-pulse" />
        <span className="text-sm">Loading triggers &amp; functions...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="w-full h-full flex items-center justify-center text-destructive gap-2">
        <AlertCircle className="w-5 h-5" />
        <span className="text-sm">{error}</span>
      </div>
    )
  }

  return (
    <div className="w-full h-full relative bg-background overflow-hidden">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={handleNodeClick}
        onPaneClick={handlePaneClick}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        fitViewOptions={fitViewOptions}
        minZoom={0.05}
        maxZoom={2}
        onlyRenderVisibleElements
        elevateNodesOnSelect={false}
        attributionPosition="bottom-right"
      >
        <Background
          variant={BackgroundVariant.Dots}
          color="var(--color-foreground)"
          gap={32}
          size={1}
        />
        <Controls
          showInteractive={false}
          className="bg-card! border-border! fill-foreground!"
        />
        <MiniMap
          nodeColor={minimapNodeColor}
          maskColor="rgba(0,0,0,0.4)"
          className="bg-card! border-border! rounded-lg! overflow-hidden"
        />
      </ReactFlow>

      {/* Action shortcuts */}
      <div className="absolute top-4 left-4 flex gap-2 z-10">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="secondary"
              size="icon"
              className="h-9 w-9 shadow-lg bg-card/80 backdrop-blur"
              onClick={handleFitView}
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>Fit View</p>
          </TooltipContent>
        </Tooltip>
      </div>

      {/* Legend */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-4 px-4 py-2.5 rounded-full border bg-card/90 backdrop-blur shadow-xl text-[10px] font-bold uppercase tracking-wider z-10">
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-sm border"
            style={{
              background: 'var(--node-table-bg)',
              borderColor: 'var(--node-table-border)',
            }}
          />
          <span className="text-muted-foreground">Table</span>
        </div>
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3"
            style={{
              background: 'var(--node-trigger-bg)',
              clipPath: 'polygon(25% 0, 75% 0, 100% 50%, 75% 100%, 25% 100%, 0% 50%)',
            }}
          />
          <span className="text-muted-foreground">Trigger</span>
        </div>
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full border"
            style={{
              background: 'var(--node-function-bg)',
              borderColor: 'var(--node-function-border)',
            }}
          />
          <span className="text-muted-foreground">Function</span>
        </div>
      </div>

      {/* Selected node info panel */}
      {selected && (
        <div className="absolute top-4 right-4 w-80 max-h-[calc(100%-80px)] flex flex-col rounded-xl border bg-card/95 backdrop-blur-xl shadow-2xl z-20 overflow-hidden animate-in fade-in slide-in-from-right-4">
          {/* TABLE PANEL */}
          {selectedTableData && (
            <>
              <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/20 shrink-0">
                <div className="flex items-center gap-2.5">
                  <Table className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-bold tracking-tight text-foreground truncate max-w-[180px]">
                    {selectedTableData.name}
                  </span>
                  <Badge
                    variant="outline"
                    className="bg-background/50"
                  >
                    {selectedTableData.columns.length}
                  </Badge>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 rounded-md"
                  onClick={() => {
                    setSelected(null)
                    setSelectedTable(null)
                  }}
                >
                  <X className="w-4 h-4 text-muted-foreground" />
                </Button>
              </div>
              <div className="flex-1 overflow-y-auto min-h-0 scrollbar-thin scrollbar-thumb-muted-foreground/20">
                {selectedTableTriggers.length > 0 ? (
                  <div className="px-4 py-4 space-y-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Zap className="w-3.5 h-3.5 text-[var(--node-trigger-border)]" />
                      <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                        Triggers ({selectedTableTriggers.length})
                      </span>
                    </div>
                    {selectedTableTriggers.map((trigger) => (
                      <button
                        key={trigger.name}
                        onClick={() =>
                          setSelected({
                            type: 'trigger',
                            id: `trigger-${trigger.name}`,
                          })
                        }
                        className={cn(
                          'w-full text-left rounded-md p-2.5 bg-background border border-border/50 transition-colors',
                          'hover:border-[var(--node-trigger-border)] hover:bg-[var(--node-trigger-bg)]/10',
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-foreground">{trigger.name}</span>
                          {!trigger.enabled && (
                            <Badge
                              variant="outline"
                              className="h-4 text-[8px]"
                            >
                              OFF
                            </Badge>
                          )}
                        </div>
                        <div className="text-[10px] font-mono text-muted-foreground mt-1">
                          {trigger.timing} {trigger.event} &rarr; {trigger.function}
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                    No triggers on this table
                  </div>
                )}
              </div>
            </>
          )}

          {/* TRIGGER PANEL */}
          {selectedTrigger && (
            <>
              <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/20 shrink-0">
                <div className="flex items-center gap-2.5">
                  <Zap className="w-4 h-4 text-[var(--node-trigger-border)]" />
                  <span className="text-sm font-bold tracking-tight text-foreground truncate max-w-[180px]">
                    {selectedTrigger.name}
                  </span>
                  {!selectedTrigger.enabled && (
                    <Badge
                      variant="outline"
                      className="bg-background/50"
                    >
                      OFF
                    </Badge>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 rounded-md"
                  onClick={() => {
                    setSelected(null)
                    setSelectedTable(null)
                  }}
                >
                  <X className="w-4 h-4 text-muted-foreground" />
                </Button>
              </div>
              <div className="flex-1 overflow-y-auto min-h-0 scrollbar-thin scrollbar-thumb-muted-foreground/20">
                <div className="px-4 py-4 space-y-4">
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-md p-2 bg-muted/30">
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground block mb-1">
                        Table
                      </span>
                      <button
                        onClick={() => {
                          setSelectedTable(selectedTrigger.table)
                          setSelected({
                            type: 'table',
                            id: `table-${selectedTrigger.table}`,
                          })
                        }}
                        className="font-mono font-bold text-primary hover:underline text-left"
                      >
                        {selectedTrigger.table}
                      </button>
                    </div>
                    <div className="rounded-md p-2 bg-muted/30">
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground block mb-1">
                        Timing
                      </span>
                      <span className="font-bold">{selectedTrigger.timing}</span>
                    </div>
                    <div className="rounded-md p-2 bg-muted/30">
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground block mb-1">
                        Event
                      </span>
                      <span className="font-bold">{selectedTrigger.event}</span>
                    </div>
                    <div className="rounded-md p-2 bg-muted/30">
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground block mb-1">
                        Function
                      </span>
                      <button
                        onClick={() =>
                          setSelected({
                            type: 'function',
                            id: `function-${selectedTrigger.function}`,
                          })
                        }
                        className="font-mono font-bold text-[var(--node-function-border)] hover:underline text-left"
                      >
                        {selectedTrigger.function}
                      </button>
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block mb-2">
                      Definition
                    </span>
                    <pre className="text-[11px] font-mono bg-muted/30 p-3 rounded-md overflow-x-auto whitespace-pre-wrap break-all text-foreground/80">
                      {selectedTrigger.body}
                    </pre>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* FUNCTION PANEL */}
          {selectedFunction && (
            <>
              <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/20 shrink-0">
                <div className="flex items-center gap-2.5">
                  <Braces className="w-4 h-4 text-[var(--node-function-border)]" />
                  <span className="text-sm font-bold tracking-tight text-foreground truncate max-w-[180px]">
                    {selectedFunction.name}
                  </span>
                  <Badge
                    variant="outline"
                    className="bg-background/50"
                  >
                    {selectedFunction.language}
                  </Badge>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 rounded-md"
                  onClick={() => {
                    setSelected(null)
                    setSelectedTable(null)
                  }}
                >
                  <X className="w-4 h-4 text-muted-foreground" />
                </Button>
              </div>
              <div className="flex-1 overflow-y-auto min-h-0 scrollbar-thin scrollbar-thumb-muted-foreground/20">
                <div className="px-4 py-4 space-y-4">
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-md p-2 bg-muted/30">
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground block mb-1">
                        Return Type
                      </span>
                      <span className="font-mono font-bold">{selectedFunction.returnType}</span>
                    </div>
                    <div className="rounded-md p-2 bg-muted/30">
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground block mb-1">
                        Security
                      </span>
                      <span className="font-bold">{selectedFunction.securityType}</span>
                    </div>
                  </div>

                  {selectedFunction.arguments && (
                    <div className="rounded-md p-2 bg-muted/30">
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground block mb-1">
                        Arguments
                      </span>
                      <span className="font-mono text-[11px] text-foreground/80">
                        {selectedFunction.arguments}
                      </span>
                    </div>
                  )}

                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block mb-2">
                      Definition
                    </span>
                    <pre className="text-[11px] font-mono bg-muted/30 p-3 rounded-md overflow-x-auto whitespace-pre-wrap break-all text-foreground/80">
                      {selectedFunction.body}
                    </pre>
                  </div>

                  {metadata &&
                    metadata.triggers.filter((t) => t.function === selectedFunction.name).length >
                      0 && (
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block mb-2">
                          Used By Triggers
                        </span>
                        <div className="space-y-1.5">
                          {metadata.triggers
                            .filter((t) => t.function === selectedFunction.name)
                            .map((trigger) => (
                              <button
                                key={trigger.name}
                                onClick={() =>
                                  setSelected({
                                    type: 'trigger',
                                    id: `trigger-${trigger.name}`,
                                  })
                                }
                                className={cn(
                                  'w-full text-left rounded-md p-2 bg-background border border-border/50 transition-colors',
                                  'hover:border-[var(--node-trigger-border)] hover:bg-[var(--node-trigger-bg)]/10',
                                  'flex items-center justify-between',
                                )}
                              >
                                <span className="text-xs font-bold">{trigger.name}</span>
                                <span className="text-[10px] font-mono text-muted-foreground">
                                  {trigger.table}
                                </span>
                              </button>
                            ))}
                        </div>
                      </div>
                    )}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

export default function TriggersGraph() {
  return (
    <ReactFlowProvider>
      <FlowGraph />
    </ReactFlowProvider>
  )
}
