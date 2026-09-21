// Discovers content packs from plain JSON text files under src/content/.
// Adding a brand-new system to the sandbox never touches this file or the
// engine: drop a `library.json` (PartLibrary) under a new folder plus one or
// more `levels/*.json` (Level) files that reference it by id, and both show
// up automatically. See README.md for the walkthrough.

import type { Level, PartLibrary } from "../engine";

const libraryModules = import.meta.glob("./*/library.json", { eager: true }) as Record<
  string,
  { default: PartLibrary }
>;
const levelModules = import.meta.glob("./*/levels/*.json", { eager: true }) as Record<
  string,
  { default: Level }
>;

function validateLibrary(path: string, library: PartLibrary) {
  if (!library.id || !library.name || !Array.isArray(library.partTypes)) {
    throw new Error(`${path}: a library needs an "id", "name", and "partTypes" array.`);
  }
  const seen = new Set<string>();
  for (const part of library.partTypes) {
    if (seen.has(part.id)) {
      throw new Error(`${path}: duplicate partType id "${part.id}".`);
    }
    seen.add(part.id);
  }
}

function validateLevel(path: string, level: Level, libraries: Map<string, PartLibrary>) {
  if (!level.id || !level.title || !level.library) {
    throw new Error(`${path}: a level needs an "id", "title", and "library".`);
  }
  const library = libraries.get(level.library);
  if (!library) {
    throw new Error(`${path}: references unknown library "${level.library}".`);
  }
  const knownParts = new Set(library.partTypes.map((p) => p.id));
  for (const budget of level.availableParts) {
    if (!knownParts.has(budget.partType)) {
      throw new Error(
        `${path}: availableParts references unknown partType "${budget.partType}" (not in library "${library.id}").`,
      );
    }
  }
  for (const node of level.initialGraph.nodes) {
    if (!knownParts.has(node.partType)) {
      throw new Error(
        `${path}: node "${node.id}" uses unknown partType "${node.partType}" (not in library "${library.id}").`,
      );
    }
  }
  for (const edge of level.initialGraph.edges) {
    if (!knownParts.has(edge.partType)) {
      throw new Error(
        `${path}: edge "${edge.id}" uses unknown partType "${edge.partType}" (not in library "${library.id}").`,
      );
    }
  }
}

export interface SystemPack {
  library: PartLibrary;
  levels: Level[];
}

function buildRegistry(): Map<string, SystemPack> {
  const libraries = new Map<string, PartLibrary>();
  for (const [path, mod] of Object.entries(libraryModules)) {
    const library = mod.default;
    validateLibrary(path, library);
    if (libraries.has(library.id)) {
      throw new Error(`Duplicate library id "${library.id}" (see ${path}).`);
    }
    libraries.set(library.id, library);
  }

  const levelsByLibrary = new Map<string, Level[]>();
  for (const [path, mod] of Object.entries(levelModules)) {
    const level = mod.default;
    validateLevel(path, level, libraries);
    const list = levelsByLibrary.get(level.library) ?? [];
    list.push(level);
    levelsByLibrary.set(level.library, list);
  }

  const registry = new Map<string, SystemPack>();
  for (const [id, library] of libraries) {
    const levels = (levelsByLibrary.get(id) ?? []).sort((a, b) => a.id.localeCompare(b.id));
    registry.set(id, { library, levels });
  }
  return registry;
}

let cached: Map<string, SystemPack> | null = null;

export function getRegistry(): Map<string, SystemPack> {
  if (!cached) cached = buildRegistry();
  return cached;
}

export function getSystemPack(systemId: string): SystemPack | undefined {
  return getRegistry().get(systemId);
}

export function getLevel(systemId: string, levelId: string): Level | undefined {
  return getSystemPack(systemId)?.levels.find((l) => l.id === levelId);
}

export function listSystems(): SystemPack[] {
  return Array.from(getRegistry().values());
}
