const defaults = {
  glitchFx: true,
  authEnabled: true,
  auth: {
    username: "arsis",
    password: "arsis",
  },
};

/**
 * Loads project root `config.json`. Missing file or parse errors → defaults.
 * @returns {Promise<{ glitchFx: boolean, authEnabled: boolean, auth: { username: string, password: string, store?: string } }>}
 */
export async function loadAppConfig() {
  try {
    const res = await fetch(new URL("../config.json", import.meta.url));
    if (!res.ok) return { glitchFx: defaults.glitchFx, authEnabled: defaults.authEnabled, auth: { ...defaults.auth } };
    const j = /** @type {Record<string, unknown>} */ (await res.json());
    const authIn = j.auth && typeof j.auth === "object" && j.auth !== null ? /** @type {Record<string, unknown>} */ (j.auth) : {};
    const store = typeof authIn.store === "string" ? authIn.store : undefined;

    /** @type {{ username?: unknown, password?: unknown }} */
    let authFromStore = {};
    if (store) {
      try {
        // Resolve store relative to project root (same level as `config.json`)
        const base = new URL("../", import.meta.url);
        const storeUrl = new URL(store.replace(/^\/+/, ""), base);
        const storeRes = await fetch(storeUrl);
        if (storeRes.ok) {
          const sj = /** @type {Record<string, unknown>} */ (await storeRes.json());
          authFromStore = { username: sj.username, password: sj.password };
        }
      } catch {
        // ignore store errors; fall back to config/defaults
      }
    }

    const username =
      typeof authIn.username === "string"
        ? authIn.username
        : typeof authFromStore.username === "string"
          ? authFromStore.username
          : defaults.auth.username;
    const password =
      typeof authFromStore.password === "string"
        ? authFromStore.password
        : typeof authIn.password === "string"
          ? authIn.password
          : defaults.auth.password;
    return {
      glitchFx: typeof j.glitchFx === "boolean" ? j.glitchFx : defaults.glitchFx,
      authEnabled: typeof j.authEnabled === "boolean" ? j.authEnabled : defaults.authEnabled,
      auth: store ? { username, password, store } : { username, password },
    };
  } catch {
    return { glitchFx: defaults.glitchFx, authEnabled: defaults.authEnabled, auth: { ...defaults.auth } };
  }
}
