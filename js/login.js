import { loadAppConfig } from "./app-config.js";
import { initGlitchFx } from "./glitch-fx.js";

const AUTH_SESSION_KEY = "arsis_auth";

/** @type {{ glitchFx: boolean, auth: { username: string, password: string } } | null} */
let cachedConfig = null;

loadAppConfig().then((cfg) => {
  cachedConfig = cfg;
  if (cfg.glitchFx) initGlitchFx();
});

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
    sessionStorage.setItem(AUTH_SESSION_KEY, "1");
    window.location.href = "solar system/index.html";
    return;
  }

  if (errEl) {
    errEl.hidden = false;
    errEl.textContent = "Неверный логин или пароль";
  }
});
