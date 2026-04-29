'use client'

import { useMemo, useEffect, useCallback, useState } from 'react'
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
import ExplainNode from './ExplainNode'
import { planToGraph, applyExplainElkLayout, type ExplainNodeData } from '@/lib/explain-transform'

import { X, Activity, Maximize2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

const DEFAULT_EDGE = 'oklch(0.556 0 0 / 40%)'
const DIMMED_OPACITY = 0.1

export type ExplainResult = {
  plan: Record<string, unknown>
  planningTime: number | null
  executionTime: number | null
  settings: Record<string, string> | null
}

function FlowGraph({ result }: { result: ExplainResult }) {
  const nodeTypes = useMemo(() => ({ explainNode: ExplainNode }), [])
  const edgeTypes = useMemo(() => ({}), [])
  const fitViewOptions = useMemo(() => ({ padding: 0.15 }), [])

  const { fitView } = useReactFlow()

  const [selected, setSelected] = useState<string | null>(null)

  const { nodes: rawNodes, edges: rawEdges } = useMemo(() => {
    if (!result?.plan) return { nodes: [], edges: [] }
    return planToGraph(result.plan)
  }, [result])

  const [nodes, setNodes, onNodesChange] = useNodesState<ExplainNodeData>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const [layoutReady, setLayoutReady] = useState(false)

  // Layout effect
  useEffect(() => {
    if (!rawNodes.length) return
    setLayoutReady(false)
    applyExplainElkLayout(rawNodes, rawEdges).then((layouted) => {
      setNodes(layouted)
      setEdges(rawEdges)
      setLayoutReady(true)
      requestAnimationFrame(() => fitView({ padding: 0.15, duration: 300 }))
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawNodes, rawEdges])

  // Highlight effect (no infinite loop — rawEdges is stable)
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

    const connectedNodeIds = new Set<string>([selected])

    for (const e of rawEdges) {
      if (e.source === selected || e.target === selected) {
        connectedNodeIds.add(e.source)
        connectedNodeIds.add(e.target)
      }
    }

    for (const e of rawEdges) {
      if (connectedNodeIds.has(e.source) && connectedNodeIds.has(e.target)) {
        connectedNodeIds.add(e.source)
        connectedNodeIds.add(e.target)
      }
    }

    setEdges((eds) =>
      eds.map((e) => {
        const isDirect = e.source === selected || e.target === selected
        const isNeighbor = connectedNodeIds.has(e.source) && connectedNodeIds.has(e.target)
        if (isDirect || isNeighbor) {
          return {
            ...e,
            style: { ...e.style, opacity: 1, strokeWidth: 2.5 },
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

  const handleNodeClick = useCallback((_: unknown, node: { id: string }) => {
    setSelected((prev) => (prev === node.id ? null : node.id))
  }, [])

  const handlePaneClick = useCallback(() => {
    setSelected(null)
  }, [])

  const handleFitView = useCallback(() => {
    setSelected(null)
    fitView({ padding: 0.15, duration: 400 })
  }, [fitView])

  const selectedNode = useMemo(
    () => (selected ? (nodes.find((n) => n.id === selected) ?? null) : null),
    [selected, nodes],
  )

  const minimapNodeColor = useCallback(
    (miniNode: { id: string }) => {
      if (!selected) return 'oklch(0.556 0 0 / 30%)'
      if (miniNode.id === selected) return 'var(--primary)'
      const isConnected = rawEdges.some(
        (e) =>
          (e.source === selected && e.target === miniNode.id) ||
          (e.target === selected && e.source === miniNode.id),
      )
      return isConnected ? 'var(--primary)' : 'oklch(0.269 0 0)'
    },
    [selected, rawEdges],
  )

  if (!result?.plan) return null

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
            className="w-3 h-3 border"
            style={{
              background: 'var(--node-scan-bg)',
              borderColor: 'var(--node-scan-border)',
            }}
          />
          <span className="text-muted-foreground">Scan</span>
        </div>
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 border"
            style={{
              background: 'var(--node-join-bg)',
              borderColor: 'var(--node-join-border)',
            }}
          />
          <span className="text-muted-foreground">Join</span>
        </div>
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 border"
            style={{
              background: 'var(--node-sort-bg)',
              borderColor: 'var(--node-sort-border)',
            }}
          />
          <span className="text-muted-foreground">Sort/Agg</span>
        </div>
      </div>

      {/* Selected node info panel */}
      {selectedNode && (
        <div className="absolute top-4 right-4 w-80 max-h-[calc(100%-80px)] flex flex-col rounded-xl border bg-card/95 backdrop-blur-xl shadow-2xl z-20 overflow-hidden animate-in fade-in slide-in-from-right-4">
          <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/20 shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <Activity className="w-4 h-4 text-muted-foreground shrink-0" />
              <span className="text-sm font-bold tracking-tight text-foreground truncate max-w-[180px]">
                {selectedNode.data.label}
              </span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-md shrink-0"
              onClick={() => setSelected(null)}
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto min-h-0 scrollbar-thin scrollbar-thumb-muted-foreground/20">
            <div className="px-4 py-4 space-y-4">
              {/* Cost */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-md p-2 bg-muted/30">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground block mb-1">
                    Startup Cost
                  </span>
                  <span className="font-mono font-bold">
                    {selectedNode.data.cost.startup.toFixed(2)}
                  </span>
                </div>
                <div className="rounded-md p-2 bg-muted/30">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground block mb-1">
                    Total Cost
                  </span>
                  <span className="font-mono font-bold">
                    {selectedNode.data.cost.total.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Actual */}
              {selectedNode.data.actual && (
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-md p-2 bg-muted/30">
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground block mb-1">
                      Actual Time
                    </span>
                    <span className="font-mono font-bold">
                      {selectedNode.data.actual.startup.toFixed(2)}..
                      {selectedNode.data.actual.total.toFixed(2)}ms
                    </span>
                  </div>
                  <div className="rounded-md p-2 bg-muted/30">
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground block mb-1">
                      Actual Rows
                    </span>
                    <span className="font-mono font-bold">
                      {selectedNode.data.actual.rows.toLocaleString()} x{' '}
                      {selectedNode.data.actual.loops}
                    </span>
                  </div>
                </div>
              )}

              {/* Planned */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                {selectedNode.data.plannedRows !== undefined && (
                  <div className="rounded-md p-2 bg-muted/30">
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground block mb-1">
                      Planned Rows
                    </span>
                    <span className="font-mono font-bold">
                      {selectedNode.data.plannedRows.toLocaleString()}
                    </span>
                  </div>
                )}
                {selectedNode.data.width !== undefined && (
                  <div className="rounded-md p-2 bg-muted/30">
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground block mb-1">
                      Width
                    </span>
                    <span className="font-mono font-bold">{selectedNode.data.width} bytes</span>
                  </div>
                )}
              </div>

              {/* Buffers */}
              {selectedNode.data.buffers && (
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block mb-2">
                    Buffers
                  </span>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {selectedNode.data.buffers.sharedHit !== undefined && (
                      <div className="rounded-md p-2 bg-muted/30">
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground block mb-1">
                          Shared Hit
                        </span>
                        <span className="font-mono font-bold">
                          {selectedNode.data.buffers.sharedHit.toLocaleString()}
                        </span>
                      </div>
                    )}
                    {selectedNode.data.buffers.sharedRead !== undefined && (
                      <div className="rounded-md p-2 bg-muted/30">
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground block mb-1">
                          Shared Read
                        </span>
                        <span className="font-mono font-bold">
                          {selectedNode.data.buffers.sharedRead.toLocaleString()}
                        </span>
                      </div>
                    )}
                    {selectedNode.data.buffers.tempRead !== undefined && (
                      <div className="rounded-md p-2 bg-muted/30">
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground block mb-1">
                          Temp Read
                        </span>
                        <span className="font-mono font-bold">
                          {selectedNode.data.buffers.tempRead.toLocaleString()}
                        </span>
                      </div>
                    )}
                    {selectedNode.data.buffers.tempWritten !== undefined && (
                      <div className="rounded-md p-2 bg-muted/30">
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground block mb-1">
                          Temp Written
                        </span>
                        <span className="font-mono font-bold">
                          {selectedNode.data.buffers.tempWritten.toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Condition */}
              {selectedNode.data.condition && (
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block mb-2">
                    Condition
                  </span>
                  <pre className="text-[11px] font-mono bg-muted/30 p-3 rounded-md overflow-x-auto whitespace-pre-wrap break-all text-foreground/80">
                    {selectedNode.data.condition}
                  </pre>
                </div>
              )}

              {/* Output */}
              {selectedNode.data.output && selectedNode.data.output.length > 0 && (
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block mb-2">
                    Output
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {selectedNode.data.output.map((col) => (
                      <Badge
                        key={col}
                        variant="secondary"
                        className="text-[10px] font-mono"
                      >
                        {col}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Full JSON */}
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block mb-2">
                  Full Plan JSON
                </span>
                <pre className="text-[10px] font-mono bg-muted/30 p-3 rounded-md overflow-x-auto whitespace-pre-wrap break-all text-foreground/60 max-h-[200px]">
                  {JSON.stringify(selectedNode.data.full, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function ExplainGraph({ result }: { result: ExplainResult }) {
  return (
    <ReactFlowProvider>
      <FlowGraph result={result} />
    </ReactFlowProvider>
  )
}
