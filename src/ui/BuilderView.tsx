import { useEffect, useState } from "react";
import { useSimulationStore } from "../store/simulationStore";
import { useSimulationLoop } from "./useSimulationLoop";
import { Palette } from "./components/Palette";
import { Canvas } from "./components/Canvas";
import { GoalPanel } from "./components/GoalPanel";
import { SandboxPanel } from "./components/SandboxPanel";
import { Charts } from "./components/Charts";
import { SimControls } from "./components/SimControls";
import { NarrativeModal } from "./components/NarrativeModal";
import { playLose, playWin } from "./sfx";
import type { Creation } from "../engine";

export type BuilderMode =
  | { kind: "level"; systemId: string; levelId: string }
  | { kind: "sandbox"; systemId: string }
  | { kind: "creation"; creation: Creation };

interface BuilderViewProps {
  mode: BuilderMode;
  onBack: () => void;
}

export function BuilderView({ mode, onBack }: BuilderViewProps) {
  const loadLevel = useSimulationStore((s) => s.loadLevel);
  const loadSandbox = useSimulationStore((s) => s.loadSandbox);
  const loadCreation = useSimulationStore((s) => s.loadCreation);
  const level = useSimulationStore((s) => s.level);
  const status = useSimulationStore((s) => s.status);
  const [selectedEdgeType, setSelectedEdgeType] = useState<string | null>(null);
  const [showIntro, setShowIntro] = useState(true);
  const [showOutro, setShowOutro] = useState(false);

  const isAuthoring = mode.kind !== "level";

  useSimulationLoop();

  useEffect(() => {
    if (mode.kind === "level") loadLevel(mode.systemId, mode.levelId);
    else if (mode.kind === "sandbox") loadSandbox(mode.systemId);
    else loadCreation(mode.creation);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (status === "won") {
      playWin();
      if (level?.narrative?.outro) setShowOutro(true);
    } else if (status === "lost") {
      playLose();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  if (!level) return null;

  return (
    <div className="builder-view">
      <header className="builder-header">
        <button type="button" className="back-button" onClick={onBack}>
          &larr; Levels
        </button>
        <h2>{level.title}</h2>
        {isAuthoring && <span className="status-pill mono">sandbox</span>}
        <span className={`status-pill status-${status} mono`}>{status}</span>
      </header>
      <SimControls />
      <div className="builder-body">
        <Palette selectedEdgeType={selectedEdgeType} onSelectEdgeType={setSelectedEdgeType} />
        <Canvas selectedEdgeType={selectedEdgeType} onEdgePlaced={() => setSelectedEdgeType(null)} />
        <div className="sidebar">
          {isAuthoring ? <SandboxPanel /> : <GoalPanel />}
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
