import ELK from 'elkjs/lib/elk.bundled.js'
import type { Node, Edge } from 'reactflow'

export type ExplainNodeType = 'scan' | 'join' | 'sort' | 'generic'

export type ExplainNodeData = {
  seq: number
  type: ExplainNodeType
  label: string
  relation?: string
  index?: string
  condition?: string
  cost: { startup: number; total: number }
  actual?: {
    startup: number
    total: number
    rows: number
    loops: number
  }
  plannedRows?: number
  width?: number
  buffers?: {
    sharedHit?: number
    sharedRead?: number
    sharedDirtied?: number
    sharedWritten?: number
    tempRead?: number
    tempWritten?: number
    localHit?: number
    localRead?: number
  }
  output?: string[]
  full: Record<string, unknown>
}

function classifyNodeType(nodeType: string): ExplainNodeType {
  const upper = nodeType.toUpperCase()
  if (upper.includes('SCAN') || upper.includes('SEQ') || upper.includes('INDEX')) {
    return 'scan'
  }
  if (
    upper.includes('JOIN') ||
    upper.includes('HASH') ||
    upper.includes('MERGE') ||
    upper.includes('NESTED')
  ) {
    return 'join'
  }
  if (
    upper.includes('SORT') ||
    upper.includes('AGGREGATE') ||
    upper.includes('GROUP') ||
    upper.includes('WINDOW')
  ) {
    return 'sort'
  }
  return 'generic'
}

function buildLabel(plan: Record<string, unknown>): string {
  const nodeType = (plan['Node Type'] as string) ?? 'Unknown'
  const relation = plan['Relation Name'] as string | undefined
  const index = plan['Index Name'] as string | undefined
  if (relation) return `${nodeType} on ${relation}`
  if (index) return `${nodeType} using ${index}`
  return nodeType
}

function extractCost(plan: Record<string, unknown>): ExplainNodeData['cost'] {
  const startup = plan['Startup Cost'] as number | undefined
  const total = plan['Total Cost'] as number | undefined
  return {
    startup: startup ?? 0,
    total: total ?? 0,
  }
}

function extractActual(plan: Record<string, unknown>): ExplainNodeData['actual'] | undefined {
  const actual = plan['Actual Startup Time'] as number | undefined
  if (actual === undefined) return undefined
  return {
    startup: actual,
    total: (plan['Actual Total Time'] as number) ?? 0,
    rows: (plan['Actual Rows'] as number) ?? 0,
    loops: (plan['Actual Loops'] as number) ?? 1,
  }
}

function extractBuffers(plan: Record<string, unknown>): ExplainNodeData['buffers'] | undefined {
  const shared = plan['Shared Hit Blocks'] as number | undefined
  if (shared === undefined) return undefined
  return {
    sharedHit: shared,
    sharedRead: (plan['Shared Read Blocks'] as number) ?? 0,
    sharedDirtied: (plan['Shared Dirtied Blocks'] as number) ?? 0,
    sharedWritten: (plan['Shared Written Blocks'] as number) ?? 0,
    tempRead: (plan['Temp Read Blocks'] as number) ?? 0,
    tempWritten: (plan['Temp Written Blocks'] as number) ?? 0,
    localHit: (plan['Local Hit Blocks'] as number) ?? 0,
    localRead: (plan['Local Read Blocks'] as number) ?? 0,
  }
}

function walkPlan(
  plan: Record<string, unknown>,
  parentId: string | null,
  nodes: Node<ExplainNodeData>[],
  edges: Edge[],
  counter: { value: number },
  seqCounter: { value: number },
) {
  const id = `plan-${counter.value++}`
  const seq = seqCounter.value++
  const nodeType = classifyNodeType((plan['Node Type'] as string) ?? '')

  const data: ExplainNodeData = {
    seq,
    type: nodeType,
    label: buildLabel(plan),
    relation: (plan['Relation Name'] as string) ?? undefined,
    index: (plan['Index Name'] as string) ?? undefined,
    condition:
      (plan['Index Cond'] as string) ??
      (plan['Join Filter'] as string) ??
      (plan['Filter'] as string) ??
      (plan['Hash Cond'] as string) ??
      undefined,
    cost: extractCost(plan),
    actual: extractActual(plan),
    plannedRows: (plan['Plan Rows'] as number) ?? undefined,
    width: (plan['Plan Width'] as number) ?? undefined,
    buffers: extractBuffers(plan),
    output: (plan['Output'] as string[]) ?? undefined,
    full: plan,
  }

  nodes.push({
    id,
    type: 'explainNode',
    position: { x: 0, y: 0 },
    data,
    width: 260,
    height: 70,
  })

  if (parentId) {
    const edgeLabel = (plan['Parent Relationship'] as string) ?? undefined
    edges.push({
      id: `${parentId}->${id}`,
      source: parentId,
      target: id,
      type: 'default',
      animated: false,
      label: edgeLabel,
      labelStyle: {
        fill: 'var(--color-muted-foreground)',
        fontSize: 9,
        fontFamily: 'var(--font-mono)',
      },
      labelBgStyle: { fill: 'var(--color-background)', opacity: 0.9 },
      labelBgPadding: [3, 3] as [number, number],
      style: {
        stroke: 'var(--color-muted-foreground)',
        strokeWidth: 1.5,
        opacity: 0.5,
      },
      markerEnd: 'arrowclosed',
    })
  }

  const plans = plan['Plans'] as Record<string, unknown>[] | undefined
  if (plans) {
    for (const child of plans) {
      walkPlan(child, id, nodes, edges, counter, seqCounter)
    }
  }
}

export function planToGraph(rootPlan: Record<string, unknown>): {
  nodes: Node<ExplainNodeData>[]
  edges: Edge[]
} {
  const nodes: Node<ExplainNodeData>[] = []
  const edges: Edge[] = []
  const counter = { value: 0 }
  const seqCounter = { value: 1 }
  walkPlan(rootPlan, null, nodes, edges, counter, seqCounter)
  return { nodes, edges }
}

const elk = new ELK()

export async function applyExplainElkLayout(
  nodes: Node<ExplainNodeData>[],
  edges: Edge[],
): Promise<Node<ExplainNodeData>[]> {
  const graph = {
    id: 'root',
    layoutOptions: {
      'elk.algorithm': 'layered',
      'elk.direction': 'RIGHT',
      'elk.layered.spacing.nodeNodeBetweenLayers': '80',
      'elk.layered.spacing.nodeNode': '40',
      'elk.spacing.nodeNode': '40',
      'elk.spacing.componentComponent': '60',
      'elk.layered.nodePlacement.strategy': 'NETWORK_SIMPLEX',
      'elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP',
      'elk.layered.considerModelOrder.strategy': 'NODES_AND_EDGES',
      'elk.layered.edgeRouting': 'SPLINES',
      'elk.edgeRouting': 'SPLINES',
      'elk.layered.unnecessaryBendpoints': 'true',
      'elk.layered.wrapping.strategy': 'OFF',
      'elk.separateConnectedComponents': 'true',
      'elk.padding': '[top=40,left=40,bottom=40,right=40]',
    },
    children: nodes.map((n) => ({
      id: n.id,
      width: n.width ?? 260,
      height: n.height ?? 70,
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
