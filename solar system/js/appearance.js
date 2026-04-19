import { KM_R, JUP_REF_PX } from "./constants.js";
import { app } from "./state.js";

export function physicalDiskPx(id) {
  const km = KM_R[/** @type {keyof typeof KM_R} */ (id)];
  if (!km) return 2;
  const raw = JUP_REF_PX * (km / KM_R.jupiter);
  if (id === "sun") return Math.min(220, Math.max(28, raw));
  return Math.max(2.0, Math.min(42, raw));
}

export function planetDrawRadius(id, rPx) {
  if (app.orbitMode === "simple") {
    const map = {
      mercury: 4,
      venus: 4.2,
      earth: 5.2,
      mars: 4,
      ceres: 3.4,
      jupiter: 9,
      saturn: 8.2,
      uranus: 4.8,
      neptune: 4.8,
      pluto: 3.5,
    };
    return map[/** @type {keyof typeof map} */ (id)] ?? 3.6;
  }
  const cap = Math.max(2.5, rPx * 0.06);
  return Math.min(cap, physicalDiskPx(id));
}

export function moonDiskPx(moonId, isDot) {
  if (app.orbitMode === "simple") return isDot ? 1.35 : 2.4;
  const km = KM_R[/** @type {keyof typeof KM_R} */ (moonId)] ?? 20;
  const raw = JUP_REF_PX * (km / KM_R.jupiter);
  if (isDot) return Math.max(1.15, Math.min(2.4, raw));
  return Math.max(2.0, Math.min(8, raw));
}

export function sunDrawRadius() {
  if (app.orbitMode !== "realistic") return 22;
  return physicalDiskPx("sun");
}

export function moonOrbitDistancePx(moon, parentPr) {
  if (app.orbitMode === "simple") return moon.oPx;
  const s = Math.max(14, Math.min(88, parentPr * 5.2));
  return Math.max(10, Math.min(95, (moon.oPx / 18) * s));
}
