import { describe, expect, it } from "vitest";
import { hasNoCrossingEdges, isAcyclic, isConnected, maxDegree } from "../graphAnalysis";
import type { SystemGraph } from "../types";

function node(id: string, x: number, y: number) {
  return { id, partType: "n", x, y, quantities: {} };
}
function edge(id: string, source: string, target: string) {
  return { id, partType: "e", source, target };
}

describe("graphAnalysis", () => {
  it("detects cycles", () => {
    const triangle: SystemGraph = {
      nodes: [node("a", 0, 0), node("b", 1, 0), node("c", 0, 1)],
      edges: [edge("1", "a", "b"), edge("2", "b", "c"), edge("3", "c", "a")],
    };
    expect(isAcyclic(triangle)).toBe(false);

    const tree: SystemGraph = {
      nodes: [node("a", 0, 0), node("b", 1, 0), node("c", 0, 1)],
      edges: [edge("1", "a", "b"), edge("2", "b", "c")],
    };
    expect(isAcyclic(tree)).toBe(true);
  });

  it("detects connectivity", () => {
    const connected: SystemGraph = {
      nodes: [node("a", 0, 0), node("b", 1, 0)],
      edges: [edge("1", "a", "b")],
    };
    expect(isConnected(connected)).toBe(true);

    const disconnected: SystemGraph = {
      nodes: [node("a", 0, 0), node("b", 1, 0)],
      edges: [],
    };
    expect(isConnected(disconnected)).toBe(false);
  });

  it("computes max degree", () => {
    const star: SystemGraph = {
      nodes: [node("center", 0, 0), node("a", 1, 0), node("b", -1, 0), node("c", 0, 1)],
      edges: [edge("1", "center", "a"), edge("2", "center", "b"), edge("3", "center", "c")],
    };
    expect(maxDegree(star)).toBe(3);
  });

  it("detects crossing edges geometrically", () => {
    // X shape: a-c and b-d cross in the middle
    const crossing: SystemGraph = {
      nodes: [node("a", 0, 0), node("b", 1, 0), node("c", 1, 1), node("d", 0, 1)],
      edges: [edge("1", "a", "c"), edge("2", "b", "d")],
    };
    expect(hasNoCrossingEdges(crossing)).toBe(false);

    // Same 4 nodes, non-crossing square perimeter instead
    const square: SystemGraph = {
      nodes: [node("a", 0, 0), node("b", 1, 0), node("c", 1, 1), node("d", 0, 1)],
      edges: [edge("1", "a", "b"), edge("2", "b", "c"), edge("3", "c", "d"), edge("4", "d", "a")],
    };
    expect(hasNoCrossingEdges(square)).toBe(true);
  });

  it("does not flag edges that merely share an endpoint as crossing", () => {
    const fan: SystemGraph = {
      nodes: [node("center", 0, 0), node("a", 1, 1), node("b", 1, -1)],
      edges: [edge("1", "center", "a"), edge("2", "center", "b")],
    };
    expect(hasNoCrossingEdges(fan)).toBe(true);
  });
});
