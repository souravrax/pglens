'use client'

import { useMemo, useEffect, useCallback, useState, useRef } from 'react'
import { useStore } from 'zustand'
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  ReactFlowProvider,
  useNodesState,
  useEdgesState,
  useReactFlow,
  type NodeTypes,
} from 'reactflow'
import 'reactflow/dist/style.css'
import TableNode from './TableNode'
import { schemaStore } from '@/lib/store'
import { schemaToGraph, applyElkLayout, type TableNodeData } from '@/lib/transform'
import { X, Key, Link, ArrowRight, Hash, List } from 'lucide-react'

const nodeTypes: NodeTypes = {
  table: TableNode,
}

const OUTGOING_COLOR = '#22d3ee'
const INCOMING_COLOR = '#f472b6'
const BOTH_COLOR = '#a78bfa'
const DEFAULT_EDGE = '#4a4a6a'
const DIMMED_OPACITY = 0.12

function FlowGraph() {
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
          return { ...e, style: { stroke: OUTGOING_COLOR, opacity: 1, strokeWidth: 2.5 } }
        }
        if (e.target === selected) {
          return { ...e, style: { stroke: INCOMING_COLOR, opacity: 1, strokeWidth: 2.5 } }
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

  // Stable minimap color function — avoids re-creating on every render
  const minimapNodeColor = useRef<(node: { id: string }) => string>(() => '#4a4a6a')
  minimapNodeColor.current = (node: { id: string }) => {
    if (!selected) return '#4a4a6a'
    if (!schema) return '#4a4a6a'
    if (node.id === selected) return BOTH_COLOR
    const isOut = schema.relations.some((r) => r.fromTable === selected && r.toTable === node.id)
    const isIn = schema.relations.some((r) => r.toTable === selected && r.fromTable === node.id)
    if (isOut && isIn) return BOTH_COLOR
    if (isOut) return OUTGOING_COLOR
    if (isIn) return INCOMING_COLOR
    return '#1e1e2e'
  }

  if (!schema) return null

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={(_, node) => setSelectedTable(node.id)}
        onPaneClick={() => setSelectedTable(null)}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.15 }}
        minZoom={0.05}
        maxZoom={2}
        onlyRenderVisibleElements
        elevateNodesOnSelect={false}
        attributionPosition="bottom-right"
      >
        <Background
          color="#1e1e2e"
          gap={32}
          size={1}
        />
        <Controls showInteractive={false} />
        <MiniMap
          nodeColor={(node) => minimapNodeColor.current(node)}
          maskColor="rgba(0,0,0,0.8)"
          style={{ opacity: 0.8 }}
        />
      </ReactFlow>

      {/* Reset / Fit View button */}
      <button
        onClick={handleFitView}
        className="absolute bottom-4 right-4 flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-mono cursor-pointer transition-opacity hover:opacity-100"
        style={{
          background: 'rgba(14,14,18,0.9)',
          border: '1px solid #2a2a35',
          color: '#7c7c8a',
          backdropFilter: 'blur(8px)',
          opacity: 0.7,
        }}
        title="Reset view"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
          <path d="M3 3v5h5" />
        </svg>
        Fit View
      </button>

      {/* Legend */}
      {selected && (
        <div
          className="absolute bottom-4 left-4 flex gap-4 text-[11px] font-mono px-4 py-2.5 rounded-lg"
          style={{
            background: 'rgba(14,14,18,0.92)',
            border: '1px solid #2a2a35',
            backdropFilter: 'blur(8px)',
          }}
        >
          <span style={{ color: OUTGOING_COLOR }}>● Outgoing (FK refs)</span>
          <span style={{ color: INCOMING_COLOR }}>● Incoming (referenced by)</span>
          <span style={{ color: BOTH_COLOR }}>● Both</span>
        </div>
      )}

      {/* Selected table info panel */}
      {selectedTable && (
        <div
          className="absolute top-4 right-4 w-[320px] max-h-[calc(100%-80px)] overflow-y-auto rounded-xl font-mono"
          style={{
            background: 'rgba(14,14,18,0.95)',
            border: '1px solid #2a2a35',
            backdropFilter: 'blur(12px)',
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-4 py-3"
            style={{ borderBottom: '1px solid #2a2a35' }}
          >
            <div className="flex items-center gap-2">
              <span
                className="text-sm font-bold"
                style={{ color: '#e2e2e8' }}
              >
                {selectedTable.name}
              </span>
              <span
                className="text-[10px] px-1.5 py-0.5 rounded-full"
                style={{ background: '#2a2a35', color: '#7c7c8a' }}
              >
                {selectedTable.columns.length} cols
              </span>
            </div>
            <button
              onClick={() => setSelectedTable(null)}
              className="p-1 rounded transition-colors hover:bg-white/10 cursor-pointer"
              style={{ color: '#7c7c8a' }}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Primary keys */}
          {selectedTable.primaryKeys.length > 0 && (
            <div
              className="px-4 py-2.5"
              style={{ borderBottom: '1px solid #2a2a35' }}
            >
              <div className="flex items-center gap-1.5 mb-1.5">
                <Key
                  className="w-3 h-3"
                  style={{ color: '#f59e0b' }}
                />
                <span
                  className="text-[10px] font-bold uppercase tracking-wider"
                  style={{ color: '#f59e0b' }}
                >
                  Primary Key
                </span>
              </div>
              <div className="flex flex-wrap gap-1">
                {selectedTable.primaryKeys.map((pk) => (
                  <span
                    key={pk}
                    className="text-[11px] px-2 py-0.5 rounded"
                    style={{ background: 'rgba(245,158,11,0.1)', color: '#fbbf24' }}
                  >
                    {pk}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Indexes */}
          {selectedTable.indexes.length > 0 && (
            <div
              className="px-4 py-2.5"
              style={{ borderBottom: '1px solid #2a2a35' }}
            >
              <div className="flex items-center gap-1.5 mb-1.5">
                <Hash
                  className="w-3 h-3"
                  style={{ color: '#818cf8' }}
                />
                <span
                  className="text-[10px] font-bold uppercase tracking-wider"
                  style={{ color: '#818cf8' }}
                >
                  Indexes ({selectedTable.indexes.length})
                </span>
              </div>
              <div className="flex flex-col gap-1">
                {selectedTable.indexes.map((idx) => (
                  <div
                    key={idx.name}
                    className="flex items-center gap-2"
                  >
                    <span
                      className="text-[10px] px-1.5 py-0.5 rounded"
                      style={{
                        background: idx.unique ? 'rgba(34,197,94,0.1)' : 'rgba(99,102,241,0.1)',
                        color: idx.unique ? '#4ade80' : '#818cf8',
                      }}
                    >
                      {idx.unique ? 'UNIQUE' : 'IDX'}
                    </span>
                    <span
                      className="text-[11px] truncate"
                      style={{ color: '#a5b4fc' }}
                    >
                      ({idx.columns.join(', ')})
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Outgoing FKs */}
          {outgoingRels.length > 0 && (
            <div
              className="px-4 py-2.5"
              style={{ borderBottom: '1px solid #2a2a35' }}
            >
              <div className="flex items-center gap-1.5 mb-1.5">
                <ArrowRight
                  className="w-3 h-3"
                  style={{ color: OUTGOING_COLOR }}
                />
                <span
                  className="text-[10px] font-bold uppercase tracking-wider"
                  style={{ color: OUTGOING_COLOR }}
                >
                  Outgoing FKs ({outgoingRels.length})
                </span>
              </div>
              <div className="flex flex-col gap-1">
                {outgoingRels.map((rel) => (
                  <div
                    key={rel.constraintName}
                    className="flex items-center gap-1.5 text-[11px]"
                  >
                    <span style={{ color: '#e2e2e8' }}>{rel.fromColumn}</span>
                    <span style={{ color: '#555' }}>→</span>
                    <span style={{ color: '#a5b4fc' }}>
                      {rel.toTable}.{rel.toColumn}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Incoming FKs */}
          {incomingRels.length > 0 && (
            <div
              className="px-4 py-2.5"
              style={{ borderBottom: '1px solid #2a2a35' }}
            >
              <div className="flex items-center gap-1.5 mb-1.5">
                <Link
                  className="w-3 h-3"
                  style={{ color: INCOMING_COLOR }}
                />
                <span
                  className="text-[10px] font-bold uppercase tracking-wider"
                  style={{ color: INCOMING_COLOR }}
                >
                  Referenced by ({incomingRels.length})
                </span>
              </div>
              <div className="flex flex-col gap-1">
                {incomingRels.map((rel) => (
                  <div
                    key={rel.constraintName}
                    className="flex items-center gap-1.5 text-[11px]"
                  >
                    <span style={{ color: '#a5b4fc' }}>
                      {rel.fromTable}.{rel.fromColumn}
                    </span>
                    <span style={{ color: '#555' }}>→</span>
                    <span style={{ color: '#e2e2e8' }}>{rel.toColumn}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Columns */}
          <div className="px-4 py-2.5">
            <div className="flex items-center gap-1.5 mb-2">
              <List
                className="w-3 h-3"
                style={{ color: '#7c7c8a' }}
              />
              <span
                className="text-[10px] font-bold uppercase tracking-wider"
                style={{ color: '#7c7c8a' }}
              >
                Columns
              </span>
            </div>
            <div className="flex flex-col gap-0.5">
              {selectedTable.columns.map((col) => {
                const isPK = selectedTable.primaryKeys.includes(col.name)
                const fkRel = schema.relations.find(
                  (r) => r.fromTable === selectedTable.name && r.fromColumn === col.name,
                )
                const isIdx = selectedTable.indexes.some((idx) => idx.columns.includes(col.name))

                return (
                  <div
                    key={col.name}
                    className="flex items-center gap-2 py-1 px-2 rounded text-[11px]"
                    style={{
                      background: isPK
                        ? 'rgba(245,158,11,0.06)'
                        : fkRel
                          ? 'rgba(99,102,241,0.06)'
                          : 'transparent',
                    }}
                  >
                    <span className="w-5 text-center flex-shrink-0">
                      {isPK ? (
                        <span style={{ color: '#f59e0b', fontSize: 9 }}>PK</span>
                      ) : fkRel ? (
                        <span style={{ color: '#818cf8', fontSize: 9 }}>FK</span>
                      ) : null}
                    </span>
                    <span
                      className="flex-1 truncate"
                      style={{
                        color: isPK ? '#f59e0b' : fkRel ? '#a5b4fc' : '#e2e2e8',
                        fontWeight: isPK || fkRel ? 600 : 400,
                      }}
                    >
                      {col.name}
                    </span>
                    <span style={{ color: '#555', fontSize: 10 }}>{col.type}</span>
                    {col.nullable && (
                      <span
                        className="text-[9px] px-1 rounded"
                        style={{ background: '#2a2a35', color: '#7c7c8a' }}
                      >
                        null
                      </span>
                    )}
                    {isIdx && !isPK && (
                      <span
                        className="text-[9px] px-1 rounded"
                        style={{ background: 'rgba(99,102,241,0.15)', color: '#818cf8' }}
                      >
                        idx
                      </span>
                    )}
                  </div>
                )
              })}
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
