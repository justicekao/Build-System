import { describe, expect, it } from "vitest";
import { CreationValidationError, parseCreation, serializeCreation, type Creation } from "../creation";
import type { PartLibrary, SystemGraph } from "../types";

const library: PartLibrary = {
  id: "test-lib",
  name: "Test library",
  quantities: [{ id: "x", name: "X" }],
  partTypes: [
    { id: "node-a", name: "Node A", category: "node" },
    { id: "edge-a", name: "Edge A", category: "edge" },
  ],
};

const graph: SystemGraph = {
  nodes: [
    { id: "a", partType: "node-a", x: 0, y: 0, quantities: { x: 5 } },
    { id: "b", partType: "node-a", x: 10, y: 0, quantities: { x: 0 } },
  ],
  edges: [{ id: "e1", partType: "edge-a", source: "a", target: "b" }],
};

const creation: Creation = {
  formatVersion: 1,
  libraryId: "test-lib",
  title: "My contraption",
  description: "A test creation",
  graph,
  environment: { x: 10 },
  goals: [{ kind: "threshold", node: "b", quantity: "x", comparator: "gte", value: 1 }],
};

describe("serializeCreation / parseCreation", () => {
  it("round-trips a valid creation", () => {
    const raw = serializeCreation(creation);
    const parsed = parseCreation(raw, library);
    expect(parsed).toEqual(creation);
  });

  it("rejects malformed JSON", () => {
    expect(() => parseCreation("{not json", library)).toThrow(CreationValidationError);
  });

  it("rejects a creation built for a different library", () => {
    const raw = serializeCreation({ ...creation, libraryId: "other-lib" });
    expect(() => parseCreation(raw, library)).toThrow(/other-lib/);
  });

  it("rejects a missing title", () => {
    const raw = JSON.stringify({ ...creation, title: "" });
    expect(() => parseCreation(raw, library)).toThrow(CreationValidationError);
  });

  it("rejects an unsupported format version", () => {
    const raw = JSON.stringify({ ...creation, formatVersion: 99 });
    expect(() => parseCreation(raw, library)).toThrow(/version/);
  });

  it("rejects a node referencing an unknown part type", () => {
    const bad = { ...creation, graph: { nodes: [{ id: "a", partType: "nope", x: 0, y: 0, quantities: {} }], edges: [] } };
    expect(() => parseCreation(JSON.stringify(bad), library)).toThrow(/unknown part/);
  });

  it("rejects an edge referencing a node that isn't in the graph", () => {
    const bad = {
      ...creation,
      graph: {
        nodes: [{ id: "a", partType: "node-a", x: 0, y: 0, quantities: {} }],
        edges: [{ id: "e1", partType: "edge-a", source: "a", target: "ghost" }],
      },
    };
    expect(() => parseCreation(JSON.stringify(bad), library)).toThrow(/references a node/);
  });

  it("defaults missing environment/goals to empty rather than throwing", () => {
    const minimal = { formatVersion: 1, libraryId: "test-lib", title: "Bare", graph: { nodes: [], edges: [] } };
    const parsed = parseCreation(JSON.stringify(minimal), library);
    expect(parsed.environment).toEqual({});
    expect(parsed.goals).toEqual([]);
  });
});
