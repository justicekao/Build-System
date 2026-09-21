import { listSystems } from "../content/registry";

interface LevelSelectProps {
  onPick: (systemId: string, levelId: string) => void;
}

export function LevelSelect({ onPick }: LevelSelectProps) {
  const systems = listSystems();

  return (
    <div className="level-select">
      <header className="app-header">
        <h1>System Builder</h1>
        <p>Model anything as a network of parts, watch it evolve, meet the goals.</p>
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
          </div>
        </section>
      ))}
    </div>
  );
}
