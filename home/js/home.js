import { loadAppConfig } from "../../js/app-config.js";
import { initGlitchFx } from "../../js/glitch-fx.js";
import { requireAuth as requireAuthOrRedirect } from "../../js/auth.js";

const cube = document.getElementById("cube");
const cubeTitle = document.getElementById("cube-title");

/** @type {Record<string, HTMLElement>} */
const faces = {};
document.querySelectorAll(".face[data-face]").forEach((el) => {
  if (!(el instanceof HTMLElement)) return;
  const k = el.getAttribute("data-face");
  if (!k) return;
  faces[k] = el;
});

const FACE_KEYS = /** @type {const} */ (["front", "right", "back", "left", "top", "bottom"]);
const SHADES = /** @type {const} */ (["--arsis-0", "--arsis-1", "--arsis-2", "--arsis-3", "--arsis-4", "--arsis-5"]);

const STATES = [
  // Angles chosen to always show at least 3 faces (front + side + top/bottom)
  { rx: -34, ry: 38, rz: 6, perm: [0, 1, 2, 3, 4, 5] },
  { rx: -22, ry: 128, rz: 12, perm: [2, 4, 1, 5, 0, 3] },
  { rx: -48, ry: 212, rz: -10, perm: [3, 0, 5, 1, 2, 4] },
  { rx: -18, ry: 302, rz: 16, perm: [1, 5, 0, 4, 3, 2] },
  { rx: -58, ry: 352, rz: -18, perm: [4, 2, 3, 0, 5, 1] },
  { rx: -30, ry: 68, rz: 22, perm: [5, 3, 4, 2, 1, 0] },
];

let idx = 0;
let baseRx = STATES[0].rx;
let baseRy = STATES[0].ry;
let baseRz = STATES[0].rz;

let dragRx = 0;
let dragRy = 0;
let dragRz = 0;

let isPointerDown = false;
let didDrag = false;
let activePointerId = null;
let lastX = 0;
let lastY = 0;
let suppressClickUntil = 0;
let dragDist = 0;

let shuffleToken = 0;

function deg2rad(d) {
  return (d * Math.PI) / 180;
}

function clamp(min, x, max) {
  return Math.max(min, Math.min(max, x));
}

function mul3(a, b) {
  return [
    a[0] * b[0] + a[1] * b[3] + a[2] * b[6],
    a[0] * b[1] + a[1] * b[4] + a[2] * b[7],
    a[0] * b[2] + a[1] * b[5] + a[2] * b[8],
    a[3] * b[0] + a[4] * b[3] + a[5] * b[6],
    a[3] * b[1] + a[4] * b[4] + a[5] * b[7],
    a[3] * b[2] + a[4] * b[5] + a[5] * b[8],
    a[6] * b[0] + a[7] * b[3] + a[8] * b[6],
    a[6] * b[1] + a[7] * b[4] + a[8] * b[7],
    a[6] * b[2] + a[7] * b[5] + a[8] * b[8],
  ];
}

/**
 * @param {number[]} m
 * @param {[number, number, number]} v
 * @returns {[number, number, number]}
 */
function mulV3(m, v) {
  const [x, y, z] = v;
  return [
    m[0] * x + m[1] * y + m[2] * z,
    m[3] * x + m[4] * y + m[5] * z,
    m[6] * x + m[7] * y + m[8] * z,
  ];
}

function rotX(rad) {
  const c = Math.cos(rad);
  const s = Math.sin(rad);
  return [1, 0, 0, 0, c, -s, 0, s, c];
}

function rotY(rad) {
  const c = Math.cos(rad);
  const s = Math.sin(rad);
  return [c, 0, s, 0, 1, 0, -s, 0, c];
}

function rotZ(rad) {
  const c = Math.cos(rad);
  const s = Math.sin(rad);
  return [c, -s, 0, s, c, 0, 0, 0, 1];
}

function ensureStickers() {
  Object.entries(faces).forEach(([faceKey, face]) => {
    if (face.querySelector(".sticker")) return;
    for (let i = 0; i < 9; i += 1) {
      const s = document.createElement("div");
      s.className = "sticker";
      s.setAttribute("data-sticker", String(i));
      s.setAttribute("data-face", faceKey);
      face.appendChild(s);
    }
  });
}

function hash01(seed) {
  // xorshift32-ish, returns [0,1)
  let x = seed | 0;
  x ^= x << 13;
  x ^= x >>> 17;
  x ^= x << 5;
  // unsigned → [0,1)
  return ((x >>> 0) % 1_000_000) / 1_000_000;
}

function setStickersForState(stateIdx) {
  // Deterministic “scramble” per state; uses all 6 shades across the cube.
  const nodes = document.querySelectorAll(".sticker[data-sticker][data-face]");
  nodes.forEach((el) => {
    if (!(el instanceof HTMLElement)) return;
    const faceKey = el.getAttribute("data-face") || "front";
    const sIdx = Number(el.getAttribute("data-sticker") || "0") | 0;
    const fIdx = FACE_KEYS.indexOf(/** @type {any} */ (faceKey));
    const seed = (stateIdx + 1) * 100_003 + (fIdx + 7) * 9_973 + (sIdx + 1) * 1_037;
    const r = hash01(seed);
    const shadeIndex = Math.floor(r * 6) % 6;
    const v = SHADES[shadeIndex] ?? SHADES[1];
    el.style.setProperty("--sticker", `var(${v})`);
  });
}

function setFacesForState(stateIdx) {
  const st = STATES[stateIdx];
  if (!st) return;
  for (let fi = 0; fi < FACE_KEYS.length; fi += 1) {
    const faceKey = FACE_KEYS[fi];
    const faceEl = faces[faceKey];
    if (!faceEl) continue;
    const shadeVar = SHADES[st.perm[fi]] ?? SHADES[1];
    faceEl.style.setProperty("--face", `var(${shadeVar})`);
  }
}

function setActiveFace(activeKey) {
  Object.entries(faces).forEach(([k, el]) => {
    el.classList.toggle("is-active", k === activeKey);
  });
}

function computeActiveFace(rxDeg, ryDeg, rzDeg) {
  const rx = deg2rad(rxDeg);
  const ry = deg2rad(ryDeg);
  const rz = deg2rad(rzDeg);
  const R = mul3(mul3(rotX(rx), rotY(ry)), rotZ(rz));

  const camera = /** @type {[number, number, number]} */ ([0, 0, 1]);
  const normals = {
    front: /** @type {[number, number, number]} */ ([0, 0, 1]),
    back: /** @type {[number, number, number]} */ ([0, 0, -1]),
    right: /** @type {[number, number, number]} */ ([1, 0, 0]),
    left: /** @type {[number, number, number]} */ ([-1, 0, 0]),
    top: /** @type {[number, number, number]} */ ([0, 1, 0]),
    bottom: /** @type {[number, number, number]} */ ([0, -1, 0]),
  };

  let bestKey = "front";
  let bestDot = -Infinity;
  Object.entries(normals).forEach(([k, n]) => {
    const w = mulV3(R, /** @type {[number, number, number]} */ (n));
    const d = w[0] * camera[0] + w[1] * camera[1] + w[2] * camera[2];
    if (d > bestDot) {
      bestDot = d;
      bestKey = k;
    }
  });
  return bestKey;
}

function applyCubeTransform() {
  if (!cube) return;
  const rx = baseRx + dragRx;
  const ry = baseRy + dragRy;
  const rz = baseRz + dragRz;
  cube.style.setProperty("--rx", `${rx}deg`);
  cube.style.setProperty("--ry", `${ry}deg`);
  cube.style.setProperty("--rz", `${rz}deg`);
  setActiveFace(computeActiveFace(rx, ry, rz));
}

function updateTitle() {
  if (!(cubeTitle instanceof HTMLElement)) return;
  cubeTitle.textContent = idx === 0 ? "СОЛНЕЧНАЯ СИСТЕМА" : "НЕ ДОСТУПНО";
}

function animateShuffleForState(stateIdx) {
  const token = ++shuffleToken;
  const nodes = Array.from(document.querySelectorAll(".sticker[data-sticker][data-face]")).filter(
    (n) => n instanceof HTMLElement,
  );
  if (nodes.length === 0) return;

  // Fast but readable.
  const duration = 260;
  const midDelay = Math.floor(duration * 0.45);
  const easing = "cubic-bezier(0.2, 0.85, 0.2, 1)";

  nodes.forEach((node) => {
    const el = /** @type {HTMLElement} */ (node);
    const faceKey = el.getAttribute("data-face") || "front";
    const sIdx = Number(el.getAttribute("data-sticker") || "0") | 0;
    const fIdx = FACE_KEYS.indexOf(/** @type {any} */ (faceKey));
    const seed = (stateIdx + 1) * 100_003 + (fIdx + 11) * 9_973 + (sIdx + 5) * 1_037;
    const r = hash01(seed);

    const dir = r > 0.5 ? 1 : -1;
    const axis = r < 0.33 ? "Y" : r < 0.66 ? "X" : "Z";
    const zLift = 18 + Math.floor(r * 18); // 18..35px
    const rot = 58 + Math.floor(r * 40); // 58..98deg

    // Small stagger that still finishes quickly.
    const gx = sIdx % 3;
    const gy = Math.floor(sIdx / 3);
    const delay = (gx + gy) * 10 + Math.max(0, fIdx) * 8;

    el.animate(
      [
        { transform: "translateZ(0px) rotateX(0deg) rotateY(0deg) rotateZ(0deg)", opacity: 1 },
        {
          transform: `translateZ(${zLift}px) rotate${axis}(${dir * rot}deg)`,
          opacity: 0.92,
          offset: 0.48,
        },
        { transform: "translateZ(0px) rotateX(0deg) rotateY(0deg) rotateZ(0deg)", opacity: 1 },
      ],
      { duration, delay, easing, fill: "both" },
    );
  });

  // Swap colors mid-animation so the "move" reads as a shuffle.
  window.setTimeout(() => {
    if (token !== shuffleToken) return;
    setStickersForState(stateIdx);
    setFacesForState(stateIdx);
    updateTitle();
  }, midDelay);
}

function applyState(i) {
  if (!cube) return;
  idx = ((i % STATES.length) + STATES.length) % STATES.length;
  const st = STATES[idx];

  baseRx = st.rx;
  baseRy = st.ry;
  baseRz = st.rz;
  dragRx = 0;
  dragRy = 0;
  dragRz = 0;
  applyCubeTransform();

  animateShuffleForState(idx);
}

function applyStateNoRotate(i) {
  idx = ((i % STATES.length) + STATES.length) % STATES.length;
  animateShuffleForState(idx);
}

function gotoByState() {
  if (idx === 0) {
    window.location.href = "../solar system/index.html";
    return;
  }
  if (cube) {
    cube.animate(
      [
        { boxShadow: "0 0 22px rgba(190, 255, 245, 0.18)" },
        { boxShadow: "0 0 34px rgba(255, 255, 255, 0.28)" },
        { boxShadow: "0 0 22px rgba(190, 255, 245, 0.18)" },
      ],
      { duration: 280, easing: "linear" },
    );
  }
}

function isClickOnCube(target) {
  return !!(target instanceof Node && cube && (target === cube || cube.contains(target)));
}

function onPageClick(e) {
  if (performance.now() < suppressClickUntil) return;
  const t = /** @type {unknown} */ (e.target);
  if (isClickOnCube(t)) {
    gotoByState();
    return;
  }
  const x = e.clientX;
  const mid = window.innerWidth / 2;
  applyStateNoRotate(x < mid ? idx - 1 : idx + 1);
}

function onKeyDown(e) {
  if (e.key === "ArrowLeft") applyState(idx - 1);
  if (e.key === "ArrowRight") applyState(idx + 1);
  if (e.key === "Enter" || e.key === " ") {
    if (document.activeElement === cube) {
      e.preventDefault();
      gotoByState();
    }
  }
}

function onPointerDown(e) {
  const t = /** @type {unknown} */ (e.target);
  if (!isClickOnCube(t) || !(e instanceof PointerEvent)) return;
  if (!cube) return;
  // Prevent native drag/selection gestures that can "lock" cursor on Windows/Chromium.
  e.preventDefault();
  isPointerDown = true;
  didDrag = false;
  dragDist = 0;
  activePointerId = e.pointerId;
  lastX = e.clientX;
  lastY = e.clientY;
  cube.classList.add("is-dragging");
  cube.setPointerCapture?.(e.pointerId);
}

function onPointerMove(e) {
  if (!(e instanceof PointerEvent)) return;
  if (!isPointerDown || activePointerId !== e.pointerId) return;
  const dx = e.clientX - lastX;
  const dy = e.clientY - lastY;
  lastX = e.clientX;
  lastY = e.clientY;

  dragDist += Math.hypot(dx, dy);
  if (dragDist > 6) didDrag = true;

  dragRy += dx * 0.28;
  dragRx -= dy * 0.22;
  dragRx = clamp(-85, dragRx, 85);
  applyCubeTransform();
}

function onPointerUp(e) {
  if (!(e instanceof PointerEvent)) return;
  if (!isPointerDown || activePointerId !== e.pointerId) return;
  isPointerDown = false;
  activePointerId = null;
  cube?.classList.remove("is-dragging");
  if (didDrag) suppressClickUntil = performance.now() + 420;
  // keep didDrag as-is; suppressed clicks won't fire navigation
}

await requireAuthOrRedirect("../index.html");
ensureStickers();
applyState(0);

window.addEventListener("click", onPageClick);
window.addEventListener("keydown", onKeyDown);
window.addEventListener("pointerdown", onPointerDown);
window.addEventListener("pointermove", onPointerMove);
window.addEventListener("pointerup", onPointerUp);
window.addEventListener("pointercancel", onPointerUp);

cube?.addEventListener("click", (e) => {
  if (performance.now() < suppressClickUntil) return;
  e.stopPropagation();
  gotoByState();
});

loadAppConfig().then((cfg) => {
  if (cfg.glitchFx) initGlitchFx();
});

