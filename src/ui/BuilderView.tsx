import { useEffect, useState } from "react";
import { useSimulationStore } from "../store/simulationStore";
import { useSimulationLoop } from "./useSimulationLoop";
import { Palette } from "./components/Palette";
import { Canvas } from "./components/Canvas";
import { GoalPanel } from "./components/GoalPanel";
import { Charts } from "./components/Charts";
import { SimControls } from "./components/SimControls";
import { NarrativeModal } from "./components/NarrativeModal";

interface BuilderViewProps {
  systemId: string;
  levelId: string;
  onBack: () => void;
}

export function BuilderView({ systemId, levelId, onBack }: BuilderViewProps) {
  const loadLevel = useSimulationStore((s) => s.loadLevel);
  const level = useSimulationStore((s) => s.level);
  const status = useSimulationStore((s) => s.status);
  const [selectedEdgeType, setSelectedEdgeType] = useState<string | null>(null);
  const [showIntro, setShowIntro] = useState(true);
  const [showOutro, setShowOutro] = useState(false);

  useSimulationLoop();

  useEffect(() => {
    loadLevel(systemId, levelId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (status === "won" && level?.narrative?.outro) setShowOutro(true);
  }, [status, level]);

  if (!level) return null;

  return (
    <div className="builder-view">
      <header className="builder-header">
        <button type="button" className="back-button" onClick={onBack}>
          &larr; Levels
        </button>
        <h2>{level.title}</h2>
        <span className={`status-pill status-${status}`}>{status}</span>
      </header>
      <SimControls />
      <div className="builder-body">
        <Palette selectedEdgeType={selectedEdgeType} onSelectEdgeType={setSelectedEdgeType} />
        <Canvas selectedEdgeType={selectedEdgeType} onEdgePlaced={() => setSelectedEdgeType(null)} />
        <div className="sidebar">
          <GoalPanel />
          <Charts />
        </div>
      </div>
      {showIntro && level.narrative?.intro && (
        <NarrativeModal
          title={level.title}
          text={level.narrative.intro}
          closeLabel="Begin"
          onClose={() => setShowIntro(false)}
        />
      )}
      {showOutro && level.narrative?.outro && (
        <NarrativeModal
          title="Level complete"
          text={level.narrative.outro}
          closeLabel="Nice"
          onClose={() => setShowOutro(false)}
        />
      )}
    </div>
  );
}
