import { useEffect } from "react";
import { useSimulationStore } from "../store/simulationStore";

/** Drives the tick loop with a plain interval whenever the store says we're playing. */
export function useSimulationLoop() {
  const playing = useSimulationStore((s) => s.playing);
  const speed = useSimulationStore((s) => s.speed);

  useEffect(() => {
    if (!playing) return;
    const intervalMs = 1000 / speed;
    const id = window.setInterval(() => {
      useSimulationStore.getState().tickOnce();
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [playing, speed]);
}
