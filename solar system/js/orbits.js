import { MAX_CHART_AU } from "./constants.js";
import { app } from "./state.js";
import { OBJECTS, getRpx, mulberry32 } from "./model.js";

/**
 * Heliocentric chart radius (px) for a semimajor axis in AU (belts, guide rings).
 */
export function pxFromAuChart(au) {
  const a = Math.max(0, au);
  const pl = OBJECTS.find((o) => o.id === "pluto");
  const planets = OBJECTS.filter((o) => !o.marker).sort((x, y) => x.r - y.r);

  if (app.orbitMode === "realistic") {
    const rPluto = pl ? getRpx(pl) : 400;
    return (a / 39.48) * rPluto;
  }

  if (a <= 0 || planets.length === 0) return 0;
  const first = planets[0];
  if (a <= first.r) return (a / first.r) * getRpx(first);

  for (let i = 0; i < planets.length - 1; i += 1) {
    const lo = planets[i];
    const hi = planets[i + 1];
    if (a <= hi.r) {
      const t = (a - lo.r) / (hi.r - lo.r);
      return getRpx(lo) + t * (getRpx(hi) - getRpx(lo));
    }
  }

  const last = planets[planets.length - 1];
  const prev = planets[planets.length - 2] ?? last;
  const slope = (getRpx(last) - getRpx(prev)) / Math.max(1e-9, last.r - prev.r);
  return getRpx(last) + (a - last.r) * slope;
}

export function maxOrbitRadius() {
  let m = 0;
  for (const o of OBJECTS) {
    if (o.marker === "sun") continue;
    const rp = getRpx(o);
    const e = o.ecc ?? 0;
    const ext = app.orbitMode === "realistic" && e > 0 ? rp * (1 + e) : rp;
    m = Math.max(m, ext);
  }
  m = Math.max(m, pxFromAuChart(MAX_CHART_AU));
  return m;
}

export function appendBeltBandGlow(group, auInner, auOuter) {
  const rIn = pxFromAuChart(auInner);
  const rOut = pxFromAuChart(auOuter);
  if (!(rOut > rIn + 0.5)) return;
  const mid = (rIn + rOut) * 0.5;
  const sw = rOut - rIn;
  const ns = "http://www.w3.org/2000/svg";
  const c = document.createElementNS(ns, "circle");
  c.setAttribute("cx", "0");
  c.setAttribute("cy", "0");
  c.setAttribute("r", String(mid));
  c.setAttribute("fill", "none");
  const real = app.orbitMode === "realistic";
  c.setAttribute("stroke", real ? "rgba(100, 188, 178, 0.16)" : "rgba(130, 210, 198, 0.09)");
  c.setAttribute("stroke-width", String(sw));
  c.setAttribute("pointer-events", "none");
  group.appendChild(c);
  const haze = document.createElementNS(ns, "circle");
  haze.setAttribute("cx", "0");
  haze.setAttribute("cy", "0");
  haze.setAttribute("r", String(mid));
  haze.setAttribute("fill", "none");
  haze.setAttribute("stroke", real ? "rgba(120, 210, 200, 0.07)" : "rgba(150, 225, 215, 0.045)");
  haze.setAttribute("stroke-width", String(sw * 1.35));
  haze.setAttribute("pointer-events", "none");
  group.appendChild(haze);
}

export function buildBeltLayer() {
  const belts = document.getElementById("belts");
  if (!belts) return;
  belts.replaceChildren();

  const innerRng = mulberry32(0x4b1d);
  const kuiperRng = mulberry32(0xbeef);
  const gInner = document.createElementNS("http://www.w3.org/2000/svg", "g");
  gInner.setAttribute("id", "belt-inner-group");
  appendBeltBandGlow(gInner, 1.95, 3.5);
  const innerMain = app.orbitMode === "realistic" ? 1100 : 260;
  const innerFine = app.orbitMode === "realistic" ? 520 : 0;
  for (let i = 0; i < innerMain; i += 1) {
    const au = 2.05 + innerRng() * 1.32;
    const ang = innerRng() * Math.PI * 2;
    const r = pxFromAuChart(au);
    const cx = r * Math.cos(ang);
    const cy = -r * Math.sin(ang);
    const dot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    dot.setAttribute("cx", String(cx));
    dot.setAttribute("cy", String(cy));
    dot.setAttribute("r", app.orbitMode === "realistic" ? "1.35" : "0.95");
    dot.setAttribute(
      "fill",
      app.orbitMode === "realistic" ? "rgba(165, 238, 225, 0.42)" : "rgba(160, 230, 220, 0.35)"
    );
    dot.setAttribute("stroke", "none");
    gInner.appendChild(dot);
  }
  for (let i = 0; i < innerFine; i += 1) {
    const au = 2.02 + innerRng() * 1.36;
    const ang = innerRng() * Math.PI * 2;
    const r = pxFromAuChart(au);
    const cx = r * Math.cos(ang);
    const cy = -r * Math.sin(ang);
    const dot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    dot.setAttribute("cx", String(cx));
    dot.setAttribute("cy", String(cy));
    dot.setAttribute("r", "0.85");
    dot.setAttribute("fill", "rgba(150, 225, 215, 0.22)");
    dot.setAttribute("stroke", "none");
    gInner.appendChild(dot);
  }
  belts.appendChild(gInner);

  const gKuiper = document.createElementNS("http://www.w3.org/2000/svg", "g");
  gKuiper.setAttribute("id", "belt-kuiper-group");
  appendBeltBandGlow(gKuiper, 36.2, MAX_CHART_AU + 0.35);
  const kuiperMain = app.orbitMode === "realistic" ? 820 : 175;
  const kuiperFine = app.orbitMode === "realistic" ? 480 : 0;
  for (let i = 0; i < kuiperMain; i += 1) {
    const au = 37.85 + kuiperRng() * (MAX_CHART_AU - 37.85);
    const ang = kuiperRng() * Math.PI * 2;
    const rad = pxFromAuChart(au);
    const cx = rad * Math.cos(ang);
    const cy = -rad * Math.sin(ang);
    const dot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    dot.setAttribute("cx", String(cx));
    dot.setAttribute("cy", String(cy));
    dot.setAttribute("r", app.orbitMode === "realistic" ? "1.28" : "0.85");
    dot.setAttribute(
      "fill",
      app.orbitMode === "realistic" ? "rgba(150, 220, 212, 0.36)" : "rgba(140, 210, 205, 0.22)"
    );
    dot.setAttribute("stroke", "none");
    gKuiper.appendChild(dot);
  }
  for (let i = 0; i < kuiperFine; i += 1) {
    const au = 37.7 + kuiperRng() * (MAX_CHART_AU - 37.7);
    const ang = kuiperRng() * Math.PI * 2;
    const rad = pxFromAuChart(au);
    const cx = rad * Math.cos(ang);
    const cy = -rad * Math.sin(ang);
    const dot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    dot.setAttribute("cx", String(cx));
    dot.setAttribute("cy", String(cy));
    dot.setAttribute("r", "0.9");
    dot.setAttribute("fill", "rgba(135, 205, 198, 0.2)");
    dot.setAttribute("stroke", "none");
    gKuiper.appendChild(dot);
  }
  belts.appendChild(gKuiper);
}
