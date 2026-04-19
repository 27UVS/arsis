import {
  ORBIT_STROKE,
  ORBIT_STROKE_REALISTIC,
  RING_STROKE,
  LABEL_FILL,
  LABEL_SCREEN_PX_PLANET,
  LABEL_SCREEN_PX_MOON,
  MAX_CHART_AU,
} from "./constants.js";
import { app } from "./state.js";
import { OBJECTS, MOON_ALL, getRpx, planetOrbitPolylinePx } from "./model.js";
import { pxFromAuChart, buildBeltLayer } from "./orbits.js";
import { planetDrawRadius, sunDrawRadius, moonDiskPx } from "./appearance.js";
import { t } from "./translate.js";
import { bodyLabel } from "./format.js";
import { updateLabelVisibility, syncNameToggleButtons } from "./labels.js";
import { updateChartLabelFontSizes } from "./camera-view.js";
import { applyChartSceneTransform, updateBodySphereAppearance } from "./view3d.js";

const NS = "http://www.w3.org/2000/svg";

/**
 * @param {SVGDefsElement} defs
 * @param {string} id
 * @param {string} hi
 * @param {string} mid
 * @param {string} edge
 */
function appendSphereGradient(defs, id, hi, mid, edge) {
  const rg = document.createElementNS(NS, "radialGradient");
  rg.setAttribute("id", id);
  rg.setAttribute("data-sphere-grad", "1");
  rg.setAttribute("cx", "32%");
  rg.setAttribute("cy", "30%");
  rg.setAttribute("r", "72%");
  rg.setAttribute("fx", "28%");
  rg.setAttribute("fy", "26%");
  const stops = [
    ["0%", hi],
    ["40%", mid],
    ["100%", edge],
  ];
  for (const [off, col] of stops) {
    const st = document.createElementNS(NS, "stop");
    st.setAttribute("offset", off);
    st.setAttribute("stop-color", col);
    rg.appendChild(st);
  }
  defs.appendChild(rg);
}

function rebuildSphereGradients() {
  const svg = document.getElementById("system");
  const defs = svg?.querySelector("defs");
  if (!defs) return;
  defs.querySelectorAll("[data-sphere-grad]").forEach((n) => n.remove());
  appendSphereGradient(
    defs,
    "sphere-grad-sun",
    "#fffef0",
    "hsl(48, 100%, 72%)",
    "rgba(55, 28, 0, 0.72)"
  );
  appendSphereGradient(
    defs,
    "sphere-grad-moon",
    "#f6fffd",
    "rgba(195, 248, 238, 0.95)",
    "rgba(0, 28, 26, 0.62)"
  );
  for (const o of OBJECTS) {
    if (o.marker === "sun") continue;
    appendSphereGradient(defs, `sphere-grad-${o.id}`, "#ffffff", o.color, "rgba(0, 14, 16, 0.68)");
  }
}

function appendDashedRing(orbits, au, dash, opacity) {
  const r = pxFromAuChart(au);
  const c = document.createElementNS("http://www.w3.org/2000/svg", "circle");
  c.setAttribute("cx", "0");
  c.setAttribute("cy", "0");
  c.setAttribute("r", String(r));
  c.setAttribute("fill", "none");
  c.setAttribute("stroke", `rgba(150, 228, 218, ${opacity})`);
  c.setAttribute("stroke-width", "0.65");
  c.setAttribute("stroke-dasharray", dash);
  orbits.appendChild(c);
}

function moonDiskPxFor(moon) {
  if (moon.id.includes("-dot-") || !moon.major) return moonDiskPx("phobos", true);
  return moonDiskPx(moon.id, false);
}

export function buildSvg() {
  const orbits = document.getElementById("orbits");
  const bodies = document.getElementById("bodies");
  const labels = document.getElementById("labels");
  if (!orbits || !bodies || !labels) return;

  orbits.replaceChildren();
  bodies.replaceChildren();
  labels.replaceChildren();

  for (const o of OBJECTS) {
    if (o.marker === "sun") continue;
    const rp = getRpx(o);
    if (app.orbitMode === "realistic") {
      const flat = planetOrbitPolylinePx(o, rp, 256);
      let d = "";
      for (let i = 0; i < flat.length; i += 2) {
        const x = flat[i].toFixed(3);
        const y = flat[i + 1].toFixed(3);
        d += i === 0 ? `M${x} ${y}` : ` L${x} ${y}`;
      }
      d += " Z";
      const p = document.createElementNS("http://www.w3.org/2000/svg", "path");
      p.setAttribute("id", `orbit-${o.id}`);
      p.setAttribute("d", d);
      p.setAttribute("fill", "none");
      p.setAttribute("stroke", ORBIT_STROKE_REALISTIC);
      p.setAttribute("stroke-width", "1.35");
      p.setAttribute("vector-effect", "non-scaling-stroke");
      p.setAttribute("stroke-linejoin", "round");
      orbits.appendChild(p);
    } else {
      const c = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      c.setAttribute("id", `orbit-${o.id}`);
      c.setAttribute("cx", "0");
      c.setAttribute("cy", "0");
      c.setAttribute("r", String(rp));
      c.setAttribute("fill", "none");
      c.setAttribute("stroke", ORBIT_STROKE);
      c.setAttribute("stroke-width", "1");
      orbits.appendChild(c);
    }
  }

  appendDashedRing(orbits, 2.08, "1 3", 0.26);
  appendDashedRing(orbits, 3.38, "1 3", 0.26);
  appendDashedRing(orbits, 37.2, "2 5", 0.16);
  appendDashedRing(orbits, MAX_CHART_AU, "2 5", 0.16);

  buildBeltLayer();
  rebuildSphereGradients();

  for (const o of OBJECTS) {
    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    g.setAttribute("id", `body-${o.id}`);

    if (o.marker === "sun") {
      const sun = document.createElementNS(NS, "circle");
      const sr = sunDrawRadius();
      sun.setAttribute("class", "body-disk");
      sun.setAttribute("r", String(sr));
      sun.setAttribute("fill", o.color);
      sun.setAttribute("filter", app.orbitMode === "realistic" && sr < 56 ? "url(#glow-tight)" : "url(#glow)");
      g.appendChild(sun);
    } else {
      const rp = getRpx(o);
      const pr = planetDrawRadius(o.id, rp);
      const planet = document.createElementNS(NS, "circle");
      planet.setAttribute("class", "body-disk");
      planet.setAttribute("r", String(pr));
      planet.setAttribute("fill", o.color);
      planet.setAttribute("stroke", "rgba(0, 24, 26, 0.55)");
      planet.setAttribute("stroke-width", "1");
      g.appendChild(planet);

      if (o.id === "saturn") {
        const ring = document.createElementNS(NS, "ellipse");
        const ref = 8.2;
        const rx = 11 * (pr / ref);
        const ry = 3.2 * (pr / ref);
        ring.setAttribute("rx", String(rx));
        ring.setAttribute("ry", String(ry));
        ring.setAttribute("fill", "none");
        ring.setAttribute("stroke", RING_STROKE);
        ring.setAttribute("stroke-width", "1");
        ring.setAttribute("transform", "rotate(-18)");
        g.appendChild(ring);
      }
    }
    bodies.appendChild(g);

    const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
    text.setAttribute("id", `label-${o.id}`);
    text.setAttribute("class", "chart-label");
    text.setAttribute("data-svg-fs", "10");
    text.setAttribute("data-screen-px", String(LABEL_SCREEN_PX_PLANET));
    text.setAttribute("fill", LABEL_FILL);
    text.setAttribute("font-size", "10");
    text.setAttribute("letter-spacing", "0.14em");
    text.textContent = bodyLabel(o.id);
    labels.appendChild(text);
  }

  for (const moon of MOON_ALL) {
    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    g.setAttribute("id", `body-${moon.id}`);
    const cir = document.createElementNS(NS, "circle");
    cir.setAttribute("class", "body-disk");
    cir.setAttribute("r", String(moonDiskPxFor(moon)));
    cir.setAttribute("fill", "rgba(195, 248, 238, 0.82)");
    cir.setAttribute("stroke", "rgba(0, 28, 30, 0.45)");
    cir.setAttribute("stroke-width", "0.5");
    g.appendChild(cir);
    bodies.appendChild(g);

    if (moon.major && !moon.id.includes("-dot-")) {
      const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
      text.setAttribute("id", `label-${moon.id}`);
      text.setAttribute("class", "chart-label");
      text.setAttribute("data-svg-fs", "8.5");
      text.setAttribute("data-screen-px", String(LABEL_SCREEN_PX_MOON));
      text.setAttribute("fill", LABEL_FILL);
      text.setAttribute("font-size", "8.5");
      text.setAttribute("letter-spacing", "0.1em");
      text.textContent = bodyLabel(moon.id);
      labels.appendChild(text);
    }
  }

  updateLabelVisibility();
  syncNameToggleButtons();
  updateChartLabelFontSizes();
  applyChartSceneTransform();
  updateBodySphereAppearance();
}
