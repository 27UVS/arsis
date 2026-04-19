import { LABEL_SCREEN_EN_SCALE } from "./constants.js";
import { app } from "./state.js";
import { maxOrbitRadius } from "./orbits.js";

function chartLabelLangScale() {
  return app.lang === "en" ? LABEL_SCREEN_EN_SCALE : 1;
}

export function updateChartLabelFontSizes() {
  const svg = document.getElementById("system");
  const layer = document.getElementById("labels");
  if (!svg || !layer) return;
  const rect = svg.getBoundingClientRect();
  if (rect.width < 2) return;

  const nodes = layer.querySelectorAll("text.chart-label");
  const langS = chartLabelLangScale();

  if (app.orbitMode !== "realistic") {
    for (const el of nodes) {
      const base = el.getAttribute("data-svg-fs");
      if (!base) continue;
      const n = Number(base);
      el.setAttribute(
        "font-size",
        Number.isFinite(n) ? String(Math.max(2.5, n * langS)) : base,
      );
    }
    return;
  }

  const vuPerCssPx = app.camera.vbW / rect.width;
  for (const el of nodes) {
    const px = Number(el.getAttribute("data-screen-px"));
    if (!Number.isFinite(px)) continue;
    const fs = px * vuPerCssPx * langS;
    el.setAttribute("font-size", String(Math.max(2.5, fs)));
  }
}

export function applyViewBox() {
  const svg = document.getElementById("system");
  if (!svg) return;
  let r = svg.getBoundingClientRect();
  if (r.width < 2 || r.height < 2) {
    const frame = document.getElementById("viewport-frame");
    if (frame) r = frame.getBoundingClientRect();
  }
  let aspectPx = r.width / Math.max(1, r.height);
  if (!Number.isFinite(aspectPx) || aspectPx < 0.05) aspectPx = 16 / 9;
  aspectPx = Math.max(0.35, aspectPx);
  const vbH = app.camera.vbW / aspectPx;
  const vx = app.camera.camX - app.camera.vbW / 2;
  const vy = app.camera.camY - vbH / 2;
  svg.setAttribute("viewBox", `${vx} ${vy} ${app.camera.vbW} ${vbH}`);
  updateChartLabelFontSizes();
}

export function fitWorld() {
  const svg = document.getElementById("system");
  if (!svg) return;
  const r = svg.getBoundingClientRect();
  const aspectPx = Math.max(0.35, r.width / Math.max(1, r.height));
  const pad = Math.max(160, maxOrbitRadius() * 0.05);
  const ext = maxOrbitRadius() + pad;
  app.camera.vbW = 2 * ext * Math.max(1, aspectPx);
  app.camera.camX = 0;
  app.camera.camY = 0;
  applyViewBox();
}
