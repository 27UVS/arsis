import { TIME_RATE_STEPS, DEFAULT_TIME_RATE_INDEX } from "./constants.js";
import { app } from "./state.js";

export function getTimeRate() {
  return TIME_RATE_STEPS[app.timeRateIndex] ?? 1;
}

export function resetSimTime() {
  app.simTimeMs = Date.now();
  app.timeRateIndex = DEFAULT_TIME_RATE_INDEX >= 0 ? DEFAULT_TIME_RATE_INDEX : 8;
  app.lastTickPerf = performance.now();
}

export function shiftSimTime(deltaMs) {
  app.simTimeMs += deltaMs;
}

export function stepTimeRate(dir) {
  const n = TIME_RATE_STEPS.length;
  app.timeRateIndex = Math.max(0, Math.min(n - 1, app.timeRateIndex + dir));
}

export function fmtUtc(ms) {
  const d = new Date(ms);
  return d.toISOString().replace("T", " ").replace(/\.\d{3}Z$/, " UTC");
}

export function tickSimClock(perfNow) {
  const dPerf = perfNow - app.lastTickPerf;
  app.lastTickPerf = perfNow;
  app.simTimeMs += dPerf * getTimeRate();
}
