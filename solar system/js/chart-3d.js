/**
 * Interactive WebGL chart (Three.js): same flat dynamics as 2D, no texture maps — flat HSL fills only.
 */
import * as THREE from "three";
import { TrackballControls } from "three/addons/controls/TrackballControls.js";
import { CSS2DRenderer, CSS2DObject } from "three/addons/renderers/CSS2DRenderer.js";
import { app } from "./state.js";
import { NAMES_MOONS_KEY, NAMES_PLANETS_KEY, MAX_CHART_AU } from "./constants.js";
import {
  OBJECTS,
  MOON_ALL,
  meanLongitudeRad,
  mulberry32,
  getRpx,
  BELT_INNER_ID,
  BELT_KUIPER_ID,
  beltMeanLongitudeDeg,
  planetOrbitPolylinePx,
  planetOrbitPolyline3d,
  objectWorldPosition3d,
} from "./model.js";
import { planetDrawRadius, sunDrawRadius, moonDiskPx, moonOrbitDistancePx } from "./appearance.js";
import { maxOrbitRadius, pxFromAuChart } from "./orbits.js";
import { bodyLabel } from "./format.js";
import { setTrackedBodyId, isRegistryBodyId } from "./track-follow.js";

/** @type {THREE.WebGLRenderer | null} */
let renderer = null;
/** @type {THREE.Scene | null} */
let scene = null;
/** @type {THREE.PerspectiveCamera | null} */
let camera = null;
/** @type {TrackballControls | null} */
let controls = null;
/** @type {CSS2DRenderer | null} */
let labelRenderer = null;
/** @type {number} */
let rafId = 0;
/** @type {HTMLElement | null} */
let stackEl = null;

/** @type {Map<string, THREE.Mesh>} */
const planetMeshes = new Map();
/** @type {THREE.Mesh | null} */
let sunMesh = null;
/** @type {THREE.PointLight | null} */
let sunPointLight = null;
/** @type {THREE.InstancedMesh | null} */
let moonInstanced = null;
/** @type {THREE.Matrix4} */
const _moonMat = new THREE.Matrix4();
/** @type {THREE.Vector3} */
const _scale = new THREE.Vector3();
const _composePos = new THREE.Vector3();
const _composeQuat = new THREE.Quaternion();
/** @type {Map<string, CSS2DObject>} */
const planetLabels = new Map();
/** @type {Map<string, CSS2DObject>} */
const moonLabels = new Map();
/** @type {THREE.Points | null} */
let beltInnerPoints3d = null;
/** @type {THREE.Points | null} */
let beltKuiperPoints3d = null;

const _pickRay = new THREE.Raycaster();
const _pickNdc = new THREE.Vector2();
/** @type {((e: PointerEvent) => void) | null} */
let _webglPickHandler = null;

function planetNamesOn() {
  return localStorage.getItem(NAMES_PLANETS_KEY) !== "0";
}

function moonNamesOn() {
  return localStorage.getItem(NAMES_MOONS_KEY) !== "0";
}

function makeBodyMaterial(cssColor, opts = {}) {
  const c = new THREE.Color(cssColor);
  const emissiveIntensity = opts.emissiveIntensity ?? 0.14;
  return new THREE.MeshStandardMaterial({
    color: c,
    emissive: c,
    emissiveIntensity,
    metalness: 0.06,
    roughness: 0.52,
  });
}

export function syncChart3dSunLuminosity() {
  const sun = OBJECTS.find((o) => o.marker === "sun");
  if (!sun) return;
  const L = app.sunLuminosity;
  const c = new THREE.Color(sun.color);

  if (sunMesh) {
    const mat = sunMesh.material;
    if (mat && mat.isMeshStandardMaterial) {
      mat.color.copy(c);
      mat.emissive.copy(c);
      // Keep disk hue; “brightness” is mostly the point light on other bodies + mild emissive.
      mat.emissiveIntensity = 0.05 + L * 0.22;
    }
  }

  if (sunPointLight) {
    sunPointLight.color.copy(c);
    sunPointLight.intensity = L * L * 24;
  }
}

/** Chart Y → Three.js Y so prograde motion reads counter-clockwise from the «north» side of the ecliptic. */
function chart3dY(yChart) {
  return -yChart;
}

function pushBeltRing(positions, count, rng, auMin, auMax) {
  for (let i = 0; i < count; i += 1) {
    const au = auMin + rng() * (auMax - auMin);
    const ang = rng() * Math.PI * 2;
    const r = pxFromAuChart(au);
    const inc = ((rng() * 14 + 1.5) * Math.PI) / 180;
    const node = rng() * Math.PI * 2;
    const cosi = Math.cos(inc);
    const sinNode = Math.sin(node);
    const cosNode = Math.cos(node);
    const sinA = Math.sin(ang);
    const cosA = Math.cos(ang);
    const xe = r * (cosNode * cosA - sinNode * sinA * cosi);
    const yeEc = r * (sinNode * cosA + cosNode * sinA * cosi);
    const ze = r * sinA * Math.sin(inc);
    const yChart = -yeEc;
    positions.push(xe, chart3dY(yChart), ze);
  }
}

/** Ring opacity roughly matches how conspicuous each system is from Earth. */
function addGasGiantRings(planetMesh, planetId, pr) {
  const mk = (inner, outer, opacity, color, rotXDeg = 0, rotZDeg = 0) => {
    const g = new THREE.RingGeometry(pr * inner, pr * outer, 96);
    const mat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const rm = new THREE.Mesh(g, mat);
    rm.rotation.x = THREE.MathUtils.degToRad(rotXDeg);
    rm.rotation.z = THREE.MathUtils.degToRad(rotZDeg);
    planetMesh.add(rm);
  };
  switch (planetId) {
    case "jupiter":
      mk(1.72, 1.93, 0.09, 0x8f8772, 0, 0);
      break;
    case "saturn":
      mk(1.22, 1.5, 0.52, 0xc8ded5, 0, -18);
      mk(1.5, 1.78, 0.22, 0x7da099, 0, -18);
      break;
    case "uranus":
      mk(1.056, 1.118, 0.19, 0x283238, 79, 10);
      break;
    case "neptune":
      mk(1.018, 1.052, 0.048, 0x557786, 0, 0);
      break;
    default:
      break;
  }
}

function buildInnerBeltPositions() {
  const innerRng = mulberry32(0x4b1d);
  const innerMain = app.orbitMode === "realistic" ? 1100 : 260;
  const innerFine = app.orbitMode === "realistic" ? 520 : 0;
  const positions = [];
  pushBeltRing(positions, innerMain, innerRng, 2.05, 3.37);
  pushBeltRing(positions, innerFine, innerRng, 2.02, 3.38);
  return new Float32Array(positions);
}

function buildKuiperBeltPositions() {
  const kuiperRng = mulberry32(0xbeef);
  const kuiperMain = app.orbitMode === "realistic" ? 820 : 175;
  const kuiperFine = app.orbitMode === "realistic" ? 480 : 0;
  const positions = [];
  pushBeltRing(positions, kuiperMain, kuiperRng, 37.85, MAX_CHART_AU);
  pushBeltRing(positions, kuiperFine, kuiperRng, 37.7, MAX_CHART_AU);
  return new Float32Array(positions);
}

function disposeObject(o) {
  if (!o) return;
  o.traverse((ch) => {
    const m = /** @type {THREE.Mesh} */ (ch);
    if (m.geometry) m.geometry.dispose();
    if (m.material) {
      if (Array.isArray(m.material)) m.material.forEach((x) => x.dispose());
      else m.material.dispose();
    }
  });
}

export function isChart3dMounted() {
  return renderer != null;
}

export function mountChart3d() {
  if (renderer) return;
  if (!app.view3d || app.orbitMode !== "realistic") return;
  const canvas = document.getElementById("chart-webgl");
  const frame = document.getElementById("viewport-frame");
  stackEl = document.getElementById("viewport-stack");
  if (!canvas || !frame) return;

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x030a0c);

  const amb = new THREE.AmbientLight(0xa8e8dc, 0.22);
  scene.add(amb);
  const dir = new THREE.DirectionalLight(0xe8fff9, 0.55);
  dir.position.set(0.55, 0.35, 1);
  scene.add(dir);
  const fill = new THREE.DirectionalLight(0x7ab8b0, 0.18);
  fill.position.set(-0.9, -0.2, -0.4);
  scene.add(fill);

  camera = new THREE.PerspectiveCamera(48, 1, 0.5, 2e6);
  camera.up.set(0, 1, 0);

  renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  controls = new TrackballControls(camera, canvas);
  controls.rotateSpeed = 0.65;
  controls.zoomSpeed = 0.85;
  controls.panSpeed = 0.28;
  controls.dynamicDampingFactor = 0.09;
  controls.minDistance = 40;
  controls.maxDistance = maxOrbitRadius() * 18;

  labelRenderer = new CSS2DRenderer();
  labelRenderer.domElement.style.position = "absolute";
  labelRenderer.domElement.style.inset = "0";
  labelRenderer.domElement.style.pointerEvents = "none";
  if (stackEl) stackEl.appendChild(labelRenderer.domElement);

  const sphereTpl = new THREE.SphereGeometry(1, 28, 20);
  const orbitLineMat = new THREE.LineBasicMaterial({
    color: 0x8ed4c8,
    transparent: true,
    opacity: 0.22,
  });

  for (const o of OBJECTS) {
    if (o.marker === "sun") {
      const sr = sunDrawRadius();
      const mat = makeBodyMaterial(o.color, { emissiveIntensity: 0.38 });
      sunMesh = new THREE.Mesh(sphereTpl.clone(), mat);
      sunMesh.scale.setScalar(sr);
      sunMesh.userData.id = o.id;
      scene.add(sunMesh);
      sunPointLight = new THREE.PointLight(0xb8fff0, 0, 0, 2);
      sunPointLight.decay = 2;
      sunPointLight.position.set(0, 0, 0);
      scene.add(sunPointLight);
      syncChart3dSunLuminosity();
      continue;
    }
    const rPx = getRpx(o);
    const pr = planetDrawRadius(o.id, rPx);
    const mat = makeBodyMaterial(o.color);
    const mesh = new THREE.Mesh(sphereTpl.clone(), mat);
    mesh.scale.setScalar(pr);
    mesh.userData.id = o.id;
    scene.add(mesh);
    planetMeshes.set(o.id, mesh);

    const lineGeom = new THREE.BufferGeometry();
    const rOrbit = getRpx(o);
    const arr =
      app.orbitMode === "realistic"
        ? (() => {
            const flat3 = planetOrbitPolyline3d(o, rOrbit, 256);
            const a = new Float32Array(flat3.length);
            for (let i = 0; i < flat3.length; i += 3) {
              a[i] = flat3[i];
              a[i + 1] = chart3dY(flat3[i + 1]);
              a[i + 2] = flat3[i + 2];
            }
            return a;
          })()
        : (() => {
            const flat = planetOrbitPolylinePx(o, rOrbit, 256);
            const a = new Float32Array((flat.length / 2) * 3);
            for (let i = 0; i < flat.length; i += 2) {
              const j = (i / 2) * 3;
              a[j] = flat[i];
              a[j + 1] = chart3dY(flat[i + 1]);
              a[j + 2] = 0;
            }
            return a;
          })();
    lineGeom.setAttribute("position", new THREE.BufferAttribute(arr, 3));
    const orbitLoop = new THREE.LineLoop(lineGeom, orbitLineMat.clone());
    scene.add(orbitLoop);

    if (o.id === "jupiter" || o.id === "saturn" || o.id === "uranus" || o.id === "neptune") {
      addGasGiantRings(mesh, o.id, pr);
    }

    const div = document.createElement("div");
    div.className = "chart3d-label chart3d-label--planet";
    div.textContent = bodyLabel(o.id);
    const lbl = new CSS2DObject(div);
    lbl.position.set(0, pr + 10, 0);
    mesh.add(lbl);
    planetLabels.set(o.id, lbl);
  }

  sphereTpl.dispose();
  orbitLineMat.dispose();

  const moonGeom = new THREE.SphereGeometry(1, 14, 12);
  const moonMat = makeBodyMaterial("hsl(168, 52%, 82%)", { emissiveIntensity: 0.1 });
  moonInstanced = new THREE.InstancedMesh(moonGeom, moonMat, MOON_ALL.length);
  moonInstanced.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  moonInstanced.frustumCulled = false;
  scene.add(moonInstanced);

  for (const moon of MOON_ALL) {
    if (!moon.major || moon.id.includes("-dot-")) continue;
    const div = document.createElement("div");
    div.className = "chart3d-label chart3d-label--moon";
    div.textContent = bodyLabel(moon.id);
    const lbl = new CSS2DObject(div);
    lbl.visible = false;
    scene.add(lbl);
    moonLabels.set(moon.id, lbl);
  }

  const beltMatInner = new THREE.PointsMaterial({
    color: 0xa8e4dc,
    size: app.orbitMode === "realistic" ? 2.2 : 1.6,
    transparent: true,
    opacity: 0.42,
    depthWrite: false,
    sizeAttenuation: true,
  });
  const beltMatKuiper = beltMatInner.clone();
  beltMatKuiper.opacity = 0.36;

  const innerGeom = new THREE.BufferGeometry();
  innerGeom.setAttribute("position", new THREE.BufferAttribute(buildInnerBeltPositions(), 3));
  beltInnerPoints3d = new THREE.Points(innerGeom, beltMatInner);

  const kuiperGeom = new THREE.BufferGeometry();
  kuiperGeom.setAttribute("position", new THREE.BufferAttribute(buildKuiperBeltPositions(), 3));
  beltKuiperPoints3d = new THREE.Points(kuiperGeom, beltMatKuiper);

  scene.add(beltInnerPoints3d, beltKuiperPoints3d);

  _webglPickHandler = (e) => {
    if (e.button !== 0 || !camera || !renderer) return;
    const cvs = renderer.domElement;
    if (e.target !== cvs) return;
    const rect = cvs.getBoundingClientRect();
    if (rect.width < 2 || rect.height < 2) return;
    _pickNdc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    _pickNdc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    _pickRay.setFromCamera(_pickNdc, camera);
    const pickList = /** @type {THREE.Object3D[]} */ ([]);
    if (sunMesh) pickList.push(sunMesh);
    for (const m of planetMeshes.values()) pickList.push(m);
    if (moonInstanced) pickList.push(moonInstanced);
    const hits = _pickRay.intersectObjects(pickList, true);
    for (const h of hits) {
      if (h.object === moonInstanced && h.instanceId != null) {
        const mid = MOON_ALL[/** @type {number} */ (h.instanceId)]?.id;
        if (isRegistryBodyId(mid)) {
          setTrackedBodyId(mid);
          e.stopPropagation();
          return;
        }
        continue;
      }
      let obj = /** @type {THREE.Object3D | null} */ (h.object);
      while (obj && !obj.userData?.id) obj = obj.parent;
      const bid = obj?.userData?.id;
      if (isRegistryBodyId(bid)) {
        setTrackedBodyId(bid);
        e.stopPropagation();
        return;
      }
    }
  };
  canvas.addEventListener("pointerdown", _webglPickHandler, true);

  frameCameraToScene();
  resizeChart3d();
  refreshChart3dLabels();
  startRenderLoop();
}

function frameCameraToScene() {
  if (!camera || !controls) return;
  const ext = maxOrbitRadius() * 1.1;
  // Скошенный вид сверху-сбоку (плоскость орбит почти «лежит» в кадре), Солнце смещено от центра кадра.
  camera.position.set(-ext * 0.36, ext * 0.98, ext * 0.46);
  controls.target.set(0, 0, 0);
  controls.update();
}

/**
 * Shortest camera–target distance that clears the mesh and respects control limits.
 * @param {string} id
 * @param {ReturnType<typeof meanLongitudeRad>} state
 * @param {number} nowMs
 * @param {number} floorD {@link TrackballControls#minDistance}
 */
function closestComfortFocusDistance(id, state, nowMs, floorD) {
  const body = OBJECTS.find((x) => x.id === id);
  if (body?.marker === "sun") {
    const r = sunDrawRadius();
    return Math.max(floorD, r * 1.22 + 12);
  }
  if (body && !body.marker) {
    const s = state.find((p) => p.id === id);
    if (!s) return floorD;
    const pr = planetDrawRadius(id, s.rPxActive);
    return Math.max(floorD, pr * 1.38 + 14);
  }
  const moon = MOON_ALL.find((m) => m.id === id);
  if (moon) {
    const par = state.find((p) => p.id === moon.parent);
    if (!par) return floorD;
    const isDot = moon.id.includes("-dot-") || !moon.major;
    const mr = moonDiskPx(moon.id, isDot);
    return Math.max(floorD, mr * 1.55 + 16);
  }
  return floorD;
}

export function focusChart3dObject(objectId) {
  if (!camera || !controls) return;
  const id = String(objectId ?? "").trim();
  if (!id) return;
  const state = meanLongitudeRad(app.simTimeMs);
  const p = objectWorldPosition3d(state, app.simTimeMs, id);
  controls.target.set(p.x, chart3dY(p.y), p.z);
  const off = new THREE.Vector3().subVectors(camera.position, controls.target);
  const dir =
    off.lengthSq() > 1e-12
      ? off.normalize()
      : new THREE.Vector3(0.55, 0.42, 0.72).normalize();
  const closeD = closestComfortFocusDistance(id, state, app.simTimeMs, controls.minDistance);
  const dist = Math.min(controls.maxDistance, closeD);
  camera.position.copy(controls.target.clone().add(dir.multiplyScalar(dist)));
  controls.update();
}

export function syncChart3dFromSim(state, nowMs) {
  if (!scene || !moonInstanced) return;

  const zIn = THREE.MathUtils.degToRad(beltMeanLongitudeDeg(BELT_INNER_ID, nowMs));
  const zK = THREE.MathUtils.degToRad(beltMeanLongitudeDeg(BELT_KUIPER_ID, nowMs));
  if (beltInnerPoints3d) beltInnerPoints3d.rotation.z = zIn;
  if (beltKuiperPoints3d) beltKuiperPoints3d.rotation.z = zK;

  if (sunMesh) sunMesh.scale.setScalar(sunDrawRadius());

  for (const s of state) {
    if (s.marker === "sun") {
      if (sunMesh) sunMesh.position.set(0, 0, 0);
      continue;
    }
    const mesh = planetMeshes.get(s.id);
    if (!mesh) continue;
    const p = objectWorldPosition3d(state, nowMs, s.id);
    mesh.position.set(p.x, chart3dY(p.y), p.z);
    const pr = planetDrawRadius(s.id, s.rPxActive);
    mesh.scale.setScalar(pr);
    const lbl = planetLabels.get(s.id);
    if (lbl) lbl.position.set(0, pr + 10, 0);
  }

  let i = 0;
  for (const moon of MOON_ALL) {
    const par = state.find((p) => p.id === moon.parent);
    if (!par) {
      _moonMat.compose(_composePos.set(0, -1e9, 0), _composeQuat, _scale.set(0.001, 0.001, 0.001));
      moonInstanced.setMatrixAt(i, _moonMat);
      i += 1;
      continue;
    }
    const mp = objectWorldPosition3d(state, nowMs, moon.id);
    const isDot = moon.id.includes("-dot-") || !moon.major;
    const r = moonDiskPx(moon.id, isDot);
    _moonMat.compose(_composePos.set(mp.x, chart3dY(mp.y), mp.z), _composeQuat, _scale.set(r, r, r));
    moonInstanced.setMatrixAt(i, _moonMat);

    const lbl = moonLabels.get(moon.id);
    if (lbl) {
      lbl.position.set(mp.x, chart3dY(mp.y + r + 6), mp.z);
    }
    i += 1;
  }
  moonInstanced.instanceMatrix.needsUpdate = true;

  const tid = app.trackedBodyId;
  if (tid && controls && camera && isRegistryBodyId(tid)) {
    const prevT = controls.target.clone();
    const p = objectWorldPosition3d(state, nowMs, tid);
    controls.target.set(p.x, chart3dY(p.y), p.z);
    camera.position.add(controls.target.clone().sub(prevT));
    controls.update();
  }
}

export function refreshChart3dLabels() {
  const sp = planetNamesOn();
  for (const [, lbl] of planetLabels) {
    lbl.visible = sp;
  }
  const sm = moonNamesOn();
  for (const [, lbl] of moonLabels) {
    lbl.visible = sm;
  }
}

export function resizeChart3d() {
  const frame = document.getElementById("viewport-frame");
  const canvas = document.getElementById("chart-webgl");
  if (!renderer || !camera || !labelRenderer || !frame || !canvas) return;
  const w = Math.max(2, frame.clientWidth);
  const h = Math.max(2, frame.clientHeight);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h, false);
  labelRenderer.setSize(w, h);
  controls?.handleResize();
}

function renderFrame() {
  if (!renderer || !scene || !camera || !controls || !labelRenderer) return;
  controls.update();
  renderer.render(scene, camera);
  labelRenderer.render(scene, camera);
}

export function startRenderLoop() {
  if (rafId) return;
  const loop = () => {
    if (!renderer) return;
    rafId = requestAnimationFrame(loop);
    renderFrame();
  };
  rafId = requestAnimationFrame(loop);
}

export function stopRenderLoop() {
  if (rafId) cancelAnimationFrame(rafId);
  rafId = 0;
}

export function unmountChart3d() {
  const cvs = document.getElementById("chart-webgl");
  if (cvs && _webglPickHandler) {
    cvs.removeEventListener("pointerdown", _webglPickHandler, true);
  }
  _webglPickHandler = null;

  stopRenderLoop();
  if (labelRenderer?.domElement?.parentElement) {
    labelRenderer.domElement.parentElement.removeChild(labelRenderer.domElement);
  }
  if (scene) {
    disposeObject(scene);
    scene.clear();
  }
  scene = null;
  planetMeshes.clear();
  planetLabels.clear();
  moonLabels.clear();
  sunMesh = null;
  sunPointLight = null;
  moonInstanced = null;
  beltInnerPoints3d = null;
  beltKuiperPoints3d = null;
  controls?.dispose();
  controls = null;
  renderer?.dispose();
  renderer = null;
  camera = null;
  labelRenderer = null;
  stackEl = null;
}
