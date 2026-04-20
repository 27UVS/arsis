const AUTH_SESSION_KEY = "arsis_auth";

import { loadAppConfig } from "./app-config.js";

/** @type {Promise<boolean> | null} */
let authEnabledPromise = null;

async function isAuthEnabled() {
  if (!authEnabledPromise) {
    authEnabledPromise = loadAppConfig().then((c) => c.authEnabled);
  }
  return authEnabledPromise;
}

export function isAuthed() {
  return sessionStorage.getItem(AUTH_SESSION_KEY) === "1";
}

export function setAuthed() {
  sessionStorage.setItem(AUTH_SESSION_KEY, "1");
}

export function clearAuth() {
  sessionStorage.removeItem(AUTH_SESSION_KEY);
}

/**
 * Redirects to login if not authed.
 * @param {string} loginHref
 */
export async function requireAuth(loginHref) {
  if (!(await isAuthEnabled())) return;
  if (isAuthed()) return;
  window.location.href = loginHref;
}

