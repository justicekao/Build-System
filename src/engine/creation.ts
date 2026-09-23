// A "Creation" is what Sandbox mode exports: a player-built graph plus
// whatever goals they authored for it, bound to one PartLibrary. It's the
// file-based sharing mechanism — export downloads one as JSON, import reads
// one back in and validates it against the importer's own copy of that
// library before it's allowed to load. No backend, no accounts: passing the
// file around (Discord, email, a forum post) is the whole distribution
// story for now.

import type { Criterion, PartLibrary, QuantityMap, SystemGraph } from "./types";

export const CREATION_FORMAT_VERSION = 1;

export interface Creation {
  formatVersion: number;
  libraryId: string;
  title: string;
  description?: string;
  graph: SystemGraph;
  environment: QuantityMap;
  goals: Criterion[];
}

export class CreationValidationError extends Error {}

export function serializeCreation(creation: Creation): string {
  return JSON.stringify(creation, null, 2);
}

function isSystemGraph(value: unknown): value is SystemGraph {
  if (typeof value !== "object" || value === null) return false;
  const g = value as Record<string, unknown>;
  return Array.isArray(g.nodes) && Array.isArray(g.edges);
}

/** Parses and validates a creation file against the library it claims to target. */
export function parseCreation(raw: string, library: PartLibrary): Creation {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new CreationValidationError("That file isn't valid JSON.");
  }
  if (typeof data !== "object" || data === null) {
    throw new CreationValidationError("Expected a JSON object at the top level.");
  }
  const obj = data as Record<string, unknown>;

  if (obj.formatVersion !== CREATION_FORMAT_VERSION) {
    throw new CreationValidationError(
      `Unsupported creation format version "${String(obj.formatVersion)}" (expected ${CREATION_FORMAT_VERSION}).`,
    );
  }
  if (typeof obj.libraryId !== "string" || !obj.libraryId) {
    throw new CreationValidationError("Missing libraryId.");
  }
  if (obj.libraryId !== library.id) {
    throw new CreationValidationError(
      `This creation was built for the "${obj.libraryId}" system, not "${library.id}". Open it from the matching system instead.`,
    );
  }
  if (typeof obj.title !== "string" || !obj.title.trim()) {
    throw new CreationValidationError("Missing a title.");
  }
  if (!isSystemGraph(obj.graph)) {
    throw new CreationValidationError("Missing or malformed graph.");
  }

  const knownParts = new Set(library.partTypes.map((p) => p.id));
  const nodeIds = new Set<string>();
  for (const node of obj.graph.nodes) {
    if (!node || typeof node !== "object" || typeof node.id !== "string" || typeof node.partType !== "string") {
      throw new CreationValidationError("A node is missing an id or partType.");
    }
    if (!knownParts.has(node.partType)) {
      throw new CreationValidationError(`Node "${node.id}" uses unknown part "${node.partType}".`);
    }
    nodeIds.add(node.id);
  }
  for (const edge of obj.graph.edges) {
    if (
      !edge ||
      typeof edge !== "object" ||
      typeof edge.id !== "string" ||
      typeof edge.partType !== "string" ||
      typeof edge.source !== "string" ||
      typeof edge.target !== "string"
    ) {
      throw new CreationValidationError("An edge is missing an id, partType, source, or target.");
    }
    if (!knownParts.has(edge.partType)) {
      throw new CreationValidationError(`Edge "${edge.id}" uses unknown part "${edge.partType}".`);
    }
    if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) {
      throw new CreationValidationError(`Edge "${edge.id}" references a node that isn't in the graph.`);
    }
  }

  const environment =
    typeof obj.environment === "object" && obj.environment !== null ? (obj.environment as QuantityMap) : {};
  const goals = Array.isArray(obj.goals) ? (obj.goals as Criterion[]) : [];

  return {
    formatVersion: CREATION_FORMAT_VERSION,
    libraryId: obj.libraryId,
    title: obj.title,
    description: typeof obj.description === "string" ? obj.description : undefined,
    graph: obj.graph,
    environment,
    goals,
  };
}
