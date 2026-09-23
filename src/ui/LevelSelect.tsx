import { useRef, useState } from "react";
import { listSystems, getSystemPack } from "../content/registry";
import { parseCreation, type Creation } from "../engine";

interface LevelSelectProps {
  onPick: (systemId: string, levelId: string) => void;
  onSandbox: (systemId: string) => void;
  onImport: (creation: Creation) => void;
}

export function LevelSelect({ onPick, onSandbox, onImport }: LevelSelectProps) {
  const systems = listSystems();
  const fileInput = useRef<HTMLInputElement>(null);
  const [importError, setImportError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setImportError(null);
    try {
      const raw = await file.text();
      const peek = JSON.parse(raw) as { libraryId?: unknown };
      if (typeof peek.libraryId !== "string") {
        throw new Error("This file doesn't look like a System Builder creation (no libraryId).");
      }
      const pack = getSystemPack(peek.libraryId);
      if (!pack) {
        throw new Error(`This creation needs the "${peek.libraryId}" system, which isn't installed.`);
      }
      const creation = parseCreation(raw, pack.library);
      onImport(creation);
    } catch (err) {
      setImportError(err instanceof Error ? err.message : "Couldn't read that file.");
    }
  }

  return (
    <div className="level-select">
      <header className="app-header">
        <h1>System Builder</h1>
        <p>Model anything as a network of parts, watch it evolve, meet the goals.</p>
        <div className="import-row">
          <button type="button" className="import-button" onClick={() => fileInput.current?.click()}>
            Import a shared creation&hellip;
          </button>
          <input
            ref={fileInput}
            type="file"
            accept="application/json"
            className="visually-hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleFile(file);
              e.target.value = "";
            }}
          />
          {importError && <span className="import-error">{importError}</span>}
        </div>
      </header>
      {systems.map((pack) => (
        <section key={pack.library.id} className="system-section">
          <h2>{pack.library.name}</h2>
          <div className="level-grid">
            {pack.levels.map((level) => (
              <button
                key={level.id}
                type="button"
                className="level-card"
                onClick={() => onPick(pack.library.id, level.id)}
              >
                <h3>{level.title}</h3>
                <p>{level.description}</p>
              </button>
            ))}
            <button
              type="button"
              className="level-card sandbox-card"
              onClick={() => onSandbox(pack.library.id)}
            >
              <h3>Sandbox</h3>
              <p>Build anything this library allows, from a blank canvas. Author your own goals, export and share it.</p>
            </button>
          </div>
        </section>
      ))}
    </div>
  );
}
