import { loadAppConfig } from "./app-config.js";
import { initGlitchFx } from "./glitch-fx.js";
import { setAuthed } from "./auth.js";

/** @type {{ glitchFx: boolean, auth: { username: string, password: string } } | null} */
let cachedConfig = null;

loadAppConfig().then((cfg) => {
  cachedConfig = cfg;
  if (cfg.glitchFx) initGlitchFx();
  if (!cfg.authEnabled) {
    // Auth disabled: skip login screen entirely.
    window.location.href = "home/index.html";
  }
});

const bootEl = document.getElementById("boot-loader");
const bootFill = /** @type {HTMLElement | null} */ (document.getElementById("boot-fill"));
const bootPct = document.getElementById("boot-percent");
const loginStage = document.getElementById("login-stage");

function clamp01(x) {
  return Math.max(0, Math.min(1, x));
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function setBootProgress(p01) {
  const p = clamp01(p01);
  const pct = Math.max(0, Math.min(100, Math.round(p * 100)));
  if (bootFill) bootFill.style.width = `${pct}%`;
  if (bootPct) bootPct.textContent = String(pct);
}

function finishBoot() {
  if (bootEl) bootEl.hidden = true;
  if (loginStage) loginStage.hidden = false;
  /** @type {HTMLInputElement | null} */ (document.getElementById("login-user"))?.focus();
}

async function runBoot() {
  if (!bootEl || !loginStage) return;
  bootEl.hidden = false;
  loginStage.hidden = true;
  setBootProgress(0);

  const totalMs = 3000 + Math.floor(Math.random() * 7001); // 3–10s

  /** @type {"smooth" | "jumps" | "mixed"} */
  const mode = Math.random() < 0.42 ? "smooth" : Math.random() < 0.74 ? "jumps" : "mixed";

  if (mode === "smooth") {
    const start = performance.now();
    const wobble = 0.06 + Math.random() * 0.14;
    const phase = Math.random() * Math.PI * 2;
    const pow = 0.85 + Math.random() * 0.6;
    await new Promise((resolve) => {
      const tick = () => {
        const t = clamp01((performance.now() - start) / totalMs);
        const eased = easeInOutCubic(Math.pow(t, pow));
        const w = (Math.sin(phase + t * Math.PI * 2) * wobble + Math.sin(phase * 0.7 + t * Math.PI * 5) * (wobble * 0.45)) * (1 - t);
        setBootProgress(clamp01(eased + w));
        if (t >= 1) return resolve();
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    setBootProgress(1);
    finishBoot();
    return;
  }

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  if (mode === "jumps") {
    const start = performance.now();
    let p = 0;
    for (;;) {
      const elapsed = performance.now() - start;
      const t = clamp01(elapsed / totalMs);
      const maxAllowed = lerp(0.12, 1, easeInOutCubic(t));

      const step = 0.01 + Math.random() * 0.12;
      p = Math.min(maxAllowed, p + step);
      setBootProgress(p);

      if (t >= 1 || p >= 0.999) break;
      await sleep(120 + Math.floor(Math.random() * 640));
    }
    setBootProgress(1);
    finishBoot();
    return;
  }

  // mixed: jumps first, then smooth (never jumps after smooth begins)
  const jumpPart = 0.45 + Math.random() * 0.25;
  const jumpMs = Math.max(900, Math.floor(totalMs * jumpPart));
  const smoothMs = Math.max(900, totalMs - jumpMs);
  const pivot = 0.55 + Math.random() * 0.25;

  // phase 1: jumps up to pivot
  {
    const start = performance.now();
    let p = 0;
    for (;;) {
      const elapsed = performance.now() - start;
      const t = clamp01(elapsed / jumpMs);
      const maxAllowed = lerp(0.08, pivot, easeInOutCubic(t));
      const step = 0.02 + Math.random() * 0.14;
      p = Math.min(maxAllowed, p + step);
      setBootProgress(p);
      if (t >= 1 || p >= pivot - 0.001) {
        setBootProgress(pivot);
        break;
      }
      await sleep(90 + Math.floor(Math.random() * 520));
    }
  }

  // phase 2: smooth from pivot → 1
  {
    const start = performance.now();
    const wobble = 0.025 + Math.random() * 0.09;
    const phase = Math.random() * Math.PI * 2;
    const pow = 0.9 + Math.random() * 0.55;
    await new Promise((resolve) => {
      const tick = () => {
        const t = clamp01((performance.now() - start) / smoothMs);
        const eased = easeInOutCubic(Math.pow(t, pow));
        const base = lerp(pivot, 1, eased);
        const w = (Math.sin(phase + t * Math.PI * 2) * wobble) * (1 - t) * (1 - pivot);
        setBootProgress(clamp01(base + w));
        if (t >= 1) return resolve();
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
  }

  setBootProgress(1);
  finishBoot();
}

runBoot();

const form = document.getElementById("login-form");
const errEl = document.getElementById("login-error");

form?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const cfg = cachedConfig ?? (await loadAppConfig());
  cachedConfig = cfg;

  const userInput = /** @type {HTMLInputElement | null} */ (document.getElementById("login-user"));
  const passInput = /** @type {HTMLInputElement | null} */ (document.getElementById("login-pass"));
  const u = userInput?.value.trim() ?? "";
  const p = passInput?.value ?? "";

  const ok = u === cfg.auth.username && p === cfg.auth.password;
  if (ok) {
    setAuthed();
    window.location.href = "home/index.html";
    return;
  }

  if (errEl) {
    errEl.hidden = false;
    errEl.textContent = "Неверный логин или пароль";
  }
});
