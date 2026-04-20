import * as THREE from "three";
import { app } from "./state.js";
import { OBJECTS, MOONS } from "./model.js";
import { bodyLabel } from "./format.js";

/** @typedef {{ eqKm: number; polarKm: number; tiltDeg: number; rotPeriodHours: number }} BodySpin */

/** Approx physical params (good-looking, not ephemeris-grade). */
const SPIN = /** @type {Record<string, BodySpin>} */ ({
  sun: { eqKm: 696_000, polarKm: 696_000 * 0.997, tiltDeg: 7.25, rotPeriodHours: 25.38 * 24 },
  mercury: { eqKm: 2_439.7, polarKm: 2_439.7, tiltDeg: 0.034, rotPeriodHours: 1407.6 },
  venus: { eqKm: 6_051.8, polarKm: 6_051.8, tiltDeg: 177.36, rotPeriodHours: 5832.5 }, // retrograde: modelled via tilt
  earth: { eqKm: 6_378.137, polarKm: 6_356.752, tiltDeg: 23.439, rotPeriodHours: 23.9345 },
  mars: { eqKm: 3_396.2, polarKm: 3_376.2, tiltDeg: 25.19, rotPeriodHours: 24.6229 },
  jupiter: { eqKm: 71_492, polarKm: 66_854, tiltDeg: 3.13, rotPeriodHours: 9.925 },
  saturn: { eqKm: 60_268, polarKm: 54_364, tiltDeg: 26.73, rotPeriodHours: 10.7 },
  uranus: { eqKm: 25_559, polarKm: 24_973, tiltDeg: 97.77, rotPeriodHours: 17.24 },
  neptune: { eqKm: 24_764, polarKm: 24_341, tiltDeg: 28.32, rotPeriodHours: 16.11 },
  pluto: { eqKm: 1_188.3, polarKm: 1_188.3, tiltDeg: 119.61, rotPeriodHours: 153.3 },

  moon: { eqKm: 1_737.4, polarKm: 1_737.4, tiltDeg: 6.68, rotPeriodHours: 655.72 },
  phobos: { eqKm: 11.27, polarKm: 9.1, tiltDeg: 0.0, rotPeriodHours: 7.65 },
  deimos: { eqKm: 6.2, polarKm: 5.0, tiltDeg: 0.0, rotPeriodHours: 30.35 },
  io: { eqKm: 1_821.6, polarKm: 1_821.6, tiltDeg: 0.0, rotPeriodHours: 42.46 },
  europa: { eqKm: 1_560.8, polarKm: 1_560.8, tiltDeg: 0.1, rotPeriodHours: 85.23 },
  ganymede: { eqKm: 2_634.1, polarKm: 2_634.1, tiltDeg: 0.3, rotPeriodHours: 171.72 },
  callisto: { eqKm: 2_410.3, polarKm: 2_410.3, tiltDeg: 0.0, rotPeriodHours: 400.54 },
  enceladus: { eqKm: 252.1, polarKm: 248.6, tiltDeg: 0.0, rotPeriodHours: 32.89 },
  rhea: { eqKm: 763.8, polarKm: 763.8, tiltDeg: 0.0, rotPeriodHours: 108.45 },
  titan: { eqKm: 2_574.7, polarKm: 2_574.7, tiltDeg: 0.0, rotPeriodHours: 382.68 },
  titania: { eqKm: 788.9, polarKm: 788.9, tiltDeg: 0.0, rotPeriodHours: 209.0 },
  oberon: { eqKm: 761.4, polarKm: 761.4, tiltDeg: 0.0, rotPeriodHours: 323.1 },
  triton: { eqKm: 1_353.4, polarKm: 1_353.4, tiltDeg: 157.3, rotPeriodHours: 141.0 },
  charon: { eqKm: 606.0, polarKm: 606.0, tiltDeg: 0.0, rotPeriodHours: 153.3 },
});

function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}

function bodyColor(id) {
  const o = OBJECTS.find((x) => x.id === id);
  if (o?.color) return o.color;
  const m = MOONS.find((x) => x.id === id);
  if (m) return "rgba(195, 248, 238, 0.75)";
  return "rgba(195, 248, 238, 0.75)";
}

function getSpin(id) {
  return SPIN[id] ?? { eqKm: 1000, polarKm: 1000, tiltDeg: 0, rotPeriodHours: 24 };
}

function hash01(id) {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 2 ** 32;
}

function fract(x) {
  return x - Math.floor(x);
}

/** @param {number} x */
function hash21(x) {
  return fract(Math.sin(x * 127.1 + 311.7) * 43758.5453123);
}

/** @param {number} x @param {number} y */
function noise2(x, y) {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = fract(x);
  const fy = fract(y);
  const a = hash21(ix + iy * 57.0);
  const b = hash21(ix + 1 + iy * 57.0);
  const c = hash21(ix + (iy + 1) * 57.0);
  const d = hash21(ix + 1 + (iy + 1) * 57.0);
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);
  return THREE.MathUtils.lerp(THREE.MathUtils.lerp(a, b, ux), THREE.MathUtils.lerp(c, d, ux), uy);
}

function fbm2(x, y, oct) {
  let v = 0;
  let a = 0.5;
  let f = 1;
  for (let i = 0; i < oct; i++) {
    v += a * noise2(x * f, y * f);
    f *= 2.05;
    a *= 0.5;
  }
  return v;
}

function oblateNormal(ax, ay, az, polarScale) {
  const a = 1;
  const b = polarScale;
  const nx = ax / (a * a);
  const ny = ay / (b * b);
  const nz = az / (a * a);
  const len = Math.hypot(nx, ny, nz) || 1;
  return new THREE.Vector3(nx / len, ny / len, nz / len);
}

function gasBands(id, lat, lon) {
  const seed = hash01(id) * 40;
  const u = (lon / Math.PI) * 6 + seed;
  const v = lat * 10 + seed * 0.15;

  let bandFreq = 2.2;
  let turb = 2.1;
  let stormGain = 6;
  if (id === "jupiter") {
    bandFreq = 2.35;
    turb = 2.35;
    stormGain = 7.5;
  } else if (id === "saturn") {
    bandFreq = 1.85;
    turb = 1.65;
    stormGain = 4.5;
  } else if (id === "uranus") {
    bandFreq = 1.25;
    turb = 1.15;
    stormGain = 3.2;
  } else if (id === "neptune") {
    bandFreq = 2.05;
    turb = 2.55;
    stormGain = 8.5;
  }

  const band = 0.55 + 0.45 * Math.sin(v * bandFreq + fbm2(u * 1.2, v * 0.6, 4) * turb);
  const storm = Math.pow(Math.max(0, fbm2(u * 2.5, v * 1.8, 3) - 0.55), 2) * stormGain;
  return clamp(band + storm, 0, 1);
}

function rockyTerrain(id, lat, lon) {
  const s = hash01(id) * 200;
  const x = lat * 7.5 + s;
  const y = lon * 7.5 - s * 0.7;
  const base = fbm2(x, y, 6);
  const cr = Math.pow(Math.max(0, fbm2(x * 4.2, y * 4.2, 4) - 0.58), 1.15);
  return base * 0.45 + cr * 1.55;
}

function iceCracks(lat, lon) {
  const x = lat * 10;
  const y = lon * 10;
  const c = Math.abs(fbm2(x * 2.2, y * 2.2, 3) - 0.5);
  return Math.pow(1 - c * 2, 3);
}

function sunGranulation(lat, lon) {
  const x = lat * 18;
  const y = lon * 18;
  const g = fbm2(x, y, 4);
  const c = fbm2(x * 3.2 + 10, y * 3.2 - 6, 3);
  return g * 0.55 + c * 0.45;
}

function earthLand(lat, lon) {
  // Stylised continents: large-scale blobs + coastline noise (not geographic).
  const x = lat * 2.2;
  const y = lon * 2.2;
  const continents = fbm2(x + 3.1, y - 1.7, 4);
  const coast = fbm2(x * 4.5, y * 4.5, 3);
  const latBias = 0.12 * Math.cos(lat * 2); // slightly more land away from equator
  const m = continents * 0.78 + coast * 0.22 + latBias;
  return m;
}

function applyCrtCyanPalette(out, o, br0, bg0, bb0, shade, tint) {
  // Base: keep everything in the site's cyan family by scaling channels,
  // and only slightly shifting the R/G/B balance with `tint`.
  // tint in [-1..1] (negative → cooler/bluer, positive → warmer/greener).
  const t = clamp(tint, -1, 1);
  const rMul = 0.92 - t * 0.08;
  const gMul = 1.02 + t * 0.12;
  const bMul = 1.06 + t * 0.10;
  const k = clamp(shade, 0.25, 1.45);
  out[o + 0] = br0 * rMul * k;
  out[o + 1] = bg0 * gMul * k;
  out[o + 2] = bb0 * bMul * k;
}

function gasGiantCyan(id, lat, lon, h01, out, o, br0, bg0, bb0) {
  // Make bands readable using brightness + slight cyan tint shift.
  const u = lon / Math.PI;
  const v = lat / (Math.PI / 2);
  const band = Math.sin(v * (id === "saturn" ? 7.2 : id === "uranus" ? 4.0 : 10.0) + fbm2(u * 2.0, v * 1.2, 3) * 1.9);
  const stripe = 0.55 + 0.45 * band;
  const cloud = fbm2(u * 2.8 + 10, v * 2.2 - 6, 3);
  const shade = 0.55 + stripe * 0.55 + cloud * 0.35 + (h01 - 0.5) * 0.25;

  // Tint per-planet (still cyan).
  let tint = 0;
  if (id === "jupiter") tint = 0.35;
  else if (id === "saturn") tint = 0.15;
  else if (id === "uranus") tint = -0.2;
  else if (id === "neptune") tint = -0.35;

  // Local swirls / storms: boost contrast without leaving palette.
  const storm = Math.pow(Math.max(0, fbm2(u * 3.1, v * 3.1, 3) - 0.6), 1.6);
  applyCrtCyanPalette(out, o, br0, bg0, bb0, shade + storm * 0.75, tint + storm * 0.25);
}

function rockyCyanRelief(id, h01, out, o, br0, bg0, bb0) {
  // Height-based shading: brighter ridges, darker basins, with tiny tint shift.
  const t = clamp(h01, 0, 1);
  const shade = 0.42 + t * 1.05;
  let tint = 0.05 + (t - 0.5) * 0.15;
  if (id === "mars") tint += 0.05;
  if (id === "mercury") tint -= 0.04;
  applyCrtCyanPalette(out, o, br0, bg0, bb0, shade, tint);
}

function buildSurfacePoints(id, polarScale, targetR, want) {
  const n = want;
  const pos = new Float32Array(n * 3);
  const col = new Float32Array(n * 3);
  const baseCol = new THREE.Color(bodyColor(id));
  const br0 = baseCol.r;
  const bg0 = baseCol.g;
  const bb0 = baseCol.b;

  let wrote = 0;
  let tries = 0;
  const maxTries = n * 90;

  let earthThresh = 0.48;
  const isEarth = id === "earth";

  while (wrote < n && tries < maxTries) {
    tries++;
    const u = hash21(tries + hash01(id) * 1000);
    const v = hash21(tries * 1.618 + hash01(id) * 333);
    const cosLat = 2 * u - 1;
    const lat = Math.acos(clamp(cosLat, -1, 1)) - Math.PI / 2;
    const lon = 2 * Math.PI * v;

    const ax = Math.cos(lat) * Math.cos(lon);
    const ay = Math.sin(lat);
    const az = Math.cos(lat) * Math.sin(lon);

    let keep = true;
    let h01 = 0;
    let disp = 0;
    let br = 1;
    let rgbMode = /** @type {"base" | "gas" | "rockyTint" | "sun"} */ ("base");

    if (isEarth) {
      const land = earthLand(lat, lon);
      if (land < earthThresh) {
        keep = false;
      } else {
        h01 = rockyTerrain("earth", lat, lon);
        disp = 0.02 + h01 * 0.07;
        rgbMode = "rockyTint";
      }
    } else if (id === "sun") {
      h01 = sunGranulation(lat, lon);
      disp = 0.008 + h01 * 0.03;
      rgbMode = "sun";
    } else if (id === "jupiter" || id === "saturn" || id === "uranus" || id === "neptune") {
      h01 = gasBands(id, lat, lon);
      disp = 0.006 + h01 * 0.03;
      rgbMode = "gas";
    } else if (id === "venus") {
      h01 = fbm2(lat * 5 + 2, lon * 5 - 1, 5);
      disp = 0.004 + h01 * 0.02;
      br = 0.55 + h01 * 0.45;
    } else if (id === "mars") {
      h01 = rockyTerrain("mars", lat, lon);
      disp = 0.018 + h01 * 0.09;
      rgbMode = "rockyTint";
    } else if (id === "mercury") {
      h01 = rockyTerrain("mercury", lat, lon);
      disp = 0.014 + h01 * 0.07;
      rgbMode = "rockyTint";
    } else if (id === "pluto" || id === "ceres") {
      h01 = rockyTerrain(id, lat, lon) * 0.75 + iceCracks(lat, lon) * 0.55;
      disp = 0.014 + h01 * 0.06;
      rgbMode = "rockyTint";
    } else if (id === "europa" || id === "enceladus") {
      const cracks = iceCracks(lat, lon);
      h01 = cracks * 0.85 + fbm2(lat * 8, lon * 8, 3) * 0.25;
      disp = 0.006 + (1 - cracks) * 0.03 + cracks * 0.018;
      br = 0.55 + cracks * 0.45;
    } else if (id === "io") {
      const spots = Math.pow(Math.max(0, fbm2(lat * 7, lon * 7, 3) - 0.35), 1.2);
      h01 = fbm2(lat * 3, lon * 3, 4) * 0.55 + spots;
      disp = 0.012 + spots * 0.08 + h01 * 0.04;
      br = 0.55 + spots * 0.55;
    } else if (id === "titan") {
      h01 = fbm2(lat * 2.2, lon * 2.2, 4) * 0.55 + fbm2(lat * 9, lon * 9, 2) * 0.45;
      disp = 0.006 + h01 * 0.03;
      br = 0.45 + h01 * 0.45;
    } else if (MOONS.some((m) => m.id === id)) {
      h01 = rockyTerrain(id, lat, lon);
      const cr = Math.pow(Math.max(0, fbm2(lat * 9, lon * 9, 3) - 0.62), 1.25);
      disp = 0.014 + h01 * 0.05 + cr * 0.1;
      rgbMode = "rockyTint";
    } else {
      // Generic rocky / icy moon fallback
      h01 = rockyTerrain(id, lat, lon);
      disp = 0.012 + h01 * 0.05;
      rgbMode = "rockyTint";
    }

    if (!keep) {
      if (isEarth && tries % 9000 === 0 && earthThresh > 0.34) earthThresh -= 0.02;
      continue;
    }

    const nrm = oblateNormal(ax, ay, az, polarScale);
    const px = (ax + nrm.x * disp) * targetR;
    const py = (ay + nrm.y * disp) * targetR;
    const pz = (az + nrm.z * disp) * targetR;

    pos[wrote * 3 + 0] = px;
    pos[wrote * 3 + 1] = py;
    pos[wrote * 3 + 2] = pz;

    const o = wrote * 3;
    if (rgbMode === "gas") {
      gasGiantCyan(id, lat, lon, h01, col, o, br0, bg0, bb0);
    } else if (rgbMode === "rockyTint") {
      rockyCyanRelief(id, h01, col, o, br0, bg0, bb0);
    } else if (rgbMode === "sun") {
      const warm = 0.65 + h01 * 0.55;
      const cool = 0.55 + (1 - h01) * 0.35;
      col[o + 0] = br0 * warm * 1.05;
      col[o + 1] = bg0 * warm * 0.95;
      col[o + 2] = bb0 * cool * 1.05;
    } else {
      col[o + 0] = br0 * br;
      col[o + 1] = bg0 * br;
      col[o + 2] = bb0 * br;
    }
    wrote++;
  }

  // If we couldn't fill (should be rare), trim arrays by rebuilding smaller geometry later.
  if (wrote < n) {
    return {
      pos: pos.subarray(0, wrote * 3),
      col: col.subarray(0, wrote * 3),
    };
  }

  return { pos, col };
}

let renderer = null;
let scene = null;
let camera = null;
let root = null;
let points = null;
let canvas = null;
let currentId = null;
let spinAngle = 0;
let previewCaptionId = "";
// Sun FX uses app.simTimeMs (same clock as orbit/scrub buttons) so shifts + rewind stay coherent.
// next*AtSimMs are absolute sim deadlines; each crossing advances the schedule even at spawn caps.
let nextLoopAtSimMs = 0;
let nextJetAtSimMs = 0;
let nextCoronaWispAtSimMs = 0;
let sunLoopCount = 0;
let sunJetCount = 0;
let sunCoronaWispCount = 0;
/** Last sim clock after preview tick (detects shiftSimTime / reset between frames). */
let sunFxLastSimAtPreviewEnd = /** @type {number | undefined} */ (undefined);
/** Virtual sim time while integrating sun FX (spawns use this, not app.simTimeMs mid-frame). */
let sunFxEvalSimMs = 0;

/** @typedef {{ kind: "loop" | "jet" | "coronaWisp"; bornSimMs: number; durSimMs: number; geo: THREE.BufferGeometry; mat: THREE.PointsMaterial; obj: THREE.Points; meta: any }} SunEvent */
/** @type {SunEvent[]} */
let sunEvents = [];

function rand01() {
  return Math.random();
}

function expIntervalMs(ratePerMs) {
  // Exponential inter-arrival time for a Poisson process
  const u = Math.max(1e-12, 1 - rand01());
  return -Math.log(u) / Math.max(1e-12, ratePerMs);
}

function pickLatLon() {
  // Uniform on sphere
  const u = rand01();
  const v = rand01();
  const z = 2 * u - 1;
  const lon = 2 * Math.PI * v;
  const lat = Math.asin(clamp(z, -1, 1));
  return { lat, lon };
}

function dirFromLatLon(lat, lon) {
  const cl = Math.cos(lat);
  return new THREE.Vector3(cl * Math.cos(lon), Math.sin(lat), cl * Math.sin(lon));
}

function addSunChild(obj) {
  if (!points) return;
  obj.userData.sunFx = true;
  points.add(obj);
}

function clearSunFx() {
  for (const ev of sunEvents) {
    ev.geo.dispose();
    ev.mat.dispose();
  }
  sunEvents = [];
  if (points) {
    for (const ch of [...points.children]) {
      if (ch.userData?.sunFx) points.remove(ch);
    }
  }
  nextLoopAtSimMs = 0;
  nextJetAtSimMs = 0;
  nextCoronaWispAtSimMs = 0;
  sunLoopCount = 0;
  sunJetCount = 0;
  sunCoronaWispCount = 0;
}

function syncBodyPreviewCaption() {
  const el = document.getElementById("body-preview-name");
  if (!el) return;
  const id = app.trackedBodyId || "sun";
  if (id === previewCaptionId) return;
  previewCaptionId = id;
  el.textContent = bodyLabel(id);
}

function spawnCoronaWisp(targetR) {
  if (!points) return;
  const { lat, lon } = pickLatLon();
  const foot = dirFromLatLon(lat, lon);
  const outward = foot.clone().normalize();
  const up = Math.abs(outward.y) < 0.92 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
  const tangent = new THREE.Vector3().crossVectors(up, outward);
  if (tangent.lengthSq() < 1e-8) tangent.set(1, 0, 0);
  tangent.normalize();
  const bitangent = new THREE.Vector3().crossVectors(outward, tangent).normalize();

  const n = 520;
  const pos = new Float32Array(n * 3);
  const col = new Float32Array(n * 3);
  const base = new THREE.Color(bodyColor("sun"));
  const span = (0.22 + rand01() * 0.55) * (Math.PI / 6); // fan width
  const reach = targetR * (0.10 + rand01() * 0.22);
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const a = (t - 0.5) * span;
    const dir = outward
      .clone()
      .addScaledVector(tangent, Math.sin(a) * 0.55)
      .addScaledVector(bitangent, (rand01() - 0.5) * 0.08)
      .normalize();
    const lift = Math.sin(Math.PI * t);
    const r = targetR * 1.01 + reach * lift;
    pos[i * 3 + 0] = dir.x * r;
    pos[i * 3 + 1] = dir.y * r;
    pos[i * 3 + 2] = dir.z * r;
    const glow = 0.25 + lift * 0.85;
    col[i * 3 + 0] = base.r * glow * 0.85;
    col[i * 3 + 1] = base.g * glow * 1.08;
    col[i * 3 + 2] = base.b * glow * 1.12;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
  const mat = new THREE.PointsMaterial({
    vertexColors: true,
    size: 0.0030,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const obj = new THREE.Points(geo, mat);
  addSunChild(obj);
  sunEvents.push({
    kind: "coronaWisp",
    bornSimMs: sunFxEvalSimMs,
    durSimMs: 35 * 60 * 1000 + rand01() * 95 * 60 * 1000, // 35–130m sim
    geo,
    mat,
    obj,
    meta: { phase: rand01() * Math.PI * 2 },
  });
  sunCoronaWispCount++;
}

function spawnSunLoop(targetR) {
  if (!points) return;
  const { lat, lon } = pickLatLon();
  const d = dirFromLatLon(lat, lon);
  const axis = new THREE.Vector3(rand01() - 0.5, rand01() - 0.5, rand01() - 0.5).normalize();
  const sep = 0.12 + rand01() * 0.32;
  const d2 = d.clone().applyAxisAngle(axis, sep);

  const n = 240;
  const pos = new Float32Array(n * 3);
  const col = new Float32Array(n * 3);
  const base = new THREE.Color(bodyColor("sun"));
  const height = targetR * (0.18 + rand01() * 0.28);
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    // Interpolate footpoints, then lift outwards to form an arc
    const p = d.clone().lerp(d2, t).normalize();
    const lift = Math.sin(Math.PI * t);
    const r = targetR * 1.01 + height * lift;
    pos[i * 3 + 0] = p.x * r;
    pos[i * 3 + 1] = p.y * r;
    pos[i * 3 + 2] = p.z * r;
    const glow = 0.35 + lift * 0.95;
    col[i * 3 + 0] = base.r * glow * 0.85;
    col[i * 3 + 1] = base.g * glow * 1.08;
    col[i * 3 + 2] = base.b * glow * 1.12;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
  const mat = new THREE.PointsMaterial({
    vertexColors: true,
    size: 0.0030,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const obj = new THREE.Points(geo, mat);
  addSunChild(obj);
  sunEvents.push({
    kind: "loop",
    bornSimMs: sunFxEvalSimMs,
    durSimMs: 8 * 60 * 60 * 1000 + rand01() * 6 * 60 * 60 * 1000, // 8–14h sim
    geo,
    mat,
    obj,
    meta: { phase: rand01() * Math.PI * 2 },
  });
  sunLoopCount++;
}

function spawnSunJet(targetR) {
  if (!points) return;
  const { lat, lon } = pickLatLon();
  const d = dirFromLatLon(lat, lon);

  const n = 520;
  const pos = new Float32Array(n * 3);
  const col = new Float32Array(n * 3);
  const base = new THREE.Color(bodyColor("sun"));
  const len = targetR * (0.28 + rand01() * 0.55);
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const spread = (1 - t) * 0.04 + rand01() * 0.012;
    const jitter = new THREE.Vector3(rand01() - 0.5, rand01() - 0.5, rand01() - 0.5).normalize().multiplyScalar(spread);
    const p = d.clone().add(jitter).normalize();
    const r = targetR * 1.005 + len * t;
    pos[i * 3 + 0] = p.x * r;
    pos[i * 3 + 1] = p.y * r;
    pos[i * 3 + 2] = p.z * r;
    const glow = 1.05 - t * 0.95;
    col[i * 3 + 0] = base.r * glow * 0.9;
    col[i * 3 + 1] = base.g * glow * 1.15;
    col[i * 3 + 2] = base.b * glow * 1.2;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
  const mat = new THREE.PointsMaterial({
    vertexColors: true,
    size: 0.0032,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const obj = new THREE.Points(geo, mat);
  addSunChild(obj);
  sunEvents.push({
    kind: "jet",
    bornSimMs: sunFxEvalSimMs,
    durSimMs: 10 * 60 * 1000 + rand01() * 25 * 60 * 1000, // 10–35m sim
    geo,
    mat,
    obj,
    meta: { phase: rand01() * Math.PI * 2 },
  });
  sunJetCount++;
}

function drainSunPoisson(targetR, simMs, nextAt, ratePerMs, count, maxCount, spawn) {
  if (nextAt.v <= 0) nextAt.v = simMs + expIntervalMs(ratePerMs);
  let guard = 0;
  while (simMs >= nextAt.v && guard < 320) {
    guard++;
    if (count() < maxCount) spawn();
    nextAt.v += expIntervalMs(ratePerMs);
  }
  if (simMs >= nextAt.v) nextAt.v = simMs + expIntervalMs(ratePerMs);
}

function cullSunEventsAtSim(simMs) {
  if (!sunEvents.length) return;
  const keep = [];
  for (const ev of sunEvents) {
    const alive = ev.bornSimMs <= simMs && simMs < ev.bornSimMs + ev.durSimMs;
    if (!alive) {
      ev.obj.removeFromParent();
      ev.geo.dispose();
      ev.mat.dispose();
      if (ev.kind === "loop") sunLoopCount = Math.max(0, sunLoopCount - 1);
      if (ev.kind === "jet") sunJetCount = Math.max(0, sunJetCount - 1);
      if (ev.kind === "coronaWisp") sunCoronaWispCount = Math.max(0, sunCoronaWispCount - 1);
      continue;
    }
    keep.push(ev);
  }
  sunEvents = keep;
}

/** Integrate spawns/culls in small sim-time slices so one rAF does not skip entire flare lifetimes. */
function absorbForwardSunFx(targetR, simStart, simEnd) {
  const CHUNK_MS = 18 * 60 * 1000; // < shortest wisp duration so events aren’t born+dead in one hop
  let work = simStart;
  let guard = 0;
  while (work < simEnd - 1e-3 && guard < 32000) {
    guard++;
    work = Math.min(simEnd, work + CHUNK_MS);
    sunFxEvalSimMs = work;
    updateSunEvents(targetR);
    cullSunEventsAtSim(work);
  }
  // Long tab-idle etc.: finish interval in one step so Poisson deadlines stay aligned with simEnd.
  if (work < simEnd - 1e-3) {
    sunFxEvalSimMs = simEnd;
    updateSunEvents(targetR);
    cullSunEventsAtSim(simEnd);
  }
}

function refreshSunFxVisualAtSim(simMs) {
  const keep = [];
  for (const ev of sunEvents) {
    const age = simMs - ev.bornSimMs;
    const t = age / ev.durSimMs;
    if (age < 0 || t >= 1) {
      ev.obj.removeFromParent();
      ev.geo.dispose();
      ev.mat.dispose();
      if (ev.kind === "loop") sunLoopCount = Math.max(0, sunLoopCount - 1);
      if (ev.kind === "jet") sunJetCount = Math.max(0, sunJetCount - 1);
      if (ev.kind === "coronaWisp") sunCoronaWispCount = Math.max(0, sunCoronaWispCount - 1);
      continue;
    }
    const fadeIn = clamp(t / 0.12, 0, 1);
    const fadeOut = clamp((1 - t) / 0.22, 0, 1);
    const flick = 0.88 + 0.12 * Math.sin((simMs / 1000) * 0.85 + (ev.meta?.phase ?? 0));
    const baseOp = ev.kind === "jet" ? 0.92 : ev.kind === "coronaWisp" ? 0.42 : 0.55;
    const fxLum = 0.4 + app.sunLuminosity * 0.55;
    ev.mat.opacity = fadeIn * fadeOut * flick * baseOp * fxLum;
    keep.push(ev);
  }
  sunEvents = keep;
}

function updateSunEvents(targetR) {
  if (!points) return;

  // Very rough “learned statistics”:
  // - visible loops: a few per day, live hours
  // - jets/flares: several per day, live minutes
  const dayMs = 24 * 60 * 60 * 1000;
  const u = app.sunLuminosity;
  const glowDrive = 0.03 + u * u * 0.97;
  const loopRatePerMs = (2.2 / dayMs) * glowDrive;
  const jetRatePerMs = (5.5 / dayMs) * glowDrive;
  const coronaWispRatePerMs = (6.0 / dayMs) * glowDrive;

  const simMs = sunFxEvalSimMs;
  const nextLoop = { v: nextLoopAtSimMs };
  const nextJet = { v: nextJetAtSimMs };
  const nextWisp = { v: nextCoronaWispAtSimMs };

  // Hard caps scale with luminosity so high = busier corona (illumination-like), low = calm disk.
  const maxLoops = Math.min(11, Math.max(3, Math.round(3 + u * 8)));
  const maxJets = Math.min(14, Math.max(3, Math.round(4 + u * 10)));
  const maxCoronaWisps = Math.min(16, Math.max(3, Math.round(4 + u * 12)));

  drainSunPoisson(targetR, simMs, nextLoop, loopRatePerMs, () => sunLoopCount, maxLoops, () => spawnSunLoop(targetR));
  drainSunPoisson(targetR, simMs, nextJet, jetRatePerMs, () => sunJetCount, maxJets, () => spawnSunJet(targetR));
  drainSunPoisson(targetR, simMs, nextWisp, coronaWispRatePerMs, () => sunCoronaWispCount, maxCoronaWisps, () =>
    spawnCoronaWisp(targetR),
  );

  nextLoopAtSimMs = nextLoop.v;
  nextJetAtSimMs = nextJet.v;
  nextCoronaWispAtSimMs = nextWisp.v;
}

function fitCameraToPoints() {
  if (!camera || !points) return;
  const geo = points.geometry;
  if (!geo.boundingSphere) geo.computeBoundingSphere();
  const r = geo.boundingSphere?.radius ?? 0.45;
  const vFov = (camera.fov * Math.PI) / 180;
  const dist = (r / Math.tan(vFov / 2)) * 1.12 + 0.08;
  camera.near = Math.max(0.001, dist - r * 3.2);
  camera.far = dist + r * 6;
  camera.position.set(0, r * 0.12, dist);
  camera.lookAt(0, 0, 0);
  camera.updateProjectionMatrix();
}

export function initBodyPreview() {
  canvas = /** @type {HTMLCanvasElement | null} */ (document.getElementById("body-preview-canvas"));
  if (!canvas) return;

  renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false, powerPreference: "low-power" });
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(clamp(window.devicePixelRatio || 1, 1, 2));

  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(32, 1, 0.01, 50);

  const amb = new THREE.AmbientLight(0xffffff, 0.85);
  scene.add(amb);

  root = new THREE.Group();
  scene.add(root);

  // Start selection: tracked, else sun.
  setBodyPreviewTarget(app.trackedBodyId || "sun");
  syncBodyPreviewCaption();
  resizeBodyPreview();
}

export function resizeBodyPreview() {
  if (!renderer || !camera || !canvas) return;
  const w = canvas.clientWidth || 1;
  const h = canvas.clientHeight || 1;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  fitCameraToPoints();
}

export function setBodyPreviewTarget(id) {
  if (!root || !scene) return;
  const next = String(id || "").trim() || "sun";
  if (next === currentId) return;
  currentId = next;
  spinAngle = 0;

  // Clean old
  if (points) {
    clearSunFx();
    root.remove(points);
    points.geometry.dispose();
    points.material.dispose();
    points = null;
  } else {
    clearSunFx();
  }

  const s = getSpin(next);
  const polarScale = s.polarKm / Math.max(1e-6, s.eqKm);

  const rocky =
    next === "earth" ||
    next === "mars" ||
    next === "mercury" ||
    next === "pluto" ||
    next === "ceres" ||
    MOONS.some((m) => m.id === next);
  const gas = next === "jupiter" || next === "saturn" || next === "uranus" || next === "neptune";
  const want = next === "sun" ? 9000 : gas ? 9000 : rocky ? 7800 : 5200;
  const targetR = next === "sun" ? 0.52 : 0.42;
  const { pos, col } = buildSurfacePoints(next, polarScale, targetR, want);

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
  geo.computeBoundingSphere();

  const mat = new THREE.PointsMaterial({
    vertexColors: true,
    color: 0xffffff,
    size: next === "sun" ? 0.0038 : gas ? 0.0034 : rocky ? 0.0035 : 0.0036,
    sizeAttenuation: true,
    transparent: true,
    opacity: next === "earth" ? 0.9 : gas ? 0.88 : 0.78,
    depthWrite: true,
    blending: THREE.NormalBlending,
  });

  points = new THREE.Points(geo, mat);

  // Tilt: rotate around Z (gives a readable “axis” in screen space).
  const tiltRad = (s.tiltDeg * Math.PI) / 180;
  points.rotation.z = tiltRad;

  root.add(points);
  root.rotation.set(0, 0, 0);
  fitCameraToPoints();

  if (next === "sun") {
    sunFxEvalSimMs = app.simTimeMs;
    // Seed with a couple loops so it doesn't feel empty.
    for (let i = 0; i < 2; i++) spawnSunLoop(targetR);
    for (let i = 0; i < 3; i++) spawnCoronaWisp(targetR);
    syncSunPreviewLuminosity();
  }

  syncBodyPreviewCaption();
}

/** Sun point-cloud + flare opacity track the left-panel luminosity slider. */
export function syncSunPreviewLuminosity() {
  if (!points || currentId !== "sun") return;
  const mat = points.material;
  if (!mat || !mat.isPointsMaterial) return;
  const L = app.sunLuminosity;
  // Surface stays similar scale; “glow” comes from flare density (rates), not giant points.
  mat.opacity = 0.5 + L * 0.28;
  mat.size = 0.0038 * (0.86 + L * 0.22);
}

export function tickBodyPreview(deltaSimMs) {
  if (!renderer || !scene || !camera || !points) return;

  syncBodyPreviewCaption();

  const desired = app.trackedBodyId || "sun";
  if (desired !== currentId) setBodyPreviewTarget(desired);

  const s = getSpin(currentId || "sun");
  const periodMs = Math.max(1, s.rotPeriodHours * 3600_000);
  spinAngle += (deltaSimMs * (Math.PI * 2)) / periodMs;
  points.rotation.y = spinAngle;
  root.rotation.x = Math.sin(spinAngle * 0.08) * 0.06;

  if (currentId === "sun" && points) {
    const simEnd = app.simTimeMs;
    const simStart = simEnd - deltaSimMs;
    // shiftSimTime / resetSimTime change sim between rAFs; Poisson deadlines would stay in the wrong era.
    if (sunFxLastSimAtPreviewEnd !== undefined) {
      const implied = simEnd - sunFxLastSimAtPreviewEnd;
      const tol = Math.max(150, Math.abs(deltaSimMs) * 2 + 100);
      if (Math.abs(implied - deltaSimMs) > tol) clearSunFx();
    }
    // Huge positive sim steps per rAF skip entire flare lifetimes and leave only fade-in=0 newborns.
    if (deltaSimMs > 0 && simEnd - simStart > 1e-3) {
      absorbForwardSunFx(0.52, simStart, simEnd);
    } else {
      sunFxEvalSimMs = simEnd;
      updateSunEvents(0.52);
    }
    sunFxEvalSimMs = simEnd;
    refreshSunFxVisualAtSim(simEnd);
  }

  sunFxLastSimAtPreviewEnd = app.simTimeMs;

  renderer.render(scene, camera);
}

