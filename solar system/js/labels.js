import { NAMES_PLANETS_KEY, NAMES_MOONS_KEY } from "./constants.js";
import { OBJECTS, MOON_ALL, chartNameIgnoresNameToggles } from "./model.js";
import { isChart3dMounted, refreshChart3dLabels } from "./chart-3d.js";

export function getShowPlanetNames() {
  return localStorage.getItem(NAMES_PLANETS_KEY) !== "0";
}

export function getShowMoonNames() {
  return localStorage.getItem(NAMES_MOONS_KEY) !== "0";
}

export function setShowPlanetNames(on) {
  localStorage.setItem(NAMES_PLANETS_KEY, on ? "1" : "0");
  updateLabelVisibility();
  syncNameToggleButtons();
}

export function setShowMoonNames(on) {
  localStorage.setItem(NAMES_MOONS_KEY, on ? "1" : "0");
  updateLabelVisibility();
  syncNameToggleButtons();
}

export function syncNameToggleButtons() {
  const p = document.getElementById("toggle-planet-names");
  const m = document.getElementById("toggle-moon-names");
  if (p) p.setAttribute("aria-pressed", getShowPlanetNames() ? "true" : "false");
  if (m) m.setAttribute("aria-pressed", getShowMoonNames() ? "true" : "false");
}

export function updateLabelVisibility() {
  const sp = getShowPlanetNames();
  const sm = getShowMoonNames();

  /** SVG: use style.display (CSS2D uses style too); attribute `display` is unreliable vs cascade. */
  const setShown = (el, show) => {
    if (!el) return;
    el.removeAttribute("display");
    if (show) el.style.removeProperty("display");
    else el.style.setProperty("display", "none");
  };

  for (const o of OBJECTS) {
    const el = document.getElementById(`label-${o.id}`);
    if (!el) continue;
    if (chartNameIgnoresNameToggles(o) || el.getAttribute("data-chart-name-always") === "1") {
      el.style.setProperty("display", "inline", "important");
      continue;
    }
    setShown(el, sp);
  }

  for (const moon of MOON_ALL) {
    if (!moon.major || moon.id.includes("-dot-")) continue;
    const el = document.getElementById(`label-${moon.id}`);
    if (!el) continue;
    setShown(el, sm);
  }

  if (isChart3dMounted()) refreshChart3dLabels();
}
