import { app } from "./state.js";
import { OBJECTS, MOONS, objectWorldPosition } from "./model.js";
import { applyViewBox } from "./camera-view.js";

const REGISTRY_IDS = new Set([
  ...OBJECTS.filter((o) => !o.marker || o.marker === "sun").map((o) => o.id),
  ...MOONS.map((m) => m.id),
]);
const PICKABLE_IDS = new Set([...OBJECTS.map((o) => o.id), ...MOONS.map((m) => m.id)]);

export function isRegistryBodyId(id) {
  return typeof id === "string" && REGISTRY_IDS.has(id);
}

export function setTrackedBodyId(id) {
  const s = String(id ?? "").trim();
  app.trackedBodyId = PICKABLE_IDS.has(s) ? s : null;
}

export function clearTrackedBody() {
  app.trackedBodyId = null;
}

export function getTrackedBodyId() {
  return app.trackedBodyId;
}

/** Recentre 2D viewBox on the tracked body each frame (zoom / pan are kept; pan is disabled while tracking). */
export function applyChartFollow2d(state, nowMs) {
  const id = app.trackedBodyId;
  if (!id || app.view3d) return;
  const { x, y } = objectWorldPosition(state, nowMs, id);
  app.camera.camX = x;
  app.camera.camY = y;
  applyViewBox();
}

/**
 * @param {PointerEvent} e
 * @returns {string | null}
 */
export function tryPickSvgBodyFromEvent(e) {
  if (!(e.target instanceof Element)) return null;
  const g = e.target.closest('g[id^="body-"]');
  if (g?.id) {
    const id = g.id.slice("body-".length);
    return PICKABLE_IDS.has(id) ? id : null;
  }
  const lbl = e.target.closest('text.chart-label[id^="label-"]');
  if (lbl?.id) {
    const id = lbl.id.slice("label-".length);
    return PICKABLE_IDS.has(id) ? id : null;
  }
  return null;
}

/** Clicks outside `#viewport-frame` clear follow, except when interacting with side panels. */
export function wireTrackedBodyOutsidePointer() {
  document.addEventListener("pointerdown", (e) => {
    const t = e.target;
    if (!(t instanceof Element)) return;
    if (t.closest(".panel--left") || t.closest(".panel--right")) return;
    const frame = document.getElementById("viewport-frame");
    if (frame && frame.contains(t)) return;
    clearTrackedBody();
  });
}
