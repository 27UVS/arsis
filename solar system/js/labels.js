import { NAMES_PLANETS_KEY, NAMES_MOONS_KEY } from "./constants.js";
import { OBJECTS, MOON_ALL } from "./model.js";

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

  const setShown = (el, show) => {
    if (!el) return;
    if (show) el.removeAttribute("display");
    else el.setAttribute("display", "none");
  };

  for (const o of OBJECTS) {
    setShown(document.getElementById(`label-${o.id}`), sp);
  }

  for (const moon of MOON_ALL) {
    if (!moon.major || moon.id.includes("-dot-")) continue;
    setShown(document.getElementById(`label-${moon.id}`), sm);
  }
}
