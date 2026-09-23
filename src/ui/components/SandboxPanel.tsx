import { useState } from "react";
import { useSimulationStore } from "../../store/simulationStore";
import { serializeCreation, type Comparator, type Criterion } from "../../engine";

const COMPARATORS: { value: Comparator; label: string }[] = [
  { value: "gte", label: "≥" },
  { value: "lte", label: "≤" },
  { value: "eq", label: "=" },
  { value: "gt", label: ">" },
  { value: "lt", label: "<" },
];

const GRAPH_CHECKS = [
  { value: "acyclic", label: "stays acyclic (no loops)" },
  { value: "connected", label: "stays connected" },
  { value: "noCrossingEdges", label: "has no crossing edges" },
  { value: "maxDegree", label: "no node exceeds a max degree" },
] as const;

function slug(text: string): string {
  return (
    text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || "creation"
  );
}

function downloadJson(filename: string, contents: string) {
  const blob = new Blob([contents], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function SandboxPanel() {
  const level = useSimulationStore((s) => s.level);
  const library = useSimulationStore((s) => s.library);
  const graph = useSimulationStore((s) => s.graph);
  const environment = useSimulationStore((s) => s.environment);
  const setCreationMeta = useSimulationStore((s) => s.setCreationMeta);
  const setGoals = useSimulationStore((s) => s.setGoals);
  const setEnvironmentQuantity = useSimulationStore((s) => s.setEnvironmentQuantity);
  const exportCreation = useSimulationStore((s) => s.exportCreation);

  const [kind, setKind] = useState<"threshold" | "streak" | "graph">("threshold");
  const [node, setNode] = useState("*");
  const [quantity, setQuantity] = useState(library?.quantities[0]?.id ?? "");
  const [comparator, setComparator] = useState<Comparator>("gte");
  const [value, setValue] = useState(1);
  const [turns, setTurns] = useState(5);
  const [delta, setDelta] = useState(false);
  const [graphCheck, setGraphCheck] = useState<(typeof GRAPH_CHECKS)[number]["value"]>("connected");

  if (!level || !library) return null;

  const placeableNodes = graph.nodes.filter((n) => n.id !== "environment");

  function addGoal() {
    let criterion: Criterion;
    if (kind === "threshold") {
      criterion = { kind: "threshold", node, quantity, comparator, value };
    } else if (kind === "streak") {
      criterion = { kind: "streak", node, quantity, comparator, value, turns, delta };
    } else {
      criterion = graphCheck === "maxDegree" ? { kind: "graph", check: graphCheck, value } : { kind: "graph", check: graphCheck };
    }
    setGoals([...level!.goals, criterion]);
  }

  function removeGoal(index: number) {
    setGoals(level!.goals.filter((_, i) => i !== index));
  }

  function handleExport() {
    const creation = exportCreation();
    if (!creation) return;
    downloadJson(`${slug(creation.title)}.json`, serializeCreation(creation));
  }

  return (
    <div className="sandbox-panel">
      <h3>Creation details</h3>
      <label className="sandbox-field">
        Title
        <input
          type="text"
          value={level.title}
          onChange={(e) => setCreationMeta({ title: e.target.value })}
          placeholder="Untitled creation"
        />
      </label>
      <label className="sandbox-field">
        Description
        <textarea
          value={level.description ?? ""}
          onChange={(e) => setCreationMeta({ description: e.target.value })}
          placeholder="What is this a model of?"
          rows={2}
        />
      </label>

      <h3>Environment</h3>
      <p className="sandbox-hint">Fixed values a node named "environment" can exchange with, if this library uses one.</p>
      {library.quantities.map((q) => (
        <label className="sandbox-field inline" key={q.id}>
          {q.name}
          <input
            type="number"
            className="mono"
            value={environment[q.id] ?? 0}
            onChange={(e) => setEnvironmentQuantity(q.id, Number(e.target.value))}
          />
        </label>
      ))}

      <h3>Goals</h3>
      {level.goals.length === 0 && <p className="sandbox-hint">No goals yet — this creation just runs.</p>}
      <ul className="sandbox-goal-list">
        {level.goals.map((g, i) => (
          <li key={i}>
            <span>{g.description ?? g.kind}</span>
            <button type="button" onClick={() => removeGoal(i)} aria-label="Remove goal">
              &times;
            </button>
          </li>
        ))}
      </ul>

      <div className="sandbox-goal-builder">
        <select value={kind} onChange={(e) => setKind(e.target.value as typeof kind)}>
          <option value="threshold">Threshold</option>
          <option value="streak">Streak (sustained)</option>
          <option value="graph">Graph shape</option>
        </select>

        {kind !== "graph" && (
          <>
            <select value={node} onChange={(e) => setNode(e.target.value)}>
              {kind === "threshold" && <option value="*">any unlocked node</option>}
              {placeableNodes.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.label ?? n.id}
                </option>
              ))}
            </select>
            <select value={quantity} onChange={(e) => setQuantity(e.target.value)}>
              {library.quantities.map((q) => (
                <option key={q.id} value={q.id}>
                  {q.name}
                </option>
              ))}
            </select>
            <select value={comparator} onChange={(e) => setComparator(e.target.value as Comparator)}>
              {COMPARATORS.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
            <input
              type="number"
              className="mono"
              value={value}
              onChange={(e) => setValue(Number(e.target.value))}
            />
          </>
        )}

        {kind === "streak" && (
          <>
            <label className="sandbox-field inline">
              for
              <input type="number" className="mono" min={1} value={turns} onChange={(e) => setTurns(Number(e.target.value))} />
              ticks
            </label>
            <label className="sandbox-field inline">
              <input type="checkbox" checked={delta} onChange={(e) => setDelta(e.target.checked)} />
              as a per-tick change
            </label>
          </>
        )}

        {kind === "graph" && (
          <>
            <select value={graphCheck} onChange={(e) => setGraphCheck(e.target.value as typeof graphCheck)}>
              {GRAPH_CHECKS.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
            {graphCheck === "maxDegree" && (
              <input
                type="number"
                className="mono"
                value={value}
                onChange={(e) => setValue(Number(e.target.value))}
              />
            )}
          </>
        )}

        <button type="button" onClick={addGoal}>
          Add goal
        </button>
      </div>

      <button type="button" className="export-button" onClick={handleExport}>
        Export &amp; share&hellip;
      </button>
    </div>
  );
}
