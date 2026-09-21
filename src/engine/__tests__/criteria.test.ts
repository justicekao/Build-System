import { describe, expect, it } from "vitest";
import { evaluateCriterion } from "../criteria";
import type { Criterion, SystemGraph } from "../types";

function graphWithValue(id: string, quantity: string, value: number): SystemGraph {
  return {
    nodes: [{ id, partType: "n", x: 0, y: 0, quantities: { [quantity]: value } }],
    edges: [],
  };
}

describe("evaluateCriterion", () => {
  it("evaluates threshold criteria", () => {
    const graph = graphWithValue("a", "glucose", 5);
    const c: Criterion = { kind: "threshold", node: "a", quantity: "glucose", comparator: "gte", value: 3 };
    expect(evaluateCriterion(c, { graph, environment: {}, history: [graph] })).toBe(true);
    const c2: Criterion = { kind: "threshold", node: "a", quantity: "glucose", comparator: "gte", value: 10 };
    expect(evaluateCriterion(c2, { graph, environment: {}, history: [graph] })).toBe(false);
  });

  it("requires threshold '*' to hold for every unlocked node", () => {
    const graph: SystemGraph = {
      nodes: [
        { id: "a", partType: "n", x: 0, y: 0, quantities: { atp: 5 } },
        { id: "b", partType: "n", x: 0, y: 0, quantities: { atp: 1 } },
        { id: "locked", partType: "n", x: 0, y: 0, quantities: { atp: 0 }, locked: true },
      ],
      edges: [],
    };
    const c: Criterion = { kind: "threshold", node: "*", quantity: "atp", comparator: "gte", value: 1 };
    expect(evaluateCriterion(c, { graph, environment: {}, history: [graph] })).toBe(true);

    const c2: Criterion = { kind: "threshold", node: "*", quantity: "atp", comparator: "gte", value: 2 };
    expect(evaluateCriterion(c2, { graph, environment: {}, history: [graph] })).toBe(false);
  });

  it("evaluates streak criteria over recent history", () => {
    const history = [1, 2, 3].map((v) => graphWithValue("a", "pop", v + 10));
    const c: Criterion = {
      kind: "streak",
      node: "a",
      quantity: "pop",
      comparator: "gte",
      value: 11,
      turns: 3,
    };
    expect(evaluateCriterion(c, { graph: history[2], environment: {}, history })).toBe(true);

    const tooShortHistory = history.slice(1);
    expect(evaluateCriterion(c, { graph: history[2], environment: {}, history: tooShortHistory })).toBe(false);
  });

  it("evaluates delta streak criteria (e.g. +2 per turn for N turns)", () => {
    const values = [10, 12, 14, 16];
    const history = values.map((v) => graphWithValue("y", "population", v));
    const c: Criterion = {
      kind: "streak",
      node: "y",
      quantity: "population",
      comparator: "eq",
      value: 2,
      turns: 3,
      delta: true,
    };
    expect(evaluateCriterion(c, { graph: history[3], environment: {}, history })).toBe(true);
  });

  it("evaluates graph criteria", () => {
    const graph: SystemGraph = {
      nodes: [
        { id: "a", partType: "n", x: 0, y: 0, quantities: {} },
        { id: "b", partType: "n", x: 1, y: 0, quantities: {} },
      ],
      edges: [{ id: "e", partType: "edge", source: "a", target: "b" }],
    };
    const c: Criterion = { kind: "graph", check: "connected" };
    expect(evaluateCriterion(c, { graph, environment: {}, history: [graph] })).toBe(true);
    const c2: Criterion = { kind: "graph", check: "acyclic" };
    expect(evaluateCriterion(c2, { graph, environment: {}, history: [graph] })).toBe(true);
  });

  it("evaluates formula criteria against dotted node.quantity scope", () => {
    const graph: SystemGraph = {
      nodes: [
        { id: "cellA", partType: "n", x: 0, y: 0, quantities: { glucose: 8 } },
        { id: "cellB", partType: "n", x: 0, y: 0, quantities: { glucose: 3 } },
      ],
      edges: [],
    };
    const c: Criterion = { kind: "formula", expression: "cellA.glucose - cellB.glucose" };
    expect(evaluateCriterion(c, { graph, environment: {}, history: [graph] })).toBe(true);
  });
});
