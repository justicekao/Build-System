import { useState } from "react";
import { useSimulationStore } from "../../store/simulationStore";
import { isMuted, setMuted } from "../sfx";

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
  const [muted, setMutedState] = useState(isMuted);

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
        <span className="mono">{speed}x</span>
      </label>
      <span className="tick-counter mono">tick {tick}</span>
      <button type="button" className="reset-button" onClick={reset}>
        Reset level
      </button>
      <button
        type="button"
        className="mute-toggle"
        onClick={() => {
          const next = !muted;
          setMuted(next);
          setMutedState(next);
        }}
        title={muted ? "Unmute sound" : "Mute sound"}
      >
        {muted ? "\u{1F507}" : "\u{1F50A}"}
      </button>
    </div>
  );
}
