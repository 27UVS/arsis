import { MOON_ALL, moonAngleDeg, BELT_INNER_ID, BELT_KUIPER_ID, beltMeanLongitudeDeg } from "./model.js";
import { planetDrawRadius, moonOrbitDistancePx } from "./appearance.js";
import { bodyLabel } from "./format.js";

export function updateBeltRotation(nowMs) {
  const gInner = document.getElementById("belt-inner-group");
  const gKuiper = document.getElementById("belt-kuiper-group");
  if (gInner) gInner.setAttribute("transform", `rotate(${-beltMeanLongitudeDeg(BELT_INNER_ID, nowMs)})`);
  if (gKuiper) gKuiper.setAttribute("transform", `rotate(${-beltMeanLongitudeDeg(BELT_KUIPER_ID, nowMs)})`);
}

export function updatePositions(state, nowMs) {
  for (const s of state) {
    const g = document.getElementById(`body-${s.id}`);
    const te = document.getElementById(`label-${s.id}`);
    if (!g) continue;
    g.setAttribute("transform", `translate(${s.x.toFixed(3)} ${s.y.toFixed(3)})`);
    if (s.marker === "probe") {
      // Rotate the triangle so its tip points toward the Sun (origin).
      const ang = Math.atan2(-s.y, -s.x) * (180 / Math.PI);
      const p = g.querySelector("path.probe-marker");
      if (p instanceof SVGPathElement) p.setAttribute("transform", `rotate(${ang.toFixed(2)})`);
    }
    if (te) {
      te.textContent = bodyLabel(s.id);
      const ox = s.marker === "sun" ? 26 : 12;
      const oy = s.marker === "sun" ? -8 : -14;
      te.setAttribute("x", String(s.x + ox));
      te.setAttribute("y", String(s.y + oy));
    }
  }

  for (const moon of MOON_ALL) {
    const g = document.getElementById(`body-${moon.id}`);
    if (!g) continue;
    const par = state.find((p) => p.id === moon.parent);
    if (!par) continue;
    const pr = planetDrawRadius(par.id, par.rPxActive);
    const dist = moonOrbitDistancePx(moon, pr);
    const Lm = moonAngleDeg(moon, nowMs);
    const rad = (Lm * Math.PI) / 180;
    const mx = dist * Math.cos(rad);
    const my = -dist * Math.sin(rad);
    const x = par.x + mx;
    const y = par.y + my;
    g.setAttribute("transform", `translate(${x.toFixed(3)} ${y.toFixed(3)})`);

    const te = document.getElementById(`label-${moon.id}`);
    if (te) {
      te.textContent = bodyLabel(moon.id);
      te.setAttribute("x", String(x + 7));
      te.setAttribute("y", String(y - 9));
    }
  }
}
