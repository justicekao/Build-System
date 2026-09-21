import { useState } from "react";
import { LevelSelect } from "./ui/LevelSelect";
import { BuilderView } from "./ui/BuilderView";
import "./App.css";

interface Selection {
  systemId: string;
  levelId: string;
}

function App() {
  const [selection, setSelection] = useState<Selection | null>(null);

  if (!selection) {
    return <LevelSelect onPick={(systemId, levelId) => setSelection({ systemId, levelId })} />;
  }

  return (
    <BuilderView
      key={`${selection.systemId}/${selection.levelId}`}
      systemId={selection.systemId}
      levelId={selection.levelId}
      onBack={() => setSelection(null)}
    />
  );
}

export default App;
