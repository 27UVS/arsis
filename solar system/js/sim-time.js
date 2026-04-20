import { TIME_RATE_STEPS, DEFAULT_TIME_RATE_INDEX } from "./constants.js";
import { app } from "./state.js";

export function getTimeRate() {
  const s = TIME_RATE_STEPS[app.timeRateIndex] ?? 1;
  const dir = app.timeDir === -1 ? -1 : 1;
  return s * dir;
}

export function resetSimTime() {
  app.simTimeMs = Date.now();
  app.timeRateIndex = DEFAULT_TIME_RATE_INDEX >= 0 ? DEFAULT_TIME_RATE_INDEX : 8;
  app.timeDir = 1;
  app.lastTickPerf = performance.now();
}

export function shiftSimTime(deltaMs) {
  app.simTimeMs += deltaMs;
}

export function stepTimeRate(dir) {
  const n = TIME_RATE_STEPS.length;
  app.timeRateIndex = Math.max(0, Math.min(n - 1, app.timeRateIndex + dir));
}

export function speedForward() {
  app.timeDir = 1;
  stepTimeRate(1);
}

export function speedBackward() {
  app.timeDir = -1;
  stepTimeRate(1);
}

export function slowDownTime() {
  stepTimeRate(-1);
  if (app.timeRateIndex === (DEFAULT_TIME_RATE_INDEX >= 0 ? DEFAULT_TIME_RATE_INDEX : 8)) {
    app.timeDir = 1;
  }
}

export function fmtUtc(ms) {
  const d = new Date(ms);
  return d.toISOString().replace("T", " ").replace(/\.\d{3}Z$/, " UTC");
}

const DISPLAY_YEAR_SHIFT = 1460; // 2006→3466 etc. Display-only; simulation stays in real UTC.

/**
 * Display UTC timestamp with shifted year (e.g. +1480y) while keeping other fields unchanged.
 * @param {number} ms
 */
export function fmtUtcDisplay(ms) {
  const d = new Date(ms);
  d.setUTCFullYear(d.getUTCFullYear() + DISPLAY_YEAR_SHIFT);
  return d.toISOString().replace("T", " ").replace(/\.\d{3}Z$/, " UTC");
}

export function tickSimClock(perfNow) {
  const dPerf = perfNow - app.lastTickPerf;
  app.lastTickPerf = perfNow;
  app.simTimeMs += dPerf * getTimeRate();
}
