import { useSimulationStore } from "../../store/simulationStore";
import type { Criterion } from "../../engine";

function describe(criterion: Criterion): string {
  if (criterion.description) return criterion.description;
  switch (criterion.kind) {
    case "threshold":
      return `${criterion.node} ${criterion.quantity} ${criterion.comparator} ${criterion.value}`;
    case "streak":
      return `${criterion.node} ${criterion.quantity} ${criterion.comparator} ${criterion.value} for ${criterion.turns} ticks`;
    case "graph":
      return `graph: ${criterion.check}`;
    case "formula":
      return criterion.expression;
  }
}

export function GoalPanel() {
  const goalResults = useSimulationStore((s) => s.goalResults);
  const failResults = useSimulationStore((s) => s.failResults);
  const status = useSimulationStore((s) => s.status);

  return (
    <div className="goal-panel">
      <h3>Goals</h3>
      <ul className="criteria-list">
        {goalResults.map((r, i) => (
          <li key={i} className={r.satisfied ? "satisfied" : "pending"}>
            <span className="criteria-icon">{r.satisfied ? "✓" : "○"}</span>
            {describe(r.criterion)}
          </li>
        ))}
      </ul>
      {failResults.length > 0 && (
        <>
          <h3>Avoid</h3>
          <ul className="criteria-list">
            {failResults.map((r, i) => (
              <li key={i} className={r.satisfied ? "failed" : "safe"}>
                <span className="criteria-icon">{r.satisfied ? "✗" : "○"}</span>
                {describe(r.criterion)}
              </li>
            ))}
          </ul>
        </>
      )}
      {status === "won" && <div className="status-banner won">Goals met!</div>}
      {status === "lost" && <div className="status-banner lost">Failed — try again.</div>}
    </div>
  );
}
