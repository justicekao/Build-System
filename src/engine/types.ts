// Core data model for the System Builder engine.
//
// Everything the player can build (a cell, a city network, a circuit, an
// ecosystem...) is expressed the same way: a graph of typed Nodes connected
// by typed Edges, each holding numeric Quantities that evolve over time
// according to Rules attached to their PartType. A Level is pure data (JSON)
// describing which parts are available, the starting graph, the environment,
// and the goals that must be met. Nothing about the engine is specific to
// biology or city-building — those live entirely in content packs.

export type NodeId = string;
export type EdgeId = string;
export type Quantity = string; // e.g. "glucose", "population", "voltage"

/** A single named numeric rule input/output, e.g. concentration.glucose */
export type QuantityMap = Record<Quantity, number>;

export type RuleKind =
  | "diffusion" // flow between two connected nodes proportional to (a - b) * rate
  | "fixedFlow" // constant amount per tick moves along an edge, capped by availability
  | "source" // a node produces a quantity at a fixed or formula rate
  | "sink" // a node consumes a quantity at a fixed or formula rate
  | "formula"; // arbitrary expression computing a delta per tick

export interface DiffusionRule {
  kind: "diffusion";
  quantity: Quantity;
  /** permeability / rate coefficient applied to the concentration gradient */
  rate: number | string;
}

export interface FixedFlowRule {
  kind: "fixedFlow";
  quantity: Quantity;
  /** amount moved per tick, may reference edge/node properties as a formula */
  amount: number | string;
}

export interface SourceRule {
  kind: "source";
  quantity: Quantity;
  rate: number | string;
}

export interface SinkRule {
  kind: "sink";
  quantity: Quantity;
  rate: number | string;
}

export interface FormulaRule {
  kind: "formula";
  quantity: Quantity;
  /** expression evaluated each tick producing a delta added to the quantity */
  expression: string;
}

export type Rule =
  | DiffusionRule
  | FixedFlowRule
  | SourceRule
  | SinkRule
  | FormulaRule;

/** A kind of node or edge that can be placed on the canvas. */
export interface PartType {
  id: string;
  name: string;
  description?: string;
  category: "node" | "edge";
  /** visual grouping, e.g. "organelle", "transport", "city", "road" */
  group?: string;
  color?: string;
  icon?: string;
  /** default numeric properties instances of this part carry (capacity, etc.) */
  defaultProperties?: Record<string, number>;
  /** default starting quantities for node parts */
  defaultQuantities?: QuantityMap;
  /** simulation rules attached to instances of this part */
  rules?: Rule[];
  /** for edge parts: which quantities are allowed to flow across them */
  allowedQuantities?: Quantity[];
}

export interface PartLibrary {
  id: string;
  name: string;
  quantities: { id: Quantity; name: string; unit?: string; color?: string }[];
  partTypes: PartType[];
}

export interface GraphNode {
  id: NodeId;
  partType: string;
  x: number;
  y: number;
  label?: string;
  locked?: boolean;
  properties?: Record<string, number>;
  quantities: QuantityMap;
}

export interface GraphEdge {
  id: EdgeId;
  partType: string;
  source: NodeId;
  target: NodeId;
  locked?: boolean;
  properties?: Record<string, number>;
}

export interface SystemGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

// ---- Criteria -------------------------------------------------------------

export type Comparator = "gte" | "lte" | "eq" | "gt" | "lt";

export interface ThresholdCriterion {
  kind: "threshold";
  description?: string;
  /** node id, or "*" to require it of every non-locked node */
  node: NodeId | "*";
  quantity: Quantity;
  comparator: Comparator;
  value: number;
}

export interface StreakCriterion {
  kind: "streak";
  description?: string;
  node: NodeId;
  quantity: Quantity;
  comparator: Comparator;
  value: number;
  /** number of consecutive ticks the condition must hold */
  turns: number;
  /** if true, condition compares delta from previous tick instead of the raw value */
  delta?: boolean;
}

export interface GraphCriterion {
  kind: "graph";
  description?: string;
  check: "acyclic" | "connected" | "noCrossingEdges" | "maxDegree";
  /** required for maxDegree */
  value?: number;
}

export interface FormulaCriterion {
  kind: "formula";
  description?: string;
  expression: string;
}

export type Criterion =
  | ThresholdCriterion
  | StreakCriterion
  | GraphCriterion
  | FormulaCriterion;

// ---- Levels -----------------------------------------------------------------

export interface EnvironmentSpec {
  /** ambient quantities surrounding the system, e.g. extracellular concentrations */
  quantities?: QuantityMap;
  description?: string;
}

export interface PartBudget {
  partType: string;
  /** max instances the player may place this level; omit for unlimited */
  limit?: number;
}

export interface LevelNarrative {
  intro?: string;
  outro?: string;
}

export interface Level {
  id: string;
  title: string;
  library: string; // PartLibrary id
  description?: string;
  narrative?: LevelNarrative;
  environment?: EnvironmentSpec;
  availableParts: PartBudget[];
  initialGraph: SystemGraph;
  goals: Criterion[];
  failConditions?: Criterion[];
  /** ticks per second when auto-playing */
  tickRate?: number;
  /** maximum ticks before the level ends in failure if goals aren't met */
  maxTicks?: number;
}

export interface SimulationHistoryEntry {
  tick: number;
  nodeQuantities: Record<NodeId, QuantityMap>;
}
