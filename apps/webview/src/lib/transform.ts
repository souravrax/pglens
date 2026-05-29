import dagre from 'dagre'
import { type Node, type Edge, MarkerType } from 'reactflow'
import type { Schema, Table } from 'api'

export type { Schema, Table } from 'api'

export type TableNodeData = {
  table: Table
  foreignKeys: {
    column: string
    targetTable: string
    targetColumn: string
  }[]
}

const NODE_WIDTH = 280
const HEADER_HEIGHT = 44
const ROW_HEIGHT = 28
const FOOTER_PADDING = 12

function getNodeHeight(table: Table): number {
  return HEADER_HEIGHT + table.columns.length * ROW_HEIGHT + FOOTER_PADDING
}

export function schemaToGraph(schema: Schema): {
  nodes: Node<TableNodeData>[]
  edges: Edge[]
} {
  const fkByTable = new Map<string, { column: string; targetTable: string; targetColumn: string }[]>()
  for (const rel of schema.relations) {
    if (!fkByTable.has(rel.fromTable)) fkByTable.set(rel.fromTable, [])
    fkByTable.get(rel.fromTable)!.push({
      column: rel.fromColumn,
      targetTable: rel.toTable,
      targetColumn: rel.toColumn,
    })
  }

  const nodes: Node<TableNodeData>[] = schema.tables.map((table) => ({
    id: table.name,
    type: 'table',
    position: { x: 0, y: 0 },
    data: {
      table,
      foreignKeys: fkByTable.get(table.name) ?? [],
    },
    width: NODE_WIDTH,
    height: getNodeHeight(table),
  }))

  const edges: Edge[] = schema.relations.map((rel) => ({
    id: `${rel.fromTable}.${rel.fromColumn}->${rel.toTable}.${rel.toColumn}`,
    source: rel.fromTable,
    target: rel.toTable,
    type: 'default',
    animated: false,
    style: { stroke: 'var(--color-border)', strokeWidth: 1.5 },
    markerEnd: {
      type: MarkerType.ArrowClosed,
      color: 'var(--color-border)',
    },
  }))

  return { nodes, edges }
}

export function applyDagreLayout(
  nodes: Node<TableNodeData>[],
  edges: Edge[]
): Node<TableNodeData>[] {
  const g = new dagre.graphlib.Graph()
  g.setGraph({
    rankdir: 'LR',
    nodesep: 100,
    ranksep: 200,
    marginx: 80,
    marginy: 80,
  })
  g.setDefaultEdgeLabel(() => ({}))

  for (const node of nodes) {
    g.setNode(node.id, {
      width: node.width ?? NODE_WIDTH,
      height: node.height ?? 200,
    })
  }

  for (const edge of edges) {
    g.setEdge(edge.source, edge.target)
  }

  dagre.layout(g)

  return nodes.map((node) => {
    const layouted = g.node(node.id)
    return {
      ...node,
      position: {
        x: layouted.x - (layouted.width / 2),
        y: layouted.y - (layouted.height / 2),
      },
    }
  })
}
