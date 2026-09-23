import { useState } from "react";
import { LevelSelect } from "./ui/LevelSelect";
import { BuilderView, type BuilderMode } from "./ui/BuilderView";
import type { Creation } from "./engine";
import "./App.css";

function App() {
  const [mode, setMode] = useState<BuilderMode | null>(null);

  if (!mode) {
    return (
      <LevelSelect
        onPick={(systemId, levelId) => setMode({ kind: "level", systemId, levelId })}
        onSandbox={(systemId) => setMode({ kind: "sandbox", systemId })}
        onImport={(creation: Creation) => setMode({ kind: "creation", creation })}
      />
    );
  }

  const key =
    mode.kind === "level"
      ? `level:${mode.systemId}/${mode.levelId}`
      : mode.kind === "sandbox"
        ? `sandbox:${mode.systemId}`
        : `creation:${mode.creation.libraryId}:${mode.creation.title}`;

  return <BuilderView key={key} mode={mode} onBack={() => setMode(null)} />;
}

export default App;
