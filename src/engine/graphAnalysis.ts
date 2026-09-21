// Pure graph-theoretic checks used by GraphCriterion. These operate on the
// *current* laid-out graph, including node (x, y) positions — which is what
// lets "planar" mean something concrete and playable in a 2D builder: no two
// edges crossing given where the player put things, rather than an abstract
// existential planarity test.

import type { GraphEdge, GraphNode, SystemGraph } from "./types";

export function isAcyclic(graph: SystemGraph): boolean {
  const adjacency = new Map<string, string[]>();
  for (const node of graph.nodes) adjacency.set(node.id, []);
  for (const edge of graph.edges) {
    adjacency.get(edge.source)?.push(edge.target);
    adjacency.get(edge.target)?.push(edge.source);
  }

  const visited = new Set<string>();
  function dfs(nodeId: string, parent: string | null): boolean {
    visited.add(nodeId);
    for (const neighbor of adjacency.get(nodeId) ?? []) {
      if (neighbor === parent) continue;
      if (visited.has(neighbor)) return false; // back edge -> cycle
      if (!dfs(neighbor, nodeId)) return false;
    }
    return true;
  }

  for (const node of graph.nodes) {
    if (!visited.has(node.id) && !dfs(node.id, null)) return false;
  }
  return true;
}

export function isConnected(graph: SystemGraph): boolean {
  if (graph.nodes.length === 0) return true;
  const adjacency = new Map<string, string[]>();
  for (const node of graph.nodes) adjacency.set(node.id, []);
  for (const edge of graph.edges) {
    adjacency.get(edge.source)?.push(edge.target);
    adjacency.get(edge.target)?.push(edge.source);
  }

  const visited = new Set<string>();
  const stack = [graph.nodes[0].id];
  while (stack.length > 0) {
    const id = stack.pop()!;
    if (visited.has(id)) continue;
    visited.add(id);
    for (const neighbor of adjacency.get(id) ?? []) stack.push(neighbor);
  }
  return visited.size === graph.nodes.length;
}

export function maxDegree(graph: SystemGraph): number {
  const degree = new Map<string, number>();
  for (const node of graph.nodes) degree.set(node.id, 0);
  for (const edge of graph.edges) {
    degree.set(edge.source, (degree.get(edge.source) ?? 0) + 1);
    degree.set(edge.target, (degree.get(edge.target) ?? 0) + 1);
  }
  return Math.max(0, ...degree.values());
}

function segmentsIntersect(
  p1: { x: number; y: number },
  p2: { x: number; y: number },
  p3: { x: number; y: number },
  p4: { x: number; y: number },
): boolean {
  function cross(o: typeof p1, a: typeof p1, b: typeof p1): number {
    return (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  }
  const d1 = cross(p3, p4, p1);
  const d2 = cross(p3, p4, p2);
  const d3 = cross(p1, p2, p3);
  const d4 = cross(p1, p2, p4);
  if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) {
    return true;
  }
  return false;
}

/** True when no two edges (that don't share an endpoint) visually cross. */
export function hasNoCrossingEdges(graph: SystemGraph): boolean {
  const byId = new Map<string, GraphNode>(graph.nodes.map((n) => [n.id, n]));
  const edges: GraphEdge[] = graph.edges;
  for (let i = 0; i < edges.length; i++) {
    for (let j = i + 1; j < edges.length; j++) {
      const e1 = edges[i];
      const e2 = edges[j];
      const shared =
        e1.source === e2.source ||
        e1.source === e2.target ||
        e1.target === e2.source ||
        e1.target === e2.target;
      if (shared) continue;
      const a = byId.get(e1.source);
      const b = byId.get(e1.target);
      const c = byId.get(e2.source);
      const d = byId.get(e2.target);
      if (!a || !b || !c || !d) continue;
      if (segmentsIntersect(a, b, c, d)) return false;
    }
  }
  return true;
}
