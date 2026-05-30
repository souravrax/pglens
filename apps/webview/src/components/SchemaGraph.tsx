import { useMemo, useEffect, useCallback, useState, createContext, useContext } from 'react'
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  ReactFlowProvider,
  useNodesState,
  useEdgesState,
  useReactFlow,
  BackgroundVariant,
  MarkerType,
} from 'reactflow'
import type { Node } from 'reactflow'
import 'reactflow/dist/style.css'
import TableNode from './TableNode'
import TableDetails from './TableDetails'
import { schemaToGraph, applyDagreLayout, type TableNodeData, type Schema } from '@/lib/transform'

import {
  PkIcon,
  FkIcon,
  IdentityIcon,
  UniqueIcon,
  IndexedIcon,
  NullableIcon,
} from '@/lib/columnIcons'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu'

const OUTGOING_COLOR = 'oklch(0.707 0.165 254.624)'
const INCOMING_COLOR = 'oklch(0.704 0.191 22.216)'
const BOTH_COLOR = 'var(--primary)'
const DEFAULT_EDGE = 'oklch(0.556 0 0 / 40%)'
const DIMMED_OPACITY = 0.05

const SelectedTableContext = createContext<string | null>(null)

export function useSelectedTable() {
  return useContext(SelectedTableContext)
}

function FlowGraph({ schema, externalSelectedTable, onTableSelect }: { schema: Schema; externalSelectedTable?: string | null; onTableSelect?: (name: string) => void }) {
  const nodeTypes = useMemo(() => ({ table: TableNode }), [])
  const edgeTypes = useMemo(() => ({}), [])
  const fitViewOptions = useMemo(() => ({ padding: 0.15 }), [])

  const { fitView } = useReactFlow()
  const [selectedTable, setSelectedTable] = useState<string | null>(externalSelectedTable ?? null)
  const [error, setError] = useState<string | null>(null)

  // Sync external selection from extension
  useEffect(() => {
    if (externalSelectedTable !== undefined) {
      setSelectedTable(externalSelectedTable)
    }
  }, [externalSelectedTable])

  const { nodes: rawNodes, edges: rawEdges } = useMemo(() => {
    const result = schemaToGraph(schema)
    console.log('[pglens graph] raw nodes:', result.nodes.length, 'edges:', result.edges.length)
    return result
  }, [schema])

  const [nodes, setNodes, onNodesChange] = useNodesState<TableNodeData>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState(rawEdges)
  const [layoutReady, setLayoutReady] = useState(false)

  useEffect(() => {
    console.log('[pglens graph] layout effect triggered, rawNodes:', rawNodes.length)
    if (!rawNodes.length) {
      setLayoutReady(true)
      return
    }
    setLayoutReady(false)
    setError(null)

    try {
      const layouted = applyDagreLayout(rawNodes, rawEdges)
      console.log('[pglens graph] dagre layouted nodes:', layouted.length, 'first node pos:', layouted[0]?.position)
      setNodes(layouted)
      setEdges(rawEdges)
      setLayoutReady(true)
      requestAnimationFrame(() => fitView({ padding: 0.15, duration: 300 }))
    } catch (err) {
      console.error('[pglens graph] Dagre layout failed:', err)
      setError('Layout failed, using fallback grid')
      const cols = Math.ceil(Math.sqrt(rawNodes.length))
      const gridNodes = rawNodes.map((n, i) => ({
        ...n,
        position: {
          x: (i % cols) * 320,
          y: Math.floor(i / cols) * (n.height! + 60),
        },
      }))
      setNodes(gridNodes)
      setEdges(rawEdges)
      setLayoutReady(true)
      requestAnimationFrame(() => fitView({ padding: 0.15, duration: 300 }))
    }
  }, [rawNodes, rawEdges, fitView, setNodes, setEdges])

  useEffect(() => {
    if (!layoutReady || !schema) return
    if (!selectedTable) {
      setEdges((eds) =>
        eds.map((e) => ({
          ...e,
          style: { stroke: DEFAULT_EDGE, opacity: 1, strokeWidth: 1.5 },
          animated: false,
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: 'var(--color-border)',
          },
        }))
      )
      return
    }
    setEdges((eds) =>
      eds.map((e) => {
        if (e.source === selectedTable) {
          return {
            ...e, style: { stroke: OUTGOING_COLOR, opacity: 1, strokeWidth: 1.5 }, animated: true, markerEnd: {
              type: MarkerType.ArrowClosed,
              color: OUTGOING_COLOR,
            },
          }
        }
        if (e.target === selectedTable) {
          return {
            ...e, style: { stroke: INCOMING_COLOR, opacity: 1, strokeWidth: 1.5 }, animated: true, markerEnd: {
              type: MarkerType.ArrowClosed,
              color: INCOMING_COLOR,
            },
          }
        }
        return { ...e, style: { stroke: DEFAULT_EDGE, opacity: DIMMED_OPACITY, strokeWidth: 1 } }
      })
    )
  }, [selectedTable, schema, layoutReady, setEdges])

  const selectedTableData = useMemo(
    () => (selectedTable && schema ? (schema.tables.find((t) => t.name === selectedTable) ?? null) : null),
    [selectedTable, schema]
  )

  const minimapNodeColor = useCallback(
    (node: { id: string }) => {
      if (!selectedTable || !schema) return 'oklch(0.556 0 0 / 20%)'
      if (node.id === selectedTable) return BOTH_COLOR
      const isOut = schema.relations.some((r) => r.fromTable === selectedTable && r.toTable === node.id)
      const isIn = schema.relations.some((r) => r.toTable === selectedTable && r.fromTable === node.id)
      if (isOut && isIn) return BOTH_COLOR
      if (isOut) return OUTGOING_COLOR
      if (isIn) return INCOMING_COLOR
      return 'oklch(0.269 0 0)'
    },
    [selectedTable, schema]
  )

  const handleNodeClick = useCallback((_: React.MouseEvent, node: Node<TableNodeData>) => {
    setSelectedTable(node.id)
    onTableSelect?.(node.id)
  }, [onTableSelect])

  if (!schema) return null

  return (
    <SelectedTableContext.Provider value={selectedTable}>
      <div className="w-full h-full relative bg-background overflow-hidden">
        {error && (
          <div className="absolute top-10 left-1/2 -translate-x-1/2 z-30 px-3 py-1.5 rounded-full bg-destructive/10 border border-destructive/20 text-destructive text-xs">
            {error}
          </div>
        )}

        <ContextMenu>
          <ContextMenuTrigger asChild>
            <div className="w-full h-full">
              <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onNodeClick={handleNodeClick}
                onPaneClick={() => setSelectedTable(null)}
                nodeTypes={nodeTypes}
                edgeTypes={edgeTypes}
                fitView
                fitViewOptions={fitViewOptions}
                minZoom={0.2}
                maxZoom={2}
                elevateNodesOnSelect={false}
                attributionPosition="bottom-right"
              >
                <Background variant={BackgroundVariant.Dots} color="var(--color-foreground)" gap={32} size={1} />
                <Controls position='top-left' showInteractive={false} className="bg-card! border-border! fill-foreground! shadow-none" />
                <MiniMap
                  nodeColor={minimapNodeColor}
                  maskColor="rgba(0, 0, 0, 0.03)"
                  className="bg-card! border-border! rounded-lg! overflow-hidden"
                  position='top-right'
                />
              </ReactFlow>
            </div>
          </ContextMenuTrigger>
          <ContextMenuContent className="w-48">
            <ContextMenuItem onSelect={() => fitView({ padding: 0.15, duration: 300 })}>
              Fit View
            </ContextMenuItem>
            <ContextMenuItem onSelect={() => setSelectedTable(null)}>
              Reset Selection
            </ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem onSelect={() => window.location.reload()}>
              Reload
            </ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>

        {selectedTableData && (
          <TableDetails
            table={selectedTableData}
            schema={schema}
            onClose={() => setSelectedTable(null)}
          />
        )}

        <div id="column-type-information" className="absolute bottom-0 left-0 right-0 w-full h-10 bg-background/50 backdrop-blur-sm flex items-center justify-center gap-6 text-[10px] text-muted-foreground border-t border-border/30 z-10">
          <div className="flex items-center gap-1.5">
            <PkIcon className="w-3 h-3" />
            <span>Primary Key</span>
          </div>
          <div className="flex items-center gap-1.5">
            <FkIcon className="w-3 h-3" />
            <span>Foreign Key</span>
          </div>
          <div className="flex items-center gap-1.5">
            <IdentityIcon className="w-3 h-3" />
            <span>Identity</span>
          </div>
          <div className="flex items-center gap-1.5">
            <UniqueIcon className="w-3 h-3" />
            <span>Unique</span>
          </div>
          <div className="flex items-center gap-1.5">
            <NullableIcon className="w-3 h-3" fill="none" />
            <span>Nullable</span>
          </div>
          <div className="flex items-center gap-1.5">
            <NullableIcon className="w-3 h-3" fill="currentColor" />
            <span>Non-Nullable</span>
          </div>
          <div className="flex items-center gap-1.5">
            <IndexedIcon className="w-3 h-3" />
            <span>Indexed</span>
          </div>
        </div>
      </div>
    </SelectedTableContext.Provider>
  )
}

export default function SchemaGraph({ schema, selectedTable, onTableSelect }: { schema: Schema; selectedTable?: string | null; onTableSelect?: (name: string) => void }) {
  return (
    <ReactFlowProvider>
      <FlowGraph schema={schema} externalSelectedTable={selectedTable} onTableSelect={onTableSelect} />
    </ReactFlowProvider>
  )
}
