import { MAX_AU, R_REAL_MAX, BODY_FILL, MS_PER_DAY, J2000_MS } from "./constants.js";
import { app } from "./state.js";
import { planetDrawRadius, moonOrbitDistancePx } from "./appearance.js";

/**
 * @typedef {{
 *   id: string; nameKey: string; L0: number; periodDays: number; r: number; rPxSimple: number; rPxReal: number;
 *   marker?: string; color: string; ecc?: number; varpiDeg?: number;
 *   incDeg?: number; nodeDeg?: number;
 * }} OrbitObject
 */

/** @type {OrbitObject[]} */
export const OBJECTS = [
  { id: "sun", nameKey: "body_sol", L0: 0, periodDays: 1, r: 0, rPxSimple: 0, rPxReal: 0, marker: "sun" },
  {
    id: "mercury",
    nameKey: "body_mercury",
    L0: 252.250906,
    periodDays: 87.9691,
    r: 0.387098,
    ecc: 0.20563,
    varpiDeg: 77.45645,
    incDeg: 7.005,
    nodeDeg: 48.331,
    rPxSimple: 72,
    rPxReal: 0,
  },
  {
    id: "venus",
    nameKey: "body_venus",
    L0: 181.9798015,
    periodDays: 224.701,
    r: 0.723332,
    ecc: 0.006773,
    varpiDeg: 131.53298,
    incDeg: 3.39458,
    nodeDeg: 76.6799,
    rPxSimple: 94,
    rPxReal: 0,
  },
  {
    id: "earth",
    nameKey: "body_earth",
    L0: 100.46457166,
    periodDays: 365.256363004,
    r: 1.000001,
    ecc: 0.01670863,
    varpiDeg: 102.93735,
    incDeg: 0,
    nodeDeg: 0,
    rPxSimple: 119,
    rPxReal: 0,
  },
  {
    id: "mars",
    nameKey: "body_mars",
    L0: 355.44656795,
    periodDays: 686.98,
    r: 1.523679,
    ecc: 0.09341233,
    varpiDeg: 336.04084,
    incDeg: 1.85061,
    nodeDeg: 49.55854,
    rPxSimple: 143,
    rPxReal: 0,
  },
  {
    id: "ceres",
    nameKey: "body_ceres",
    L0: 95.27,
    periodDays: 1680.97,
    r: 2.7657,
    ecc: 0.075823,
    varpiDeg: 152.874,
    incDeg: 10.593,
    nodeDeg: 80.393,
    rPxSimple: 165,
    rPxReal: 0,
  },
  {
    id: "jupiter",
    nameKey: "body_jupiter",
    L0: 34.39644051,
    periodDays: 4332.59,
    r: 5.204267,
    ecc: 0.04839266,
    varpiDeg: 14.331309,
    incDeg: 1.303,
    nodeDeg: 100.4542,
    rPxSimple: 204,
    rPxReal: 0,
  },
  {
    id: "saturn",
    nameKey: "body_saturn",
    L0: 49.95424423,
    periodDays: 10759.22,
    r: 9.582017,
    ecc: 0.05550862,
    varpiDeg: 92.43194,
    incDeg: 2.485,
    nodeDeg: 113.665,
    rPxSimple: 259,
    rPxReal: 0,
  },
  {
    id: "uranus",
    nameKey: "body_uranus",
    L0: 313.2381045,
    periodDays: 30688.5,
    r: 19.21814,
    ecc: 0.04716771,
    varpiDeg: 170.95424,
    incDeg: 0.772556,
    nodeDeg: 74.006,
    rPxSimple: 320,
    rPxReal: 0,
  },
  {
    id: "neptune",
    nameKey: "body_neptune",
    L0: 304.8799703,
    periodDays: 60182,
    r: 30.06992,
    ecc: 0.00858587,
    varpiDeg: 44.40469,
    incDeg: 1.767975,
    nodeDeg: 131.784,
    rPxSimple: 369,
    rPxReal: 0,
  },
  {
    id: "pluto",
    nameKey: "body_pluto",
    L0: 238.9289383,
    periodDays: 90560,
    r: 39.48211675,
    ecc: 0.2488273,
    varpiDeg: 224.06876,
    incDeg: 17.166,
    nodeDeg: 110.299,
    rPxSimple: 411,
    rPxReal: 0,
  },
].map((o, i) => {
  const rPxReal = o.marker === "sun" ? 0 : (o.r / MAX_AU) * R_REAL_MAX;
  return { ...o, rPxReal, color: BODY_FILL[i] ?? BODY_FILL[BODY_FILL.length - 1] };
});

export function getRpx(o) {
  if (o.marker === "sun") return 0;
  return app.orbitMode === "realistic" ? o.rPxReal : o.rPxSimple;
}

export function mulberry32(a) {
  return () => {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** @type {{ id: string; parent: string; nameKey: string; periodDays: number; L0: number; oPx: number; major: boolean; orbitIncDeg?: number }[]} */
export const MOONS = [
  { id: "moon", parent: "earth", nameKey: "moon", periodDays: 27.321661, L0: 318.15, oPx: 16, major: true, orbitIncDeg: 5.145 },
  { id: "phobos", parent: "mars", nameKey: "phobos", periodDays: 0.31891023, L0: 48, oPx: 8, major: false, orbitIncDeg: 1.09 },
  { id: "deimos", parent: "mars", nameKey: "deimos", periodDays: 1.262441, L0: 195, oPx: 11, major: false, orbitIncDeg: 2.0 },
  { id: "io", parent: "jupiter", nameKey: "io", periodDays: 1.769137786, L0: 105, oPx: 13, major: true, orbitIncDeg: 0.036 },
  { id: "europa", parent: "jupiter", nameKey: "europa", periodDays: 3.551181041, L0: 215, oPx: 16, major: true, orbitIncDeg: 0.47 },
  { id: "ganymede", parent: "jupiter", nameKey: "ganymede", periodDays: 7.15455296, L0: 32, oPx: 20, major: true, orbitIncDeg: 0.2 },
  { id: "callisto", parent: "jupiter", nameKey: "callisto", periodDays: 16.6890184, L0: 305, oPx: 25, major: true, orbitIncDeg: 0.28 },
  { id: "enceladus", parent: "saturn", nameKey: "enceladus", periodDays: 1.370218, L0: 20, oPx: 11, major: true, orbitIncDeg: 0.019 },
  { id: "rhea", parent: "saturn", nameKey: "rhea", periodDays: 4.518212, L0: 95, oPx: 15, major: true, orbitIncDeg: 0.36 },
  { id: "titan", parent: "saturn", nameKey: "titan", periodDays: 15.945, L0: 175, oPx: 22, major: true, orbitIncDeg: 0.33 },
  { id: "titania", parent: "uranus", nameKey: "titania", periodDays: 8.706234, L0: 115, oPx: 12, major: true, orbitIncDeg: 0.08 },
  { id: "oberon", parent: "uranus", nameKey: "oberon", periodDays: 13.463234, L0: 275, oPx: 15, major: true, orbitIncDeg: 0.07 },
  { id: "triton", parent: "neptune", nameKey: "triton", periodDays: 5.876854, L0: 190, oPx: 14, major: true, orbitIncDeg: -156.885 },
  { id: "charon", parent: "pluto", nameKey: "charon", periodDays: 6.3872304, L0: 122.4, oPx: 13, major: true, orbitIncDeg: 0.08 },
];

export function seedMoonDots(parent, count, baseSeed) {
  const rng = mulberry32(baseSeed);
  const out = [];
  for (let i = 0; i < count; i += 1) {
    out.push({
      id: `${parent}-dot-${i}`,
      parent,
      nameKey: "moon_dot",
      periodDays: 0.35 + rng() * 40,
      L0: rng() * 360,
      oPx: 8 + rng() * 22,
      major: false,
      orbitIncDeg: 1 + rng() * 8,
    });
  }
  return out;
}

export const MOON_ALL = [
  ...MOONS,
  ...seedMoonDots("jupiter", 12, 0x9e3779b1),
  ...seedMoonDots("saturn", 10, 0x6c656f6e),
  ...seedMoonDots("uranus", 8, 0x7572616e),
  ...seedMoonDots("neptune", 6, 0x6e657074),
];

export function moonAngleDeg(moon, nowMs) {
  const dt = nowMs - J2000_MS;
  const n = (2 * Math.PI) / (moon.periodDays * MS_PER_DAY);
  const Ldeg = moon.L0 + (n * dt * 180) / Math.PI;
  return ((Ldeg % 360) + 360) % 360;
}

/** Registry / focus IDs for asteroid belts (same convention as chart belt groups). */
export const BELT_INNER_ID = "belt-inner";
export const BELT_KUIPER_ID = "belt-kuiper";

/** Mean heliocentric longitude of the belt ring (deg), for registry readout and rigid rotation. */
export function beltMeanLongitudeDeg(beltId, nowMs) {
  if (beltId !== BELT_INNER_ID && beltId !== BELT_KUIPER_ID) return 0;
  const dt = nowMs - J2000_MS;
  const periodDays = beltId === BELT_INNER_ID ? 1680 : 90000;
  const L0 = beltId === BELT_INNER_ID ? 63 : 142;
  const n = (2 * Math.PI) / (periodDays * MS_PER_DAY);
  const Ldeg = L0 + (n * dt * 180) / Math.PI;
  return ((Ldeg % 360) + 360) % 360;
}

/** @param {number} M mean anomaly (rad) @param {number} e eccentricity */
function solveKeplerE(M, e) {
  if (e < 1e-11) return M;
  let E = M + e * Math.sin(M);
  for (let i = 0; i < 40; i += 1) {
    const f = E - e * Math.sin(E) - M;
    const fp = 1 - e * Math.cos(E);
    const dE = f / fp;
    E -= dE;
    if (Math.abs(dE) < 1e-11) break;
  }
  return E;
}

/**
 * @param {OrbitObject} o
 * @param {number} rPx
 * @param {number} nowMs
 * @returns {{ rAu: number; nu: number; s: number; varpi: number }}
 */
function keplerFromMeanAnomaly(o, rPx, nowMs) {
  const a = o.r;
  const e = o.ecc ?? 0;
  const varpi = ((o.varpiDeg ?? 0) * Math.PI) / 180;
  const dt = nowMs - J2000_MS;
  const n = (2 * Math.PI) / (o.periodDays * MS_PER_DAY);
  let M = ((o.L0 - (o.varpiDeg ?? 0)) * Math.PI) / 180 + n * dt;
  M %= 2 * Math.PI;
  if (M < 0) M += 2 * Math.PI;
  const E = solveKeplerE(M, e);
  const cosE = Math.cos(E);
  const sinE = Math.sin(E);
  const denom = Math.max(1e-14, 1 - e * cosE);
  const sinNu = (Math.sqrt(Math.max(0, 1 - e * e)) * sinE) / denom;
  const cosNu = (cosE - e) / denom;
  const nu = Math.atan2(sinNu, cosNu);
  const rAu = a * (1 - e * cosE);
  const s = rPx / a;
  return { rAu, nu, s, varpi };
}

/**
 * Heliocentric chart px from Keplerian ellipse (realistic). Semimajor axis `o.r` (AU), linear px scale rPx/a.
 * @param {OrbitObject} o
 * @param {number} rPx
 * @param {number} nowMs
 */
export function heliocentricPxFromKepler(o, rPx, nowMs) {
  const { rAu, nu, s, varpi } = keplerFromMeanAnomaly(o, rPx, nowMs);
  const lam = varpi + nu;
  return { x: s * rAu * Math.cos(lam), y: -s * rAu * Math.sin(lam) };
}

/**
 * Heliocentric position in chart units with out-of-ecliptic z (px). x,y match 2D chart when inc=0; y is chart y (negative of ecliptic y).
 * @param {OrbitObject} o
 * @param {number} rPx
 * @param {number} nowMs
 */
export function heliocentricPx3dFromKepler(o, rPx, nowMs) {
  const { rAu, nu, s, varpi } = keplerFromMeanAnomaly(o, rPx, nowMs);
  const i = ((o.incDeg ?? 0) * Math.PI) / 180;
  const node = ((o.nodeDeg ?? 0) * Math.PI) / 180;
  let omega = varpi - node;
  omega = Math.atan2(Math.sin(omega), Math.cos(omega));
  const u = omega + nu;
  const ri = s * rAu;
  const cosi = Math.cos(i);
  const sinNode = Math.sin(node);
  const cosNode = Math.cos(node);
  const sinu = Math.sin(u);
  const cosu = Math.cos(u);
  const xe = ri * (cosNode * cosu - sinNode * sinu * cosi);
  const yeEc = ri * (sinNode * cosu + cosNode * sinu * cosi);
  const ze = ri * sinu * Math.sin(i);
  return { x: xe, y: -yeEc, z: ze };
}

/**
 * Closed orbit polyline in chart px (same convention as motion). `segs` segments.
 * @param {OrbitObject} o
 * @param {number} rPx
 * @param {number} segs
 * @returns {number[]} flat [x0,y0,x1,y1,...]
 */
export function planetOrbitPolylinePx(o, rPx, segs) {
  if (o.marker === "sun") return [];
  const a = o.r;
  const e = o.ecc ?? 0;
  const varpi = ((o.varpiDeg ?? 0) * Math.PI) / 180;
  const s = rPx / a;
  const out = [];
  for (let i = 0; i <= segs; i += 1) {
    const E = (i / segs) * 2 * Math.PI;
    const cosE = Math.cos(E);
    const sinE = Math.sin(E);
    const denom = Math.max(1e-14, 1 - e * cosE);
    const sinNu = (Math.sqrt(Math.max(0, 1 - e * e)) * sinE) / denom;
    const cosNu = (cosE - e) / denom;
    const nu = Math.atan2(sinNu, cosNu);
    const rAu = a * (1 - e * cosE);
    const lam = varpi + nu;
    out.push(s * rAu * Math.cos(lam), -s * rAu * Math.sin(lam));
  }
  return out;
}

/**
 * Closed heliocentric orbit polyline in chart px with z (same convention as {@link heliocentricPx3dFromKepler}).
 * @param {OrbitObject} o
 * @param {number} rPx
 * @param {number} segs
 * @returns {number[]} flat [x0,y0,z0,x1,y1,z1,...]
 */
export function planetOrbitPolyline3d(o, rPx, segs) {
  if (o.marker === "sun") return [];
  if (app.orbitMode !== "realistic") {
    const out = [];
    for (let k = 0; k <= segs; k += 1) {
      const t = (k / segs) * 2 * Math.PI;
      out.push(rPx * Math.cos(t), -rPx * Math.sin(t), 0);
    }
    return out;
  }
  const a = o.r;
  const e = o.ecc ?? 0;
  const varpi = ((o.varpiDeg ?? 0) * Math.PI) / 180;
  const i = ((o.incDeg ?? 0) * Math.PI) / 180;
  const node = ((o.nodeDeg ?? 0) * Math.PI) / 180;
  let omega = varpi - node;
  omega = Math.atan2(Math.sin(omega), Math.cos(omega));
  const s = rPx / a;
  const cosi = Math.cos(i);
  const sinNode = Math.sin(node);
  const cosNode = Math.cos(node);
  const out = [];
  for (let k = 0; k <= segs; k += 1) {
    const E = (k / segs) * 2 * Math.PI;
    const cosE = Math.cos(E);
    const sinE = Math.sin(E);
    const denom = Math.max(1e-14, 1 - e * cosE);
    const sinNu = (Math.sqrt(Math.max(0, 1 - e * e)) * sinE) / denom;
    const cosNu = (cosE - e) / denom;
    const nu = Math.atan2(sinNu, cosNu);
    const rAu = a * (1 - e * cosE);
    const u = omega + nu;
    const ri = s * rAu;
    const sinu = Math.sin(u);
    const cosu = Math.cos(u);
    const xe = ri * (cosNode * cosu - sinNode * sinu * cosi);
    const yeEc = ri * (sinNode * cosu + cosNode * sinu * cosi);
    const ze = ri * sinu * Math.sin(i);
    out.push(xe, -yeEc, ze);
  }
  return out;
}

/**
 * Tilt offset (mx, my, mz) around axis ⟂ (0,0,1)×v by incDeg (Rodrigues).
 * @param {number} mx
 * @param {number} my
 * @param {number} mz
 * @param {number} incDeg
 */
export function tiltOffsetInEclipticZ(mx, my, mz, incDeg) {
  if (Math.abs(incDeg) < 1e-8) return { ox: mx, oy: my, oz: mz };
  const d = Math.hypot(mx, my);
  if (d < 1e-10) return { ox: mx, oy: my, oz: mz };
  const kx = -my / d;
  const ky = mx / d;
  const kz = 0;
  const θ = (incDeg * Math.PI) / 180;
  const cosT = Math.cos(θ);
  const sinT = Math.sin(θ);
  const dot = kx * mx + ky * my + kz * mz;
  const cx = ky * mz - kz * my;
  const cy = kz * mx - kx * mz;
  const cz = kx * my - ky * mx;
  return {
    ox: mx * cosT + cx * sinT + kx * dot * (1 - cosT),
    oy: my * cosT + cy * sinT + ky * dot * (1 - cosT),
    oz: mz * cosT + cz * sinT + kz * dot * (1 - cosT),
  };
}

export function meanLongitudeRad(nowMs) {
  const dt = nowMs - J2000_MS;
  return OBJECTS.map((o) => {
    if (o.marker === "sun") return { ...o, L: 0, x: 0, y: 0 };
    const rPx = getRpx(o);
    const n = (2 * Math.PI) / (o.periodDays * MS_PER_DAY);
    const Ldeg = o.L0 + (n * dt * 180) / Math.PI;
    const L = ((Ldeg % 360) + 360) % 360;
    if (app.orbitMode !== "realistic") {
      const rad = (L * Math.PI) / 180;
      const x = rPx * Math.cos(rad);
      const y = -rPx * Math.sin(rad);
      return { ...o, L, x, y, rPxActive: rPx };
    }
    const { x, y } = heliocentricPxFromKepler(o, rPx, nowMs);
    return { ...o, L, x, y, rPxActive: rPx };
  });
}

/** Heliocentric chart (x, y), same convention as SVG — used by registry focus and WebGL chart. */
export function objectWorldPosition(state, nowMs, objectId) {
  const body = OBJECTS.find((x) => x.id === objectId);
  if (body?.marker === "sun") return { x: 0, y: 0 };
  if (body) {
    const s = state.find((p) => p.id === objectId);
    return s ? { x: s.x, y: s.y } : { x: 0, y: 0 };
  }
  const moon = MOON_ALL.find((m) => m.id === objectId);
  if (!moon) return { x: 0, y: 0 };
  const par = state.find((p) => p.id === moon.parent);
  if (!par) return { x: 0, y: 0 };
  const pr = planetDrawRadius(par.id, par.rPxActive);
  const dist = moonOrbitDistancePx(moon, pr);
  const Lm = moonAngleDeg(moon, nowMs);
  const rad = (Lm * Math.PI) / 180;
  const mx = dist * Math.cos(rad);
  const my = -dist * Math.sin(rad);
  return { x: par.x + mx, y: par.y + my };
}

/**
 * 3D chart position (x,y chart-plane, z out of ecliptic) for WebGL — planets use inclination; moons use {@link tiltOffsetInEclipticZ}.
 * @param {ReturnType<typeof meanLongitudeRad>} state
 * @param {number} nowMs
 * @param {string} objectId
 */
export function objectWorldPosition3d(state, nowMs, objectId) {
  const body = OBJECTS.find((x) => x.id === objectId);
  if (body?.marker === "sun") return { x: 0, y: 0, z: 0 };
  if (body && !body.marker) {
    const s = state.find((p) => p.id === objectId);
    if (!s) return { x: 0, y: 0, z: 0 };
    const rPx = s.rPxActive;
    if (app.orbitMode === "realistic") {
      return heliocentricPx3dFromKepler(body, rPx, nowMs);
    }
    const rad = (s.L * Math.PI) / 180;
    return { x: rPx * Math.cos(rad), y: -rPx * Math.sin(rad), z: 0 };
  }
  const moon = MOON_ALL.find((m) => m.id === objectId);
  if (!moon) return { x: 0, y: 0, z: 0 };
  const par = state.find((p) => p.id === moon.parent);
  if (!par) return { x: 0, y: 0, z: 0 };
  const parO = OBJECTS.find((p) => p.id === moon.parent);
  if (!parO || parO.marker === "sun") return { x: 0, y: 0, z: 0 };
  const p3 = objectWorldPosition3d(state, nowMs, moon.parent);
  const pr = planetDrawRadius(par.id, par.rPxActive);
  const dist = moonOrbitDistancePx(moon, pr);
  const Lm = moonAngleDeg(moon, nowMs);
  const rad = (Lm * Math.PI) / 180;
  const mx = dist * Math.cos(rad);
  const my = -dist * Math.sin(rad);
  const off = tiltOffsetInEclipticZ(mx, my, 0, moon.orbitIncDeg ?? 0);
  return { x: p3.x + off.ox, y: p3.y + off.oy, z: p3.z + off.oz };
}
