'use client'

import { useEffect, useMemo } from 'react'
import type { Schema } from '@/lib/extract'
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  ReactFlowProvider,
  useNodesState,
  useEdgesState,
  BackgroundVariant,
  type Node,
  type Edge,
} from 'reactflow'
import 'reactflow/dist/style.css'
import TableNode from '@/components/TableNode'

export default function SchemaPreview({ schema }: { schema: Schema | null }) {
  const { nodes, edges } = useMemo(() => {
    if (!schema) return { nodes: [], edges: [] }

    const NODE_WIDTH = 280
    const HEADER_HEIGHT = 44
    const ROW_HEIGHT = 28
    const FOOTER_PADDING = 12

    function getNodeHeight(table: Schema['tables'][number]): number {
      return HEADER_HEIGHT + table.columns.length * ROW_HEIGHT + FOOTER_PADDING
    }

    const fkByTable = new Map<
      string,
      { column: string; targetTable: string; targetColumn: string }[]
    >()
    for (const rel of schema.relations) {
      if (!fkByTable.has(rel.fromTable)) fkByTable.set(rel.fromTable, [])
      fkByTable.get(rel.fromTable)!.push({
        column: rel.fromColumn,
        targetTable: rel.toTable,
        targetColumn: rel.toColumn,
      })
    }

    const nodes: Node[] = schema.tables.map((table, i) => ({
      id: table.name,
      type: 'table',
      position: { x: (i % 4) * 320, y: Math.floor(i / 4) * 250 },
      data: {
        table,
        foreignKeys: fkByTable.get(table.name) ?? [],
      },
      width: NODE_WIDTH,
      height: getNodeHeight(table),
    }))

    const edges: Edge[] = schema.relations.map((rel) => ({
      id: rel.constraintName,
      source: rel.fromTable,
      target: rel.toTable,
      type: 'default',
      animated: false,
      style: { stroke: '#4a4a6a', strokeWidth: 1.5 },
      markerEnd: 'arrowclosed',
    }))

    return { nodes, edges }
  }, [schema])

  if (!schema || schema.tables.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        {schema ? 'No tables in schema' : 'Run cells to see schema'}
      </div>
    )
  }

  return (
    <div className="w-full h-full relative bg-background overflow-hidden">
      <PlaygroundSchemaGraph
        nodes={nodes}
        edges={edges}
      />
    </div>
  )
}

function Flow({ nodes: initialNodes, edges: initialEdges }: { nodes: Node[]; edges: Edge[] }) {
  const nodeTypes = useMemo(() => ({ table: TableNode }), [])
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)

  useEffect(() => {
    setNodes(initialNodes)
    setEdges(initialEdges)
  }, [initialNodes, initialEdges, setNodes, setEdges])

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      nodeTypes={nodeTypes}
      fitView
      fitViewOptions={{ padding: 0.15 }}
      minZoom={0.05}
      maxZoom={2}
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
        maskColor="rgba(0,0,0,0.4)"
        className="bg-card! border-border! rounded-lg! overflow-hidden"
      />
    </ReactFlow>
  )
}

function PlaygroundSchemaGraph({ nodes, edges }: { nodes: Node[]; edges: Edge[] }) {
  return (
    <ReactFlowProvider>
      <Flow
        nodes={nodes}
        edges={edges}
      />
    </ReactFlowProvider>
  )
}
