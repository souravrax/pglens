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
import TableNode from './TableNode'
import { schemaStore } from '@/lib/store'
import { schemaToGraph, applyElkLayout, type TableNodeData } from '@/lib/transform'

import { X, Key, Link, ArrowRight, Hash, List, Maximize2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

const OUTGOING_COLOR = 'oklch(0.707 0.165 254.624)' // cyan-400
const INCOMING_COLOR = 'oklch(0.704 0.191 22.216)' // pink-400
const BOTH_COLOR = 'var(--primary)'
const DEFAULT_EDGE = 'oklch(0.556 0 0 / 40%)'
const DIMMED_OPACITY = 0.1

function FlowGraph() {
  const nodeTypes = useMemo(
    () => ({
      table: TableNode,
    }),
    [],
  )

  const edgeTypes = useMemo(() => ({}), [])

  const fitViewOptions = useMemo(() => ({ padding: 0.15 }), [])

  const { fitView } = useReactFlow()
  const schema = useStore(schemaStore, (s) => s.schema)
  const selected = useStore(schemaStore, (s) => s.selectedTable)
  const setSelectedTable = useStore(schemaStore, (s) => s.setSelectedTable)

  const { nodes: rawNodes, edges: rawEdges } = useMemo(
    () => (schema ? schemaToGraph(schema) : { nodes: [], edges: [] }),
    [schema],
  )

  const [nodes, setNodes, onNodesChange] = useNodesState<TableNodeData>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState(rawEdges)
  const [layoutReady, setLayoutReady] = useState(false)

  // Layout effect — runs on schema change
  useEffect(() => {
    if (!rawNodes.length) return
    setLayoutReady(false)
    applyElkLayout(rawNodes, rawEdges).then((layouted) => {
      setNodes(layouted)
      setEdges(rawEdges)
      setLayoutReady(true)
      requestAnimationFrame(() => fitView({ padding: 0.15, duration: 300 }))
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawNodes, rawEdges])

  // Edge highlight — nodes handle their own highlight via store subscription
  useEffect(() => {
    if (!layoutReady || !schema) return

    if (!selected) {
      setEdges((eds) =>
        eds.map((e) => ({
          ...e,
          style: { stroke: DEFAULT_EDGE, opacity: 1, strokeWidth: 1.5 },
        })),
      )
      return
    }

    setEdges((eds) =>
      eds.map((e) => {
        if (e.source === selected) {
          return { ...e, style: { stroke: OUTGOING_COLOR, opacity: 1, strokeWidth: 3 } }
        }
        if (e.target === selected) {
          return { ...e, style: { stroke: INCOMING_COLOR, opacity: 1, strokeWidth: 3 } }
        }
        return { ...e, style: { stroke: DEFAULT_EDGE, opacity: DIMMED_OPACITY, strokeWidth: 1 } }
      }),
    )
  }, [selected, schema, layoutReady, setEdges])

  const handleFitView = useCallback(() => {
    setSelectedTable(null)
    fitView({ padding: 0.15, duration: 400 })
  }, [setSelectedTable, fitView])

  const selectedTable = useMemo(
    () => (selected && schema ? (schema.tables.find((t) => t.name === selected) ?? null) : null),
    [selected, schema],
  )
  const selectedRelations = useMemo(
    () =>
      selected && schema
        ? schema.relations.filter((r) => r.fromTable === selected || r.toTable === selected)
        : [],
    [selected, schema],
  )
  const outgoingRels = selectedRelations.filter((r) => r.fromTable === selected)
  const incomingRels = selectedRelations.filter((r) => r.toTable === selected)

  // Minimap color function
  const minimapNodeColor = useCallback(
    (node: { id: string }) => {
      if (!selected || !schema) return 'oklch(0.556 0 0 / 20%)'
      if (node.id === selected) return BOTH_COLOR
      const isOut = schema.relations.some((r) => r.fromTable === selected && r.toTable === node.id)
      const isIn = schema.relations.some((r) => r.toTable === selected && r.fromTable === node.id)
      if (isOut && isIn) return BOTH_COLOR
      if (isOut) return OUTGOING_COLOR
      if (isIn) return INCOMING_COLOR
      return 'oklch(0.269 0 0)'
    },
    [selected, schema],
  )

  if (!schema) return null

  return (
    <div className="w-full h-full relative bg-background overflow-hidden">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={(_, node) => setSelectedTable(node.id)}
        onPaneClick={() => setSelectedTable(null)}
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
      {selected && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-5 px-4 py-2.5 rounded-full border bg-card/90 backdrop-blur shadow-xl text-[10px] font-bold uppercase tracking-wider z-10 transition-all animate-in fade-in slide-in-from-bottom-2">
          <div className="flex items-center gap-2">
            <Badge
              className="w-2 h-2 rounded-full p-0 border-0"
              style={{ background: OUTGOING_COLOR }}
            />
            <span className="text-muted-foreground">Outgoing</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              className="w-2 h-2 rounded-full p-0 border-0"
              style={{ background: INCOMING_COLOR }}
            />
            <span className="text-muted-foreground">Incoming</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              variant="default"
              className="w-2 h-2 rounded-full p-0 border-0 bg-primary"
            />
            <span className="text-muted-foreground font-bold">Both</span>
          </div>
        </div>
      )}

      {/* Selected table info panel */}
      {selectedTable && (
        <div className="absolute top-4 right-4 w-80 max-h-[calc(100%-80px)] flex flex-col rounded-xl border bg-card/95 backdrop-blur-xl shadow-2xl z-20 overflow-hidden animate-in fade-in slide-in-from-right-4">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/20 shrink-0">
            <div className="flex items-center gap-2.5">
              <span className="text-sm font-bold tracking-tight text-foreground truncate max-w-[180px]">
                {selectedTable.name}
              </span>
              <Badge
                variant="outline"
                className="bg-background/50"
              >
                {selectedTable.columns.length}
              </Badge>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-md"
              onClick={() => setSelectedTable(null)}
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto min-h-0 scrollbar-thin scrollbar-thumb-muted-foreground/20">
            <div className="flex flex-col">
              {/* Primary keys */}
              {selectedTable.primaryKeys.length > 0 && (
                <div className="px-4 py-3 border-b">
                  <div className="flex items-center gap-2 mb-2 text-amber-500">
                    <Key className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">
                      Primary Keys
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedTable.primaryKeys.map((pk, idx) => (
                      <Badge
                        key={`${selectedTable.name}-${pk}-${idx}`}
                        className="font-mono"
                      >
                        {pk}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Indexes */}
              {selectedTable.indexes.length > 0 && (
                <div className="px-4 py-3 border-b">
                  <div className="flex items-center gap-2 mb-2 text-primary">
                    <Hash className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">
                      Indexes ({selectedTable.indexes.length})
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    {selectedTable.indexes.map((idx) => (
                      <div
                        key={idx.name}
                        className="flex items-center gap-2 text-xs"
                      >
                        <Badge variant={idx.unique ? 'default' : 'secondary'}>
                          {idx.unique ? 'Unique' : 'Idx'}
                        </Badge>
                        <span className="text-muted-foreground font-mono truncate">
                          ({idx.columns.join(', ')})
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Relations */}
              {(outgoingRels.length > 0 || incomingRels.length > 0) && (
                <div className="px-4 py-3 border-b bg-muted/10">
                  <div className="flex items-center gap-2 mb-3">
                    <Link className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                      Relations
                    </span>
                  </div>

                  <div className="space-y-4">
                    {outgoingRels.length > 0 && (
                      <div className="space-y-1.5">
                        <div className="text-[9px] font-bold text-cyan-500 uppercase flex items-center gap-1.5 mb-1">
                          <ArrowRight className="w-2.5 h-2.5" /> Outgoing
                        </div>
                        {outgoingRels.map((rel) => (
                          <div
                            key={rel.constraintName}
                            className="flex flex-col gap-0.5 rounded-md p-1.5 bg-background border border-border/50"
                          >
                            <div className="text-[10px] font-mono font-bold text-foreground flex items-center gap-1.5">
                              {rel.fromColumn}{' '}
                              <span className="text-muted-foreground font-normal">→</span>
                            </div>
                            <div className="text-[10px] font-mono text-primary truncate pl-4">
                              {rel.toTable}.{rel.toColumn}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {incomingRels.length > 0 && (
                      <div className="space-y-1.5">
                        <div className="text-[9px] font-bold text-pink-500 uppercase flex items-center gap-1.5 mb-1">
                          <Link className="w-2.5 h-2.5" /> Incoming
                        </div>
                        {incomingRels.map((rel) => (
                          <div
                            key={rel.constraintName}
                            className="flex flex-col gap-0.5 rounded-md p-1.5 bg-background border border-border/50"
                          >
                            <div className="text-[10px] font-mono text-primary truncate flex items-center gap-1.5">
                              {rel.fromTable}.{rel.fromColumn}{' '}
                              <span className="text-muted-foreground font-normal">→</span>
                            </div>
                            <div className="text-[10px] font-mono font-bold text-foreground pl-4">
                              {rel.toColumn}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* All Columns List */}
              <div className="px-4 py-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <List className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                      Columns
                    </span>
                  </div>
                </div>

                <div className="space-y-1 font-mono">
                  {selectedTable.columns.map((col) => {
                    const isPK = selectedTable.primaryKeys.includes(col.name)
                    const fkRel = schema.relations.find(
                      (r) => r.fromTable === selectedTable.name && r.fromColumn === col.name,
                    )
                    const isIdx = selectedTable.indexes.some((idx) =>
                      idx.columns.includes(col.name),
                    )

                    return (
                      <div
                        key={col.name}
                        className={cn(
                          'flex items-center gap-2.5 py-1.5 px-2 rounded-md group transition-colors',
                          isPK ? 'bg-amber-500/5' : fkRel ? 'bg-primary/5' : 'hover:bg-muted/50',
                        )}
                      >
                        <div className="w-5 flex justify-center shrink-0">
                          {isPK ? (
                            <span className="text-[9px] font-bold text-amber-500">PK</span>
                          ) : fkRel ? (
                            <span className="text-[9px] font-bold text-primary">FK</span>
                          ) : null}
                        </div>
                        <span
                          className={cn(
                            'text-[11px] flex-1 truncate',
                            isPK
                              ? 'text-amber-500 font-bold'
                              : fkRel
                                ? 'text-primary font-bold'
                                : 'text-foreground/80 font-medium',
                          )}
                        >
                          {col.name}
                        </span>
                        <span className="text-[10px] text-muted-foreground/40 italic">
                          {col.type}
                        </span>
                        {col.nullable && (
                          <span className="text-[8px] px-1 rounded bg-muted text-muted-foreground/50 uppercase font-bold">
                            null
                          </span>
                        )}
                        {isIdx && !isPK && (
                          <span className="text-[8px] px-1 rounded bg-primary/10 text-primary uppercase font-bold">
                            idx
                          </span>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function SchemaGraph() {
  return (
    <ReactFlowProvider>
      <FlowGraph />
    </ReactFlowProvider>
  )
}
