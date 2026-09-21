import { useSimulationStore } from "../../store/simulationStore";

export function SimControls() {
  const playing = useSimulationStore((s) => s.playing);
  const speed = useSimulationStore((s) => s.speed);
  const tick = useSimulationStore((s) => s.tick);
  const status = useSimulationStore((s) => s.status);
  const play = useSimulationStore((s) => s.play);
  const pause = useSimulationStore((s) => s.pause);
  const setSpeed = useSimulationStore((s) => s.setSpeed);
  const tickOnce = useSimulationStore((s) => s.tickOnce);
  const reset = useSimulationStore((s) => s.reset);

  const ended = status === "won" || status === "lost";

  return (
    <div className="sim-controls">
      <button type="button" onClick={() => (playing ? pause() : play())} disabled={ended}>
        {playing ? "Pause" : "Play"}
      </button>
      <button type="button" onClick={tickOnce} disabled={playing || ended}>
        Step
      </button>
      <label className="speed-control">
        Speed
        <input
          type="range"
          min={0.5}
          max={10}
          step={0.5}
          value={speed}
          onChange={(e) => setSpeed(Number(e.target.value))}
        />
        <span>{speed}x</span>
      </label>
      <span className="tick-counter">tick {tick}</span>
      <button type="button" className="reset-button" onClick={reset}>
        Reset level
      </button>
    </div>
  );
}
