import { create } from "zustand";
import {
  ENVIRONMENT_NODE_ID,
  evaluateAll,
  step,
  type CriterionResult,
  type GraphEdge,
  type GraphNode,
  type Level,
  type PartLibrary,
  type QuantityMap,
  type SystemGraph,
} from "../engine";
import { getLevel, getSystemPack } from "../content/registry";

export type RunStatus = "building" | "running" | "won" | "lost";

interface SimulationState {
  systemId: string | null;
  level: Level | null;
  library: PartLibrary | null;
  environment: QuantityMap;
  graph: SystemGraph;
  history: SystemGraph[];
  tick: number;
  playing: boolean;
  speed: number; // ticks per second
  status: RunStatus;
  placedCounts: Record<string, number>;
  goalResults: CriterionResult[];
  failResults: CriterionResult[];
  nextId: number;

  loadLevel: (systemId: string, levelId: string) => void;
  reset: () => void;
  addNode: (partType: string, x: number, y: number) => string | null;
  addEdge: (partType: string, source: string, target: string) => string | null;
  removeNode: (id: string) => void;
  removeEdge: (id: string) => void;
  moveNode: (id: string, x: number, y: number) => void;
  tickOnce: () => void;
  play: () => void;
  pause: () => void;
  setSpeed: (speed: number) => void;
  remainingBudget: (partType: string) => number | null;
  refreshStatus: () => void;
}

function defaultQuantitiesFor(library: PartLibrary): QuantityMap {
  const q: QuantityMap = {};
  for (const quantity of library.quantities) q[quantity.id] = 0;
  return q;
}

function emptyGraphState() {
  return {
    systemId: null,
    level: null,
    library: null,
    environment: {},
    graph: { nodes: [], edges: [] } as SystemGraph,
    history: [] as SystemGraph[],
    tick: 0,
    playing: false,
    speed: 2,
    status: "building" as RunStatus,
    placedCounts: {} as Record<string, number>,
    goalResults: [] as CriterionResult[],
    failResults: [] as CriterionResult[],
    nextId: 1,
  };
}

function evaluateStatus(
  level: Level,
  graph: SystemGraph,
  environment: QuantityMap,
  history: SystemGraph[],
): { goalResults: CriterionResult[]; failResults: CriterionResult[]; status: RunStatus } {
  const ctx = { graph, environment, history };
  const goalResults = evaluateAll(level.goals, ctx);
  const failResults = evaluateAll(level.failConditions ?? [], ctx);
  let status: RunStatus = "running";
  if (failResults.some((r) => r.satisfied)) status = "lost";
  else if (goalResults.length > 0 && goalResults.every((r) => r.satisfied)) status = "won";
  return { goalResults, failResults, status };
}

export const useSimulationStore = create<SimulationState>((set, get) => ({
  ...emptyGraphState(),

  loadLevel: (systemId, levelId) => {
    const level = getLevel(systemId, levelId);
    const pack = getSystemPack(systemId);
    if (!level || !pack) {
      throw new Error(`Unknown level "${levelId}" for system "${systemId}"`);
    }
    const graph: SystemGraph = {
      nodes: level.initialGraph.nodes.map((n) => ({ ...n, quantities: { ...n.quantities } })),
      edges: level.initialGraph.edges.map((e) => ({ ...e })),
    };
    const environment = { ...(level.environment?.quantities ?? {}) };
    const { goalResults, failResults } = evaluateStatus(level, graph, environment, [graph]);
    set({
      ...emptyGraphState(),
      systemId,
      level,
      library: pack.library,
      environment,
      graph,
      history: [graph],
      speed: level.tickRate ?? 2,
      goalResults,
      failResults,
      status: "building",
    });
  },

  reset: () => {
    const { systemId, level } = get();
    if (systemId && level) get().loadLevel(systemId, level.id);
  },

  addNode: (partType, x, y) => {
    const { library, graph, placedCounts, level, nextId } = get();
    if (!library || !level) return null;
    const budget = level.availableParts.find((b) => b.partType === partType);
    if (budget?.limit !== undefined && (placedCounts[partType] ?? 0) >= budget.limit) {
      return null;
    }
    const partTypeDef = library.partTypes.find((p) => p.id === partType);
    if (!partTypeDef || partTypeDef.category !== "node") return null;
    const id = `${partType}-${nextId}`;
    const node: GraphNode = {
      id,
      partType,
      x,
      y,
      quantities: { ...defaultQuantitiesFor(library), ...(partTypeDef.defaultQuantities ?? {}) },
      properties: partTypeDef.defaultProperties ? { ...partTypeDef.defaultProperties } : undefined,
    };
    const nextGraph: SystemGraph = { nodes: [...graph.nodes, node], edges: graph.edges };
    set({
      graph: nextGraph,
      nextId: nextId + 1,
      placedCounts: { ...placedCounts, [partType]: (placedCounts[partType] ?? 0) + 1 },
    });
    get().refreshStatus();
    return id;
  },

  addEdge: (partType, source, target) => {
    const { library, graph, placedCounts, level, nextId } = get();
    if (!library || !level || source === target) return null;
    const budget = level.availableParts.find((b) => b.partType === partType);
    if (budget?.limit !== undefined && (placedCounts[partType] ?? 0) >= budget.limit) {
      return null;
    }
    const partTypeDef = library.partTypes.find((p) => p.id === partType);
    if (!partTypeDef || partTypeDef.category !== "edge") return null;
    const nodeIds = new Set(graph.nodes.map((n) => n.id));
    if (!nodeIds.has(source) || !nodeIds.has(target)) return null;
    const id = `${partType}-${nextId}`;
    const edge: GraphEdge = {
      id,
      partType,
      source,
      target,
      properties: partTypeDef.defaultProperties ? { ...partTypeDef.defaultProperties } : undefined,
    };
    const nextGraph: SystemGraph = { nodes: graph.nodes, edges: [...graph.edges, edge] };
    set({
      graph: nextGraph,
      nextId: nextId + 1,
      placedCounts: { ...placedCounts, [partType]: (placedCounts[partType] ?? 0) + 1 },
    });
    get().refreshStatus();
    return id;
  },

  removeNode: (id) => {
    const { graph, placedCounts } = get();
    const node = graph.nodes.find((n) => n.id === id);
    if (!node || node.locked || id === ENVIRONMENT_NODE_ID) return;
    const nextGraph: SystemGraph = {
      nodes: graph.nodes.filter((n) => n.id !== id),
      edges: graph.edges.filter((e) => e.source !== id && e.target !== id),
    };
    const removedEdges = graph.edges.filter((e) => e.source === id || e.target === id);
    const counts = { ...placedCounts, [node.partType]: Math.max(0, (placedCounts[node.partType] ?? 0) - 1) };
    for (const e of removedEdges) {
      counts[e.partType] = Math.max(0, (counts[e.partType] ?? 0) - 1);
    }
    set({ graph: nextGraph, placedCounts: counts });
    get().refreshStatus();
  },

  removeEdge: (id) => {
    const { graph, placedCounts } = get();
    const edge = graph.edges.find((e) => e.id === id);
    if (!edge || edge.locked) return;
    const nextGraph: SystemGraph = { nodes: graph.nodes, edges: graph.edges.filter((e) => e.id !== id) };
    set({
      graph: nextGraph,
      placedCounts: { ...placedCounts, [edge.partType]: Math.max(0, (placedCounts[edge.partType] ?? 0) - 1) },
    });
    get().refreshStatus();
  },

  moveNode: (id, x, y) => {
    const { graph } = get();
    const nextGraph: SystemGraph = {
      nodes: graph.nodes.map((n) => (n.id === id ? { ...n, x, y } : n)),
      edges: graph.edges,
    };
    set({ graph: nextGraph });
    get().refreshStatus();
  },

  tickOnce: () => {
    const { graph, library, environment, tick, history, level } = get();
    if (!library || !level) return;
    const status = get().status;
    if (status === "won" || status === "lost") return;
    const nextGraph = step({ graph, library, environment, tick: tick + 1 });
    const nextHistory = [...history, nextGraph].slice(-500);
    const nextTick = tick + 1;
    const evaluated = evaluateStatus(level, nextGraph, environment, nextHistory);
    const hitMaxTicks = level.maxTicks !== undefined && nextTick >= level.maxTicks;
    const finalStatus: RunStatus =
      evaluated.status === "running" && hitMaxTicks ? "lost" : evaluated.status;
    set({
      graph: nextGraph,
      history: nextHistory,
      tick: nextTick,
      goalResults: evaluated.goalResults,
      failResults: evaluated.failResults,
      status: finalStatus,
      playing: finalStatus === "won" || finalStatus === "lost" ? false : get().playing,
    });
  },

  play: () => {
    const { status } = get();
    if (status === "won" || status === "lost") return;
    set({ playing: true, status: "running" });
  },

  pause: () => set({ playing: false }),

  setSpeed: (speed) => set({ speed: Math.max(0.5, Math.min(10, speed)) }),

  remainingBudget: (partType) => {
    const { level, placedCounts } = get();
    const budget = level?.availableParts.find((b) => b.partType === partType);
    if (!budget || budget.limit === undefined) return null;
    return Math.max(0, budget.limit - (placedCounts[partType] ?? 0));
  },

  // internal helper, not part of the public action surface but simplest as a method
  refreshStatus: () => {
    const { level, graph, environment, history } = get();
    if (!level) return;
    const nextHistory = [...history.slice(0, -1), graph];
    const evaluated = evaluateStatus(level, graph, environment, nextHistory);
    set({ history: nextHistory, goalResults: evaluated.goalResults, failResults: evaluated.failResults });
  },
}));
