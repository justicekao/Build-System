import { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import type { PartLibrary } from "../../engine";
import { PartIcon } from "./icons";

export interface SystemNodeData {
  label: string;
  color: string;
  group?: string;
  locked: boolean;
  quantities: Record<string, number>;
  library: PartLibrary;
  isPendingSource: boolean;
  [key: string]: unknown;
}

function SystemNodeImpl({ data, selected }: { data: SystemNodeData; selected: boolean }) {
  const quantityDefs = data.library.quantities;
  return (
    <div
      className={`system-node${data.locked ? " locked" : ""}${selected ? " selected" : ""}${
        data.isPendingSource ? " pending-source" : ""
      }`}
      style={{ borderColor: data.color }}
    >
      <Handle type="target" position={Position.Left} className="anchor-handle" style={{ left: "50%", top: "50%" }} />
      <Handle type="source" position={Position.Right} className="anchor-handle" style={{ left: "50%", top: "50%" }} />
      <div className="system-node-header" style={{ background: data.color }}>
        <PartIcon group={data.group} className="node-header-icon" />
        {data.label}
        {data.locked && <span className="lock-icon" title="Locked — cannot be removed">&#128274;</span>}
      </div>
      <div className="system-node-body">
        {quantityDefs.map((q) => {
          const value = data.quantities[q.id];
          if (value === undefined) return null;
          return (
            <div className="quantity-row" key={q.id}>
              <span className="quantity-dot" style={{ background: q.color ?? "#888" }} />
              <span className="quantity-name">{q.name}</span>
              <span className="quantity-value mono" key={value}>
                {value.toFixed(1)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export const SystemNode = memo(SystemNodeImpl);
