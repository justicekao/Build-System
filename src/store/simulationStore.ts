import { create } from "zustand";
import {
  CREATION_FORMAT_VERSION,
  ENVIRONMENT_NODE_ID,
  evaluateAll,
  step,
  type Creation,
  type Criterion,
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

const SANDBOX_PREFIX = "sandbox:";

export function isSandboxLevelId(levelId: string | undefined): boolean {
  return !!levelId?.startsWith(SANDBOX_PREFIX);
}

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
  loadSandbox: (systemId: string) => void;
  loadCreation: (creation: Creation) => void;
  exportCreation: () => Creation | null;
  setCreationMeta: (meta: { title?: string; description?: string }) => void;
  setGoals: (goals: Criterion[]) => void;
  setEnvironmentQuantity: (quantity: string, value: number) => void;
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

  loadSandbox: (systemId) => {
    const pack = getSystemPack(systemId);
    if (!pack) throw new Error(`Unknown system "${systemId}"`);
    const level: Level = {
      id: `${SANDBOX_PREFIX}${systemId}`,
      title: "Untitled creation",
      library: systemId,
      description: "Build anything the library's parts allow, then author your own goals for it.",
      availableParts: pack.library.partTypes.map((p) => ({ partType: p.id })),
      initialGraph: { nodes: [], edges: [] },
      goals: [],
    };
    const graph: SystemGraph = { nodes: [], edges: [] };
    set({
      ...emptyGraphState(),
      systemId,
      level,
      library: pack.library,
      environment: {},
      graph,
      history: [graph],
      status: "building",
    });
  },

  loadCreation: (creation) => {
    const pack = getSystemPack(creation.libraryId);
    if (!pack) throw new Error(`Unknown library "${creation.libraryId}"`);
    const level: Level = {
      id: `${SANDBOX_PREFIX}${creation.libraryId}`,
      title: creation.title,
      library: creation.libraryId,
      description: creation.description,
      availableParts: pack.library.partTypes.map((p) => ({ partType: p.id })),
      initialGraph: creation.graph,
      goals: creation.goals,
    };
    const graph: SystemGraph = {
      nodes: creation.graph.nodes.map((n) => ({ ...n, quantities: { ...n.quantities } })),
      edges: creation.graph.edges.map((e) => ({ ...e })),
    };
    const environment = { ...creation.environment };
    const { goalResults, failResults } = evaluateStatus(level, graph, environment, [graph]);
    set({
      ...emptyGraphState(),
      systemId: creation.libraryId,
      level,
      library: pack.library,
      environment,
      graph,
      history: [graph],
      goalResults,
      failResults,
      status: "building",
    });
  },

  exportCreation: () => {
    const { level, graph, environment } = get();
    if (!level) return null;
    return {
      formatVersion: CREATION_FORMAT_VERSION,
      libraryId: level.library,
      title: level.title,
      description: level.description,
      graph,
      environment,
      goals: level.goals,
    };
  },

  setCreationMeta: ({ title, description }) => {
    const { level } = get();
    if (!level) return;
    set({
      level: {
        ...level,
        title: title !== undefined ? title : level.title,
        description: description !== undefined ? description : level.description,
      },
    });
  },

  setGoals: (goals) => {
    const { level } = get();
    if (!level) return;
    set({ level: { ...level, goals } });
    get().refreshStatus();
  },

  setEnvironmentQuantity: (quantity, value) => {
    const { environment } = get();
    set({ environment: { ...environment, [quantity]: value } });
    get().refreshStatus();
  },

  reset: () => {
    const { systemId, level, graph, environment } = get();
    if (!systemId || !level) return;
    if (isSandboxLevelId(level.id)) {
      // Rewind the simulation, but keep whatever the player has built —
      // "reset" in sandbox means "run it again," not "discard my work."
      const { goalResults, failResults } = evaluateStatus(level, graph, environment, [graph]);
      set({
        history: [graph],
        tick: 0,
        playing: false,
        status: "building",
        goalResults,
        failResults,
      });
    } else {
      get().loadLevel(systemId, level.id);
    }
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
