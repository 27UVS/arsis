/**
 * Sun “luminosity”: extra bloom + 3D point light + more corona in preview — not tinting the disk white.
 */
import { app, persistSunLuminosity } from "./state.js";
import { OBJECTS } from "./model.js";
import { syncChart3dSunLuminosity } from "./chart-3d.js";
import { syncSunPreviewLuminosity } from "./body-preview.js";

/**
 * @param {SVGCircleElement} disk
 * @param {SVGCircleElement | null} aura larger blurred ring behind the disk (illumination halo)
 * @param {string} sunCssColor
 */
export function styleSunSvgLayers(disk, aura, sunCssColor) {
  const L = app.sunLuminosity;
  const sr = Number(disk.getAttribute("r")) || 22;
  disk.setAttribute("fill", sunCssColor);

  if (aura instanceof SVGCircleElement) {
    aura.setAttribute("fill", sunCssColor);
    const spread = 1.06 + L * L * 2.85;
    aura.setAttribute("r", String(sr * spread));
    aura.setAttribute("opacity", String(0.02 + L * L * 0.5));
    aura.setAttribute("filter", L < 0.07 ? "none" : "url(#glow)");
  }

  if (L < 0.05) {
    disk.removeAttribute("filter");
    disk.setAttribute("stroke", "rgba(0, 24, 26, 0.55)");
    disk.setAttribute("stroke-width", "1");
  } else {
    disk.removeAttribute("stroke");
    disk.removeAttribute("stroke-width");
    const useTight = app.orbitMode === "realistic" && sr < 56;
    disk.setAttribute("filter", useTight ? "url(#glow-tight)" : "url(#glow)");
  }
}

export function applySunLuminositySvgFilters() {
  const svg = document.getElementById("system");
  if (!svg) return;
  const L = app.sunLuminosity;
  const wide = svg.querySelector("#sun-glow-blur-wide");
  const tight = svg.querySelector("#sun-glow-blur-tight");
  if (wide instanceof SVGFEGaussianBlurElement) {
    const sd = 0.18 + L * L * 8.5;
    wide.setAttribute("stdDeviation", String(sd));
  }
  if (tight instanceof SVGFEGaussianBlurElement) {
    const sd = 0.1 + L * 2.4;
    tight.setAttribute("stdDeviation", String(sd));
  }
}

export function applySunLuminositySvg() {
  applySunLuminositySvgFilters();
  const sun = OBJECTS.find((o) => o.marker === "sun");
  if (!sun) return;
  const g = document.getElementById("body-sun");
  const disk = g?.querySelector("circle.body-disk");
  const aura = g?.querySelector("#sun-aura-bloom");
  if (disk instanceof SVGCircleElement) styleSunSvgLayers(disk, aura instanceof SVGCircleElement ? aura : null, sun.color);
}

export function applySunLuminosityAll() {
  applySunLuminositySvg();
  syncChart3dSunLuminosity();
  syncSunPreviewLuminosity();
}

export function syncSunLuminositySliderUi() {
  const el = document.getElementById("sun-luminosity");
  if (el instanceof HTMLInputElement) el.value = String(Math.round(app.sunLuminosity * 100));
}

export function wireSunLuminosityUi() {
  const el = document.getElementById("sun-luminosity");
  if (!(el instanceof HTMLInputElement)) return;
  el.addEventListener("input", () => {
    const v = Number(el.value);
    app.sunLuminosity = Number.isFinite(v) ? Math.min(1, Math.max(0, v / 100)) : app.sunLuminosity;
    persistSunLuminosity();
    applySunLuminosityAll();
  });
}
