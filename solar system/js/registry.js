import { app } from "./state.js";
import { VIEWBOX_MIN_W } from "./constants.js";
import { OBJECTS, MOONS, meanLongitudeRad, moonAngleDeg, objectWorldPosition } from "./model.js";
import { focusChart3dObject } from "./chart-3d.js";
import { applyViewBox } from "./camera-view.js";
import { setTrackedBodyId } from "./track-follow.js";
import { t } from "./translate.js";
import { bodyLabel } from "./format.js";

export function registryTypeLabel(kind) {
  return t(/** @type {"type_star" | "type_planet" | "type_moon" | "type_dwarf"} */ (`type_${kind}`));
}

export function focusObjectFromRegistry(objectId) {
  const id = String(objectId ?? "").trim();
  if (!id) return;
  setTrackedBodyId(id);
  if (app.view3d) {
    focusChart3dObject(id);
    return;
  }
  const state = meanLongitudeRad(app.simTimeMs);
  const { x, y } = objectWorldPosition(state, app.simTimeMs, id);
  if (app.orbitMode === "realistic") {
    app.camera.vbW = VIEWBOX_MIN_W;
  }
  app.camera.camX = x;
  app.camera.camY = y;
  applyViewBox();
  requestAnimationFrame(() => applyViewBox());
}

export function registryRowCount() {
  return 1 + OBJECTS.filter((o) => !o.marker).length + MOONS.length;
}

export function fillRegistry(state, nowMs) {
  const ul = document.getElementById("registry");
  if (!ul) return;

  const expected = registryRowCount();
  const needFull = ul.getAttribute("data-registry-built") !== "1" || ul.childElementCount !== expected;

  if (!needFull) {
    const tip = t("registry_focus_tip");
    for (const li of ul.querySelectorAll("li[data-focus-object]")) {
      const id = li.getAttribute("data-focus-object");
      if (!id) continue;
      li.setAttribute("title", tip);
      const kind = li.getAttribute("data-registry-kind");
      const degEl = li.querySelector(".deg");
      const nameEl = li.querySelector(".name");
      const tyEl = li.querySelector(".registry-type");
      if (nameEl) nameEl.textContent = bodyLabel(id);
      if (tyEl && kind)
        tyEl.textContent = registryTypeLabel(/** @type {"star" | "planet" | "moon" | "dwarf"} */ (kind));
      if (!degEl) continue;
      if (id === "sun") {
        degEl.textContent = "0.00°";
        continue;
      }
      if (OBJECTS.some((o) => o.id === id && !o.marker)) {
        const s = state.find((p) => p.id === id);
        degEl.textContent = s ? `${s.L.toFixed(2)}°` : "—";
        continue;
      }
      const moon = MOONS.find((m) => m.id === id);
      if (moon) degEl.textContent = `${moonAngleDeg(moon, nowMs).toFixed(2)}°`;
    }
    return;
  }

  ul.replaceChildren();
  ul.setAttribute("data-registry-built", "1");

  const byId = (id) => state.find((s) => s.id === id);

  const appendRow = (id, kind, angleDeg, color) => {
    const li = document.createElement("li");
    li.setAttribute("data-focus-object", id);
    li.setAttribute("data-registry-kind", kind);
    li.setAttribute("title", t("registry_focus_tip"));
    li.classList.add("registry__row--target");
    const sw = document.createElement("span");
    sw.className = "swatch";
    sw.style.background = color;
    const name = document.createElement("span");
    name.className = "name";
    name.textContent = bodyLabel(id);
    const ty = document.createElement("span");
    ty.className = "registry-type";
    ty.textContent = registryTypeLabel(kind);
    const deg = document.createElement("span");
    deg.className = "deg";
    deg.textContent = `${angleDeg.toFixed(2)}°`;
    li.append(sw, name, ty, deg);
    ul.appendChild(li);
  };

  const sun = OBJECTS.find((o) => o.marker === "sun");
  if (sun) appendRow("sun", "star", 0, sun.color);

  for (const o of OBJECTS) {
    if (o.marker === "sun") continue;
    const s = byId(o.id);
    if (!s) continue;
    const kind = o.id === "pluto" || o.id === "ceres" ? "dwarf" : "planet";
    appendRow(o.id, kind, s.L, s.color);
  }

  for (const moon of MOONS) {
    const par = byId(moon.parent);
    const angle = moonAngleDeg(moon, nowMs);
    const col = par ? par.color : "rgba(195, 248, 238, 0.65)";
    appendRow(moon.id, "moon", angle, col);
  }
}
