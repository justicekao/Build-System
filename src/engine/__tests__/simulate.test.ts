import { describe, expect, it } from "vitest";
import { ENVIRONMENT_NODE_ID, step } from "../simulate";
import type { PartLibrary, SystemGraph } from "../types";

const library: PartLibrary = {
  id: "test",
  name: "Test library",
  quantities: [{ id: "x", name: "X" }],
  partTypes: [
    { id: "plainNode", name: "Plain", category: "node" },
    {
      id: "diffusionEdge",
      name: "Diffusion edge",
      category: "edge",
      rules: [{ kind: "diffusion", quantity: "x", rate: 0.5 }],
    },
    {
      id: "fixedFlowEdge",
      name: "Fixed flow edge",
      category: "edge",
      rules: [{ kind: "fixedFlow", quantity: "x", amount: 3 }],
    },
    {
      id: "sourceNode",
      name: "Source",
      category: "node",
      rules: [{ kind: "source", quantity: "x", rate: 2 }],
    },
    {
      id: "sinkNode",
      name: "Sink",
      category: "node",
      rules: [{ kind: "sink", quantity: "x", rate: 5 }],
    },
    {
      id: "formulaNode",
      name: "Formula",
      category: "node",
      rules: [{ kind: "formula", quantity: "x", expression: "x * 0.1" }],
    },
  ],
};

describe("step", () => {
  it("diffuses a quantity down its gradient between two nodes", () => {
    const graph: SystemGraph = {
      nodes: [
        { id: "a", partType: "plainNode", x: 0, y: 0, quantities: { x: 10 } },
        { id: "b", partType: "plainNode", x: 0, y: 0, quantities: { x: 0 } },
      ],
      edges: [{ id: "e", partType: "diffusionEdge", source: "a", target: "b" }],
    };
    const next = step({ graph, library, environment: {}, tick: 0 });
    expect(next.nodes.find((n) => n.id === "a")!.quantities.x).toBe(5);
    expect(next.nodes.find((n) => n.id === "b")!.quantities.x).toBe(5);
  });

  it("moves a fixed amount per tick, capped by availability", () => {
    const graph: SystemGraph = {
      nodes: [
        { id: "a", partType: "plainNode", x: 0, y: 0, quantities: { x: 2 } },
        { id: "b", partType: "plainNode", x: 0, y: 0, quantities: { x: 0 } },
      ],
      edges: [{ id: "e", partType: "fixedFlowEdge", source: "a", target: "b" }],
    };
    const next = step({ graph, library, environment: {}, tick: 0 });
    // requested amount is 3 but only 2 is available
    expect(next.nodes.find((n) => n.id === "a")!.quantities.x).toBe(0);
    expect(next.nodes.find((n) => n.id === "b")!.quantities.x).toBe(2);
  });

  it("applies source and sink rules, never dropping below zero", () => {
    const graph: SystemGraph = {
      nodes: [
        { id: "s", partType: "sourceNode", x: 0, y: 0, quantities: { x: 0 } },
        { id: "k", partType: "sinkNode", x: 0, y: 0, quantities: { x: 3 } },
      ],
      edges: [],
    };
    const next = step({ graph, library, environment: {}, tick: 0 });
    expect(next.nodes.find((n) => n.id === "s")!.quantities.x).toBe(2);
    // sink rate is 5 but only 3 available -> clamped to 0, not negative
    expect(next.nodes.find((n) => n.id === "k")!.quantities.x).toBe(0);
  });

  it("applies formula rules referencing the node's own quantities", () => {
    const graph: SystemGraph = {
      nodes: [{ id: "f", partType: "formulaNode", x: 0, y: 0, quantities: { x: 10 } }],
      edges: [],
    };
    const next = step({ graph, library, environment: {}, tick: 0 });
    expect(next.nodes.find((n) => n.id === "f")!.quantities.x).toBe(11);
  });

  it("treats the environment as an infinite, unmodified reservoir", () => {
    const graph: SystemGraph = {
      nodes: [{ id: "a", partType: "plainNode", x: 0, y: 0, quantities: { x: 0 } }],
      edges: [{ id: "e", partType: "diffusionEdge", source: ENVIRONMENT_NODE_ID, target: "a" }],
    };
    const next = step({ graph, library, environment: { x: 20 }, tick: 0 });
    expect(next.nodes.find((n) => n.id === "a")!.quantities.x).toBe(10);
    // environment itself is never part of `next.nodes` and is never depleted
    expect(next.nodes.find((n) => n.id === ENVIRONMENT_NODE_ID)).toBeUndefined();
  });
});
