import { ORBIT_KEY, VIEW3D_KEY, DEFAULT_TIME_RATE_INDEX } from "./constants.js";

/** Central mutable UI / simulation state (ES modules: mutate properties, not reassign imports). */
export const app = {
  /** @type {"simple" | "realistic"} */
  orbitMode: localStorage.getItem(ORBIT_KEY) === "realistic" ? "realistic" : "simple",
  camera: { camX: 0, camY: 0, vbW: 840 },
  simTimeMs: Date.now(),
  timeRateIndex: DEFAULT_TIME_RATE_INDEX >= 0 ? DEFAULT_TIME_RATE_INDEX : 8,
  /** @type {1 | -1} */
  timeDir: 1,
  lastTickPerf: performance.now(),
  /** @type {"ru"} */
  lang: "ru",
  /** Oblique “3D” chart (realistic scale only). */
  view3d:
    localStorage.getItem(ORBIT_KEY) === "realistic" && localStorage.getItem(VIEW3D_KEY) === "1",
  /** Registry body id to keep centred in the chart (2D or 3D); cleared by clicks outside the viewport frame. */
  trackedBodyId: /** @type {string | null} */ (null),
};

export function persistOrbitMode() {
  localStorage.setItem(ORBIT_KEY, app.orbitMode);
}

export function persistView3d() {
  localStorage.setItem(VIEW3D_KEY, app.view3d ? "1" : "0");
}
