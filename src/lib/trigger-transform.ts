import ELK from 'elkjs/lib/elk.bundled.js'
import type { Node, Edge } from 'reactflow'
import type { Schema, Trigger, Function as PgFunction } from './extract'

export type TriggerNodeData =
  | { type: 'table'; name: string; triggerCount: number }
  | { type: 'trigger'; trigger: Trigger; functionName: string }
  | { type: 'function'; fn: PgFunction; dependentTriggers: string[] }

const TABLE_NODE_WIDTH = 220
const TABLE_NODE_HEIGHT = 56
const TRIGGER_NODE_WIDTH = 200
const TRIGGER_NODE_HEIGHT = 52
const FUNCTION_NODE_WIDTH = 220
const FUNCTION_NODE_HEIGHT = 48

export function metadataToGraph(
  schema: Schema,
  triggers: Trigger[],
  functions: PgFunction[],
): { nodes: Node<TriggerNodeData>[]; edges: Edge[] } {
  const tablesWithTriggers = new Set(triggers.map((t) => t.table))
  const relevantTables = schema.tables.filter((t) => tablesWithTriggers.has(t.name))

  const tableNodes: Node<TriggerNodeData>[] = relevantTables.map((table) => ({
    id: `table-${table.name}`,
    type: 'triggerNode',
    position: { x: 0, y: 0 },
    data: {
      type: 'table',
      name: table.name,
      triggerCount: triggers.filter((t) => t.table === table.name).length,
    },
    width: TABLE_NODE_WIDTH,
    height: TABLE_NODE_HEIGHT,
  }))

  const triggerNodes: Node<TriggerNodeData>[] = triggers.map((trigger) => ({
    id: `trigger-${trigger.name}`,
    type: 'triggerNode',
    position: { x: 0, y: 0 },
    data: {
      type: 'trigger',
      trigger,
      functionName: trigger.function,
    },
    width: TRIGGER_NODE_WIDTH,
    height: TRIGGER_NODE_HEIGHT,
  }))

  const functionNodes: Node<TriggerNodeData>[] = functions.map((fn) => ({
    id: `function-${fn.name}`,
    type: 'triggerNode',
    position: { x: 0, y: 0 },
    data: {
      type: 'function',
      fn,
      dependentTriggers: triggers.filter((t) => t.function === fn.name).map((t) => t.name),
    },
    width: FUNCTION_NODE_WIDTH,
    height: FUNCTION_NODE_HEIGHT,
  }))

  const nodes = [...tableNodes, ...triggerNodes, ...functionNodes]

  const edges: Edge[] = []

  for (const trigger of triggers) {
    edges.push({
      id: `table-${trigger.table}->trigger-${trigger.name}`,
      source: `table-${trigger.table}`,
      target: `trigger-${trigger.name}`,
      type: 'default',
      animated: false,
      label: `${trigger.timing} ${trigger.event}`,
      labelStyle: {
        fill: 'var(--color-muted-foreground)',
        fontSize: 10,
        fontFamily: 'var(--font-mono)',
      },
      labelBgStyle: { fill: 'var(--color-background)', opacity: 0.9 },
      labelBgPadding: [4, 4] as [number, number],
      style: {
        stroke: 'var(--node-trigger-border)',
        strokeWidth: 1.5,
        strokeDasharray: '4 2',
      },
      markerEnd: 'arrowclosed',
    })
  }

  for (const trigger of triggers) {
    edges.push({
      id: `trigger-${trigger.name}->function-${trigger.function}`,
      source: `trigger-${trigger.name}`,
      target: `function-${trigger.function}`,
      type: 'default',
      animated: true,
      label: 'executes',
      labelStyle: {
        fill: 'var(--color-muted-foreground)',
        fontSize: 10,
        fontFamily: 'var(--font-mono)',
      },
      labelBgStyle: { fill: 'var(--color-background)', opacity: 0.9 },
      labelBgPadding: [4, 4] as [number, number],
      style: {
        stroke: 'var(--node-function-border)',
        strokeWidth: 1.5,
      },
      markerEnd: 'arrowclosed',
    })
  }

  return { nodes, edges }
}

const elk = new ELK()

export async function applyTriggerElkLayout(
  nodes: Node<TriggerNodeData>[],
  edges: Edge[],
): Promise<Node<TriggerNodeData>[]> {
  const graph = {
    id: 'root',
    layoutOptions: {
      'elk.algorithm': 'layered',
      'elk.direction': 'RIGHT',
      'elk.layered.spacing.nodeNodeBetweenLayers': '160',
      'elk.layered.spacing.nodeNode': '60',
      'elk.spacing.nodeNode': '60',
      'elk.spacing.componentComponent': '100',
      'elk.layered.nodePlacement.strategy': 'NETWORK_SIMPLEX',
      'elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP',
      'elk.layered.considerModelOrder.strategy': 'NODES_AND_EDGES',
      'elk.layered.edgeRouting': 'SPLINES',
      'elk.edgeRouting': 'SPLINES',
      'elk.layered.unnecessaryBendpoints': 'true',
      'elk.layered.wrapping.strategy': 'OFF',
      'elk.separateConnectedComponents': 'true',
      'elk.padding': '[top=60,left=60,bottom=60,right=60]',
    },
    children: nodes.map((n) => ({
      id: n.id,
      width: n.width ?? 200,
      height: n.height ?? 50,
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
