import type { PartType } from "../../engine";
import { useSimulationStore } from "../../store/simulationStore";
import { PartIcon } from "./icons";

interface PaletteProps {
  selectedEdgeType: string | null;
  onSelectEdgeType: (partTypeId: string | null) => void;
}

function PartRow({
  part,
  remaining,
  selected,
  onClick,
  draggable,
}: {
  part: PartType;
  remaining: number | null;
  selected: boolean;
  onClick?: () => void;
  draggable: boolean;
}) {
  const disabled = remaining === 0;
  return (
    <div
      className={`palette-item${selected ? " selected" : ""}${disabled ? " disabled" : ""}`}
      draggable={draggable && !disabled}
      onDragStart={(e) => {
        e.dataTransfer.setData("application/x-part-type", part.id);
      }}
      onClick={disabled ? undefined : onClick}
      title={part.description}
    >
      <span className="swatch" style={{ color: part.color ?? "#888" }}>
        <PartIcon group={part.group} />
      </span>
      <span className="palette-label">{part.name}</span>
      <span className="palette-budget mono">{remaining === null ? "∞" : remaining}</span>
    </div>
  );
}

export function Palette({ selectedEdgeType, onSelectEdgeType }: PaletteProps) {
  const library = useSimulationStore((s) => s.library);
  const level = useSimulationStore((s) => s.level);
  const placedCounts = useSimulationStore((s) => s.placedCounts);

  if (!library || !level) return null;

  const budgetIds = new Set(level.availableParts.map((b) => b.partType));
  const nodeParts = library.partTypes.filter((p) => p.category === "node" && budgetIds.has(p.id));
  const edgeParts = library.partTypes.filter((p) => p.category === "edge" && budgetIds.has(p.id));

  function remainingFor(partTypeId: string): number | null {
    const budget = level!.availableParts.find((b) => b.partType === partTypeId);
    if (!budget || budget.limit === undefined) return null;
    return Math.max(0, budget.limit - (placedCounts[partTypeId] ?? 0));
  }

  return (
    <div className="palette">
      <div className="palette-section">
        <h3>Parts</h3>
        <p className="palette-hint">Drag onto the canvas.</p>
        {nodeParts.map((part) => (
          <PartRow key={part.id} part={part} remaining={remainingFor(part.id)} selected={false} draggable />
        ))}
      </div>
      <div className="palette-section">
        <h3>Connections</h3>
        <p className="palette-hint">Select, then click two nodes to link them.</p>
        {edgeParts.map((part) => (
          <PartRow
            key={part.id}
            part={part}
            remaining={remainingFor(part.id)}
            selected={selectedEdgeType === part.id}
            draggable={false}
            onClick={() => onSelectEdgeType(selectedEdgeType === part.id ? null : part.id)}
          />
        ))}
      </div>
    </div>
  );
}
