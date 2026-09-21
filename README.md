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
  evaluator, tick function, graph analysis, criteria evaluator), with unit
  tests in `src/engine/__tests__/`.
- `src/content/cell/` — a biological-cell content pack: organelles,
  membrane channels vs. active transporters, three levels (nutrient-rich,
  oxygen-limited, and a toxic-efflux scenario requiring active pumping
  against the gradient).
- `src/content/city/` — an outpost-network content pack: builders/cargo/
  fleet flowing over routes, three levels exercising graph constraints
  (acyclic, non-crossing, max degree) and dynamical constraints (sustained
  thresholds, exact per-tick growth).
- `src/store/simulationStore.ts` — the zustand store driving one level's
  live graph, tick history, and goal/fail status.
- `src/ui/` — the React Flow canvas (drag parts from the palette, click two
  nodes with a connection tool selected to link them), goal/fail panel,
  recharts time-series per node, and intro/outro narrative modals.
