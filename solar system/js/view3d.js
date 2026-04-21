import { app, persistView3d } from "./state.js";
import { OBJECTS, MOON_ALL } from "./model.js";
import { applyViewBox, fitWorld } from "./camera-view.js";
import { t } from "./translate.js";
import { mountChart3d, unmountChart3d, isChart3dMounted } from "./chart-3d.js";
import { resetInteraction } from "./interaction.js";
import { updateScaleUi } from "./scale-ui.js";

function setFrame3dClass(on) {
  document.getElementById("viewport-frame")?.classList.toggle("viewport__frame--3d", on);
}

function setWebglCanvasVisible(on) {
  const cv = document.getElementById("chart-webgl");
  if (!cv) return;
  if (on) {
    cv.removeAttribute("hidden");
    cv.style.removeProperty("display");
    cv.style.removeProperty("visibility");
    cv.style.pointerEvents = "auto";
  } else {
    cv.setAttribute("hidden", "");
    cv.style.display = "none";
    cv.style.visibility = "hidden";
    cv.style.pointerEvents = "none";
  }

  const svg = document.getElementById("system");
  if (svg) {
    if (on) {
      svg.style.visibility = "hidden";
      svg.style.pointerEvents = "none";
    } else {
      svg.style.removeProperty("visibility");
      svg.style.removeProperty("pointer-events");
    }
  }
}

export function applyChartSceneTransform() {
  const g = document.getElementById("chart-scene");
  if (g) g.removeAttribute("transform");
}

export function updateBodySphereAppearance() {
  if (app.view3d) return;
  const sun = OBJECTS.find((o) => o.marker === "sun");
  for (const o of OBJECTS) {
    const el = document.getElementById(`body-${o.id}`);
    if (!el) continue;
    const disk = el.querySelector("circle.body-disk");
    if (!disk) continue;
    if (o.marker === "sun") {
      if (sun) {
        disk.setAttribute("fill", sun.color);
        const sr = Number(disk.getAttribute("r")) || 0;
        disk.setAttribute("filter", app.orbitMode === "realistic" && sr < 56 ? "url(#glow-tight)" : "url(#glow)");
      }
      continue;
    }
    disk.setAttribute("fill", o.color);
  }

  for (const moon of MOON_ALL) {
    const el = document.getElementById(`body-${moon.id}`);
    if (!el) continue;
    const disk = el.querySelector("circle.body-disk");
    if (!disk) continue;
    disk.setAttribute("fill", "rgba(195, 248, 238, 0.82)");
  }
}

export function syncView3dToggleButton() {
  const btn = document.getElementById("view-3d-toggle");
  if (!btn) return;
  const can = app.orbitMode === "realistic";
  btn.disabled = !can;
  btn.setAttribute("aria-pressed", app.view3d ? "true" : "false");
  btn.classList.toggle("view3d-toggle--on", app.view3d);
  if (can) {
    btn.setAttribute("title", t(app.view3d ? "view3d_title_on" : "view3d_title_off"));
    btn.setAttribute("aria-label", t("view3d_aria"));
  } else {
    btn.setAttribute("title", t("view3d_need_real"));
    btn.setAttribute("aria-label", t("view3d_need_real"));
  }
}

export function setView3d(on) {
  const next = Boolean(on);
  if (next && app.orbitMode !== "realistic") return;
  // Never early-return: we want to re-apply DOM state even if something got out of sync.
  resetInteraction();
  app.view3d = next;
  persistView3d();
  setFrame3dClass(next);
  setWebglCanvasVisible(next);
  if (next) {
    mountChart3d();
  } else {
    unmountChart3d();
  }
  applyChartSceneTransform();
  updateBodySphereAppearance();
  fitWorld();
  syncView3dToggleButton();
  updateScaleUi();
  applyViewBox();
}

/** If localStorage had 3D on, mount WebGL after first `buildSvg()`. */
export function applyBoot3dIfNeeded() {
  if (!app.view3d) return;
  if (app.orbitMode !== "realistic") {
    app.view3d = false;
    persistView3d();
    setFrame3dClass(false);
    setWebglCanvasVisible(false);
    unmountChart3d();
    syncView3dToggleButton();
    updateScaleUi();
    return;
  }
  setFrame3dClass(true);
  setWebglCanvasVisible(true);
  if (!isChart3dMounted()) mountChart3d();
}

export function toggleView3d() {
  if (app.orbitMode !== "realistic") return;
  setView3d(!app.view3d);
}
