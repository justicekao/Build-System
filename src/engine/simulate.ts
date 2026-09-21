// One discrete simulation tick: applies every rule attached to every placed
// part's PartType against the current graph state and returns the next
// graph state. Uses a simple forward-Euler step — deltas are computed from
// a frozen snapshot of the current tick, then applied all at once, so rule
// order within a tick never matters.

import { resolveNumeric } from "./expression";
import type {
  GraphNode,
  PartLibrary,
  PartType,
  QuantityMap,
  SystemGraph,
} from "./types";

/** Sentinel node id representing the environment / extracellular space —
 * an infinite reservoir that edges can diffuse or flow against but that
 * node-local rules never touch and ticks never deplete. */
export const ENVIRONMENT_NODE_ID = "environment";

export interface SimulationContext {
  graph: SystemGraph;
  library: PartLibrary;
  environment: QuantityMap;
  tick: number;
}

function partTypeOf(library: PartLibrary, id: string): PartType {
  const pt = library.partTypes.find((p) => p.id === id);
  if (!pt) {
    throw new Error(`Unknown part type '${id}' in library '${library.id}'`);
  }
  return pt;
}

export function step(ctx: SimulationContext): SystemGraph {
  const { graph, library, environment, tick } = ctx;
  const nodesById = new Map<string, GraphNode>(graph.nodes.map((n) => [n.id, n]));
  const deltas = new Map<string, QuantityMap>();

  function addDelta(nodeId: string, quantity: string, amount: number) {
    if (nodeId === ENVIRONMENT_NODE_ID || amount === 0) return;
    const d = deltas.get(nodeId) ?? {};
    d[quantity] = (d[quantity] ?? 0) + amount;
    deltas.set(nodeId, d);
  }

  function valueAt(nodeId: string, quantity: string): number {
    if (nodeId === ENVIRONMENT_NODE_ID) return environment[quantity] ?? 0;
    return nodesById.get(nodeId)?.quantities[quantity] ?? 0;
  }

  // Node-local rules: source / sink / formula
  for (const node of graph.nodes) {
    const partType = partTypeOf(library, node.partType);
    for (const rule of partType.rules ?? []) {
      const scope = { ...node.quantities, ...(node.properties ?? {}), tick };
      if (rule.kind === "source") {
        addDelta(node.id, rule.quantity, resolveNumeric(rule.rate, scope));
      } else if (rule.kind === "sink") {
        const rate = resolveNumeric(rule.rate, scope);
        const current = node.quantities[rule.quantity] ?? 0;
        addDelta(node.id, rule.quantity, -Math.min(rate, current));
      } else if (rule.kind === "formula") {
        addDelta(node.id, rule.quantity, resolveNumeric(rule.expression, scope));
      }
      // diffusion / fixedFlow are edge-scoped and ignored here
    }
  }

  // Edge rules: diffusion / fixedFlow move a quantity between the two
  // nodes (or node <-> environment) the edge connects.
  for (const edge of graph.edges) {
    const partType = partTypeOf(library, edge.partType);
    for (const rule of partType.rules ?? []) {
      if (rule.kind === "diffusion") {
        const a = valueAt(edge.source, rule.quantity);
        const b = valueAt(edge.target, rule.quantity);
        const scope = { ...(edge.properties ?? {}), a, b, tick };
        const rate = resolveNumeric(rule.rate, scope);
        const flow = rate * (a - b);
        addDelta(edge.source, rule.quantity, -flow);
        addDelta(edge.target, rule.quantity, flow);
      } else if (rule.kind === "fixedFlow") {
        const a = valueAt(edge.source, rule.quantity);
        const b = valueAt(edge.target, rule.quantity);
        const scope = { ...(edge.properties ?? {}), a, b, tick };
        const requested = resolveNumeric(rule.amount, scope);
        const available = edge.source === ENVIRONMENT_NODE_ID ? Math.max(requested, 0) : a;
        const actual = Math.max(0, Math.min(requested, available));
        addDelta(edge.source, rule.quantity, -actual);
        addDelta(edge.target, rule.quantity, actual);
      }
    }
  }

  const nextNodes = graph.nodes.map((node) => {
    const d = deltas.get(node.id);
    if (!d) return node;
    const quantities: QuantityMap = { ...node.quantities };
    for (const [q, amount] of Object.entries(d)) {
      quantities[q] = Math.max(0, (quantities[q] ?? 0) + amount);
    }
    return { ...node, quantities };
  });

  return { nodes: nextNodes, edges: graph.edges };
}
