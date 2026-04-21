/**
 * ARSIS solar system — entry. Wires modules, DOM events, and animation loop.
 */
import { app, persistOrbitMode } from "./state.js";
import { J2000_MS } from "./constants.js";
import { meanLongitudeRad } from "./model.js";
import { buildSvg } from "./svg-build.js";
import { applyViewBox, fitWorld } from "./camera-view.js";
import { applyStaticI18n } from "./i18n-apply.js";
import { updatePositions, updateBeltRotation } from "./motion.js";
import { fillRegistry, focusObjectFromRegistry } from "./registry.js";
import { applyChartFollow2d, wireTrackedBodyOutsidePointer } from "./track-follow.js";
import { footerLine } from "./telemetry.js";
import { fmtDelta } from "./format.js";
import {
  fmtUtcDisplay,
  tickSimClock,
  resetSimTime,
  shiftSimTime,
  speedBackward,
  slowDownTime,
  speedForward,
} from "./sim-time.js";
import { updateTimeRateReadout } from "./time-panel.js";
import { onWheel, onPointerDown, onPointerMove, onPointerUp, resetInteraction } from "./interaction.js";
import { setShowPlanetNames, getShowPlanetNames, setShowMoonNames, getShowMoonNames } from "./labels.js";
import { updateScaleUi } from "./scale-ui.js";
import {
  syncView3dToggleButton,
  toggleView3d,
  setView3d,
  applyBoot3dIfNeeded,
} from "./view3d.js";
import { syncChart3dFromSim, resizeChart3d, isChart3dMounted } from "./chart-3d.js";
import { initBodyPreview, resizeBodyPreview, tickBodyPreview } from "./body-preview.js";
import { initGlitchFx } from "../../js/glitch-fx.js";
import { loadAppConfig } from "../../js/app-config.js";
import { requireAuth as requireAuthOrRedirect, clearAuth } from "../../js/auth.js";

await requireAuthOrRedirect("../index.html");

function setOrbitMode(next) {
  if (next === "simple" && app.view3d) {
    setView3d(false);
  }
  app.orbitMode = next;
  persistOrbitMode();
  updateScaleUi();
  syncView3dToggleButton();
  buildSvg();
  fitWorld();
}

function tick() {
  const perfNow = performance.now();
  const simPrev = app.simTimeMs;
  tickSimClock(perfNow);
  const simDelta = app.simTimeMs - simPrev;

  const state = meanLongitudeRad(app.simTimeMs);

  if (app.view3d) {
    syncChart3dFromSim(state, app.simTimeMs);
  } else {
    updatePositions(state, app.simTimeMs);
    updateBeltRotation(app.simTimeMs);
    applyChartFollow2d(state, app.simTimeMs);
  }

  fillRegistry(state, app.simTimeMs);
  footerLine(state);

  const clock = document.getElementById("clock");
  if (clock) clock.textContent = fmtUtcDisplay(Date.now());

  const simClock = document.getElementById("sim-clock");
  if (simClock) simClock.textContent = fmtUtcDisplay(app.simTimeMs);

  const delta = document.getElementById("delta-readout");
  if (delta) delta.textContent = fmtDelta(app.simTimeMs - J2000_MS);

  tickBodyPreview(simDelta);
  requestAnimationFrame(tick);
}

document.getElementById("session-exit")?.addEventListener("click", () => {
  clearAuth();
  window.location.href = "../index.html";
});

document.getElementById("scale-toggle")?.addEventListener("click", () => {
  setOrbitMode(app.orbitMode === "realistic" ? "simple" : "realistic");
});

document.getElementById("view-3d-toggle")?.addEventListener("click", () => {
  resetInteraction();
  toggleView3d();
  if (!app.view3d) {
    const state = meanLongitudeRad(app.simTimeMs);
    updatePositions(state, app.simTimeMs);
    applyViewBox();
  }
});

document.getElementById("toggle-planet-names")?.addEventListener("click", () => {
  setShowPlanetNames(!getShowPlanetNames());
});

document.getElementById("toggle-moon-names")?.addEventListener("click", () => {
  setShowMoonNames(!getShowMoonNames());
});

document.getElementById("registry")?.addEventListener("click", (e) => {
  const el = e.target instanceof Element ? e.target.closest("[data-focus-object]") : null;
  if (!el) return;
  const id = (el.getAttribute("data-focus-object") || "").trim();
  if (!id) return;
  e.preventDefault();
  focusObjectFromRegistry(id);
});

document.getElementById("time-reset")?.addEventListener("click", () => {
  resetSimTime();
  updateTimeRateReadout();
});

document.getElementById("time-back")?.addEventListener("click", () => {
  speedBackward();
  updateTimeRateReadout();
});

document.getElementById("time-slower")?.addEventListener("click", () => {
  slowDownTime();
  updateTimeRateReadout();
});

document.getElementById("time-faster")?.addEventListener("click", () => {
  speedForward();
  updateTimeRateReadout();
});

document.getElementById("time-panel")?.addEventListener("click", (e) => {
  const btn = /** @type {HTMLElement | null} */ (e.target instanceof HTMLElement ? e.target.closest("[data-shift-ms]") : null);
  if (!btn) return;
  const v = btn.getAttribute("data-shift-ms");
  if (v == null || v === "") return;
  const n = Number(v);
  if (!Number.isFinite(n)) return;
  shiftSimTime(n);
});

const svgEl = document.getElementById("system");
svgEl?.addEventListener("wheel", onWheel, { passive: false });
svgEl?.addEventListener("pointerdown", onPointerDown);
svgEl?.addEventListener("pointermove", onPointerMove);
svgEl?.addEventListener("pointerup", onPointerUp);
svgEl?.addEventListener("pointercancel", onPointerUp);
window.addEventListener("pointerup", onPointerUp);

const frameEl = document.getElementById("viewport-frame");
if (frameEl && typeof ResizeObserver !== "undefined") {
  const ro = new ResizeObserver(() => {
    applyViewBox();
    if (isChart3dMounted()) resizeChart3d();
  });
  ro.observe(frameEl);
}

const previewEl = document.getElementById("body-preview");
if (previewEl && typeof ResizeObserver !== "undefined") {
  const ro = new ResizeObserver(() => resizeBodyPreview());
  ro.observe(previewEl);
}

buildSvg();
syncView3dToggleButton();
applyBoot3dIfNeeded();
applyStaticI18n();
updateTimeRateReadout();
wireTrackedBodyOutsidePointer();
initBodyPreview();
loadAppConfig().then((cfg) => {
  if (cfg.glitchFx) initGlitchFx();
});

requestAnimationFrame(() => {
  fitWorld();
});
requestAnimationFrame(tick);
