import { VIEWBOX_MIN_W, VIEWBOX_MAX_W } from "./constants.js";
import { app } from "./state.js";
import { applyViewBox } from "./camera-view.js";
import { tryPickSvgBodyFromEvent, setTrackedBodyId, getTrackedBodyId } from "./track-follow.js";

function chartIs3d() {
  return app.view3d;
}

let _vbRaf = 0;
function requestViewBox() {
  if (_vbRaf) return;
  _vbRaf = requestAnimationFrame(() => {
    _vbRaf = 0;
    applyViewBox();
  });
}

/** @type {{ x: number; y: number } | null} */
let drag = null;

export function resetInteraction() {
  drag = null;
  if (_vbRaf) cancelAnimationFrame(_vbRaf);
  _vbRaf = 0;
}

export function onWheel(e) {
  if (chartIs3d()) return;
  const svg = document.getElementById("system");
  if (!svg || !e.target || !svg.contains(/** @type {Node} */ (e.target))) return;
  e.preventDefault();
  const rect = svg.getBoundingClientRect();
  const aspectPx = rect.width / Math.max(1, rect.height);
  const vbH = app.camera.vbW / aspectPx;
  const u = (e.clientX - rect.left) / rect.width;
  const v = (e.clientY - rect.top) / rect.height;
  const wx = app.camera.camX - app.camera.vbW / 2 + u * app.camera.vbW;
  const wy = app.camera.camY - vbH / 2 + v * vbH;
  const factor = Math.exp(e.deltaY * 0.0014);
  let nw = app.camera.vbW * factor;
  nw = Math.min(VIEWBOX_MAX_W, Math.max(VIEWBOX_MIN_W, nw));
  const nh = nw / aspectPx;
  app.camera.camX = wx - u * nw + nw / 2;
  app.camera.camY = wy - v * nh + nh / 2;
  app.camera.vbW = nw;
  requestViewBox();
}

export function onPointerDown(e) {
  if (chartIs3d()) return;
  if (e.button !== 0) return;
  const svg = document.getElementById("system");
  if (!svg || !e.target || !svg.contains(/** @type {Node} */ (e.target))) return;
  const picked = tryPickSvgBodyFromEvent(e);
  if (picked) {
    setTrackedBodyId(picked);
    return;
  }
  if (getTrackedBodyId()) return;
  drag = { x: e.clientX, y: e.clientY };
  try {
    svg.setPointerCapture(e.pointerId);
  } catch {
    /* ignore */
  }
}

export function onPointerMove(e) {
  if (chartIs3d()) return;
  if (!drag) return;
  const svg = document.getElementById("system");
  if (!svg) return;
  const rect = svg.getBoundingClientRect();
  const dx = e.clientX - drag.x;
  const dy = e.clientY - drag.y;
  drag.x = e.clientX;
  drag.y = e.clientY;
  const vbH = app.camera.vbW / (rect.width / Math.max(1, rect.height));
  app.camera.camX -= (dx / rect.width) * app.camera.vbW;
  app.camera.camY -= (dy / rect.height) * vbH;
  requestViewBox();
}

export function onPointerUp(e) {
  const svg = document.getElementById("system");
  if (drag && svg) {
    try {
      svg.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  }
  drag = null;
}
