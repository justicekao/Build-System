# System Builder

A sandbox where you model *anything* as a network of parts and watch it evolve —
a biological cell, a supply network, or something you invent — then check it
against level goals. Underneath the two included games (a cell builder and a
city/outpost network builder), it's one generic engine: typed nodes and edges,
numeric quantities, small rules that move those quantities each tick, and
declarative goal/fail criteria. Nothing about the engine is specific to
biology or logistics; the domain lives entirely in JSON content packs.

## Running it

```
npm install
npm run dev       # dev server
npm run test      # engine unit tests (vitest)
npm run build     # typecheck + production build
```

## How the engine models a system

- **Nodes** are compartments/entities (a mitochondrion, an outpost). Each has
  numeric **quantities** (glucose, population, ...).
- **Edges** connect two nodes (a membrane channel, a supply route) and can
  move a quantity between them every tick.
- **PartTypes** define what a node or edge *is*: its color, its default
  quantities, and the **rules** attached to it. A rule is one of:
  - `diffusion` — flow proportional to the concentration gradient (moves
    high → low, direction not fixed)
  - `fixedFlow` — a constant amount per tick, capped by what's available
  - `source` / `sink` — a node produces or consumes a quantity on its own
  - `formula` — an arbitrary expression (`min(glucose, oxygen) * 0.4`, etc.)
    computing a per-tick delta, so a rule can depend on more than one quantity
- A **PartLibrary** (`library.json`) is the palette of PartTypes plus the
  Quantities they operate on, for one domain.
- A **Level** (`levels/*.json`) is pure data: which parts are available and
  how many of each, the starting graph, the environment (a fixed, infinite
  reservoir extra nodes can exchange with — extracellular fluid, open space),
  the goal criteria, and optional fail conditions, intro/outro narrative, and
  tick rate.
- **Criteria** (goals/fail conditions) are declarative:
  - `threshold` — a quantity compares to a value (optionally "every unlocked node")
  - `streak` — a condition (optionally a *delta*, e.g. "+2 per tick") holds
    for N consecutive ticks
  - `graph` — `acyclic`, `connected`, `noCrossingEdges` (checked against the
    actual 2D layout, so it's a real playability constraint, not an abstract
    one), or `maxDegree`
  - `formula` — any expression over every node's quantities (`cellA.glucose - cellB.glucose`)

Every tick is a plain forward-Euler step (`src/engine/simulate.ts`): compute
every rule's delta from a frozen snapshot of the current state, then apply
them all at once, so rule order never matters and the result is deterministic.

## Sandbox mode: build and share your own model

Every content pack gets a "Sandbox" card on the level-select screen, next to
its real levels. It's a blank canvas with every part in that library
available and no budget limit — the same builder UI, engine, and simulation
loop as a real level, just without a pre-authored puzzle. From there you can:

- Build whatever graph you want.
- Set the environment's fixed reservoir values, if the library uses one.
- Author your own goals through a small form (threshold / sustained streak /
  graph-shape criteria) — the same `Criterion` types real levels use.
- **Export** the result as a downloadable JSON file (a "creation"), and
  **Import** one someone sent you from the level-select screen.

There's no backend and no accounts — sharing a creation today means sending
the exported `.json` file directly (Discord, email, a forum post), the same
way you'd share a save file. `src/engine/creation.ts` defines the format and
validates an imported file against the importer's own copy of the target
library before it's allowed to load (unknown parts, malformed nodes/edges,
and format-version mismatches are all rejected with a specific error, not a
silent failure). An imported creation opens back up in the same sandbox
editor, so importing and then remixing someone else's model is the same
action as building your own.

This is also the shape a real creator-marketplace pipeline would build on
top of later: the export format is already the unit you'd upload, and the
import validation is already most of what a submission review step needs.

## Adding a brand-new system

You don't need to touch any code. Drop two things under `src/content/`:

1. `<your-system>/library.json` — a `PartLibrary` (see `src/engine/types.ts`
   for the exact shape, or copy `src/content/cell/library.json` as a
   starting point).
2. `<your-system>/levels/<level-id>.json` — one or more `Level` files that
   set `"library"` to your library's `id`.

The content registry (`src/content/registry.ts`) discovers both via a glob at
build time, validates that every `partType` reference actually exists in the
named library, and the new system shows up on the level-select screen
automatically. Existing levels are plain, git-diffable JSON, so tuning a
level — a starting concentration, a goal threshold, a part's rate — is a text
edit, no rebuild logic to touch.

### Known simplifications worth knowing about

- Quantities never go negative (each tick clamps at 0), which is a
  simplification of true Euler integration — a formula rule that would drive
  a value negative just gets clamped, not partially applied.
- Independent edges reading the same source node in one tick don't compete
  for it — each is checked against that node's start-of-tick value, so two
  `fixedFlow` edges *can* jointly overdraw a node in the same tick (the
  result still clamps at 0, so it never goes negative, but the combined draw
  can exceed what was actually available). This only matters right at
  depletion, not in normal play.

## What's included

- `src/engine/` — the domain-agnostic simulation engine (expression
  evaluator, tick function, graph analysis, criteria evaluator, creation
  serialization), with unit tests in `src/engine/__tests__/`.
- `src/content/cell/` — a biological-cell content pack: organelles, membrane
  channels vs. active transporters, six levels escalating from a plain
  nutrient-rich cell through oxygen limitation, active waste efflux vs.
  on-site detox, glucose/ATP allocation between competing organelles, and a
  capstone combining all of it.
- `src/content/city/` — an outpost-network content pack: six levels
  escalating from basic tree/connectivity constraints through planarity, a
  third (intel) resource type, self-sustaining organic growth, and a
  capstone network combining graph-shape and sustained-threshold goals.
- `src/store/simulationStore.ts` — the zustand store driving one level's
  live graph, tick history, and goal/fail status, plus the sandbox-specific
  actions (`loadSandbox`, `loadCreation`, `exportCreation`, `setGoals`, …).
- `src/ui/` — the React Flow canvas (drag parts from the palette, click two
  nodes with a connection tool selected to link them), goal/fail panel,
  recharts time-series per node, intro/outro narrative modals, per-part-type
  icon set (`src/ui/components/icons.tsx`), synthesized SFX with a mute
  toggle (`src/ui/sfx.ts`, no audio asset files), and the sandbox
  build/author/export UI (`src/ui/components/SandboxPanel.tsx`).
