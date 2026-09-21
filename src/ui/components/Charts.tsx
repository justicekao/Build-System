import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useSimulationStore } from "../../store/simulationStore";
import { ENVIRONMENT_NODE_ID } from "../../engine";

export function Charts() {
  const graph = useSimulationStore((s) => s.graph);
  const history = useSimulationStore((s) => s.history);
  const library = useSimulationStore((s) => s.library);
  const [nodeId, setNodeId] = useState<string | null>(null);

  const selectableNodes = graph.nodes.filter((n) => n.id !== ENVIRONMENT_NODE_ID);
  const activeNodeId = nodeId ?? selectableNodes[0]?.id ?? null;

  const data = useMemo(() => {
    if (!activeNodeId) return [];
    return history.map((snapshot, tick) => {
      const node = snapshot.nodes.find((n) => n.id === activeNodeId);
      const row: Record<string, number> = { tick };
      for (const q of library?.quantities ?? []) {
        row[q.id] = node?.quantities[q.id] ?? 0;
      }
      return row;
    });
  }, [history, activeNodeId, library]);

  if (!library || selectableNodes.length === 0) return null;

  return (
    <div className="charts-panel">
      <div className="charts-header">
        <h3>Quantities over time</h3>
        <select value={activeNodeId ?? ""} onChange={(e) => setNodeId(e.target.value)}>
          {selectableNodes.map((n) => (
            <option key={n.id} value={n.id}>
              {n.label ?? n.id}
            </option>
          ))}
        </select>
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data} margin={{ top: 8, right: 16, left: -8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--grid-color)" vertical={false} />
          <XAxis dataKey="tick" tick={{ fontSize: 11 }} stroke="var(--fg-muted)" label={{ value: "tick", position: "insideBottom", offset: -2, fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} stroke="var(--fg-muted)" width={40} />
          <Tooltip contentStyle={{ fontSize: 12 }} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          {(library.quantities ?? []).map((q) => (
            <Line
              key={q.id}
              type="monotone"
              dataKey={q.id}
              name={q.name}
              stroke={q.color ?? "#888"}
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
