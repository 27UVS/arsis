/** Random CRT-style glitches: white sparks + horizontal slice shifts on the whole UI. */

/** After load / last glitch: chance rises slowly → faster → ~guaranteed by this horizon (ms). */
const GLITCH_WINDOW_MS = 30000;
/** Poll interval for Bernoulli trial (ms). */
const GLITCH_POLL_MS = 125;

/** Cumulative P(glitch by time t) for t ∈ [0, GLITCH_WINDOW_MS]: very flat 0–10s, then steeper. */
const F_KNOTS_MS = [
  [0, 0],
  [10_000, 0.012],
  [15_000, 0.065],
  [20_000, 0.26],
  [30_000, 1],
];

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * @param {number} elapsedMs
 * @returns {number} in [0, 1]
 */
function glitchCumulativeF(elapsedMs) {
  const x = Math.min(Math.max(0, elapsedMs), GLITCH_WINDOW_MS);
  for (let i = 0; i < F_KNOTS_MS.length - 1; i += 1) {
    const [t0, f0] = F_KNOTS_MS[i];
    const [t1, f1] = F_KNOTS_MS[i + 1];
    if (x <= t1) {
      if (t1 === t0) return f1;
      const u = (x - t0) / (t1 - t0);
      return f0 + u * (f1 - f0);
    }
  }
  return 1;
}

/**
 * P(trigger this poll | not triggered yet), from discrete hazard of F.
 * @param {number} elapsedMs time since last burst ended
 * @param {number} pollMs
 */
function glitchProbThisPoll(elapsedMs, pollMs) {
  if (elapsedMs >= GLITCH_WINDOW_MS) return 1;
  const f0 = glitchCumulativeF(elapsedMs);
  const f1 = glitchCumulativeF(elapsedMs + pollMs);
  const surv = 1 - f0;
  if (surv <= 1e-12) return 1;
  return Math.min(1, (f1 - f0) / surv);
}

function clearStageFx(stage) {
  stage.style.removeProperty("clip-path");
  stage.style.removeProperty("transform");
  stage.style.removeProperty("transition");
}

function spawnSpark(layer) {
  const el = document.createElement("div");
  el.className = "glitch-spark";
  const vertical = Math.random() < 0.28;
  if (vertical) {
    el.classList.add("glitch-spark--v");
    el.style.top = `${Math.random() * 88}%`;
    el.style.left = `${Math.random() * 96}%`;
    el.style.width = `${1 + Math.random() * 2}px`;
    el.style.height = `${6 + Math.random() * 44}%`;
  } else {
    el.style.left = `${Math.random() * 90}%`;
    el.style.top = `${Math.random() * 96}%`;
    el.style.width = `${3 + Math.random() * 48}%`;
    el.style.height = `${1 + Math.random() * 3}px`;
  }
  layer.appendChild(el);
  const ttl = 180 + Math.random() * 220;
  setTimeout(() => el.remove(), ttl);
}

/**
 * @param {HTMLElement} stage
 * @param {number} bandHpct 4–40
 * @param {number} bandTopPct
 * @param {number} dxPx
 * @param {number} holdMs
 */
function tearHold(stage, bandHpct, bandTopPct, dxPx, holdMs) {
  return new Promise((resolve) => {
    const bot = Math.max(0, 100 - bandTopPct - bandHpct);
    stage.style.transition = "none";
    stage.style.clipPath = `inset(${bandTopPct}% 0 ${bot}% 0)`;
    stage.style.transform = `translate3d(${dxPx}px,0,0)`;
    setTimeout(() => {
      clearStageFx(stage);
      resolve();
    }, holdMs);
  });
}

function nudgeWhole(stage, dxPx, holdMs) {
  return new Promise((resolve) => {
    stage.style.transition = "none";
    stage.style.transform = `translate3d(${dxPx}px,0,0)`;
    setTimeout(() => {
      clearStageFx(stage);
      resolve();
    }, holdMs);
  });
}

async function runBurst(stage, layer) {
  const sparks = 1 + Math.floor(Math.random() * 8);
  for (let i = 0; i < sparks; i += 1) {
    setTimeout(() => spawnSpark(layer), Math.random() * 280);
  }

  await sleep(90 + Math.random() * 160);

  const tearCount = Math.floor(Math.random() * 4);
  for (let i = 0; i < tearCount; i += 1) {
    const h = 4 + Math.random() * 36;
    const top = Math.random() * Math.max(0.01, 100 - h);
    const dx = (Math.random() < 0.5 ? -1 : 1) * (3 + Math.random() ** 1.15 * 44);
    const hold = 55 + Math.random() * 130;
    await tearHold(stage, h, top, dx, hold);
    await sleep(28 + Math.random() * 95);
  }

  if (Math.random() < 0.5) {
    const dx = (Math.random() < 0.5 ? -1 : 1) * (2 + Math.random() * 16);
    await nudgeWhole(stage, dx, 48 + Math.random() * 95);
  }

  if (Math.random() < 0.35) {
    const h = 15 + Math.random() * 25;
    const top = Math.random() * (100 - h);
    const dx = (Math.random() < 0.5 ? -1 : 1) * (10 + Math.random() * 36);
    await tearHold(stage, h, top, dx, 85 + Math.random() * 140);
  }

  clearStageFx(stage);
}

export function initGlitchFx() {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const stage = document.getElementById("app-glitch-stage");
  const layer = document.getElementById("glitch-fx-layer");
  if (!stage || !layer) return;

  let sinceGlitchMs = performance.now();

  const loop = async () => {
    for (;;) {
      await sleep(GLITCH_POLL_MS);
      const elapsed = performance.now() - sinceGlitchMs;
      const p = glitchProbThisPoll(elapsed, GLITCH_POLL_MS);
      if (Math.random() < p) {
        await runBurst(stage, layer);
        sinceGlitchMs = performance.now();
      }
    }
  };

  loop();
}
