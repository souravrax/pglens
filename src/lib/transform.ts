import ELK from 'elkjs/lib/elk.bundled.js'
import type { Schema } from './extract'
import type { Node, Edge } from 'reactflow'

const NODE_WIDTH = 280
const HEADER_HEIGHT = 44
const ROW_HEIGHT = 28
const FOOTER_PADDING = 12

export type TableNodeData = {
  table: Schema['tables'][number]
  foreignKeys: {
    column: string
    targetTable: string
    targetColumn: string
  }[]
}

function getNodeHeight(table: Schema['tables'][number]): number {
  return HEADER_HEIGHT + table.columns.length * ROW_HEIGHT + FOOTER_PADDING
}

export function schemaToGraph(schema: Schema): {
  nodes: Node<TableNodeData>[]
  edges: Edge[]
} {
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
    style: { stroke: '#4a4a6a', strokeWidth: 1.5 },
    markerEnd: 'arrowclosed',
  }))

  return { nodes, edges }
}

const elk = new ELK()

export async function applyElkLayout(
  nodes: Node<TableNodeData>[],
  edges: Edge[],
): Promise<Node<TableNodeData>[]> {
  const graph = {
    id: 'root',
    layoutOptions: {
      'elk.algorithm': 'layered',
      'elk.direction': 'RIGHT',
      'elk.layered.spacing.nodeNodeBetweenLayers': '200',
      'elk.layered.spacing.nodeNode': '100',
      'elk.spacing.nodeNode': '100',
      'elk.spacing.componentComponent': '120',
      'elk.layered.nodePlacement.strategy': 'NETWORK_SIMPLEX',
      'elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP',
      'elk.layered.considerModelOrder.strategy': 'NODES_AND_EDGES',
      'elk.layered.edgeRouting': 'SPLINES',
      'elk.edgeRouting': 'SPLINES',
      'elk.layered.unnecessaryBendpoints': 'true',
      'elk.layered.wrapping.strategy': 'OFF',
      'elk.separateConnectedComponents': 'true',
      'elk.padding': '[top=80,left=80,bottom=80,right=80]',
    },
    children: nodes.map((n) => ({
      id: n.id,
      width: n.width ?? NODE_WIDTH,
      height: n.height ?? 200,
    })),
    edges: edges.map((e) => ({
      id: e.id,
      sources: [e.source],
      targets: [e.target],
    })),
  }

  const layouted = await elk.layout(graph)
  const posMap = new Map((layouted.children ?? []).map((c) => [c.id, { x: c.x!, y: c.y! }]))

  return nodes.map((n) => ({
    ...n,
    position: posMap.get(n.id) ?? { x: 0, y: 0 },
  }))
}
