const defaults = {
  glitchFx: true,
  auth: {
    username: "arsis",
    password: "arsis",
  },
};

/**
 * Loads project root `config.json`. Missing file or parse errors → defaults.
 * @returns {Promise<{ glitchFx: boolean, auth: { username: string, password: string } }>}
 */
export async function loadAppConfig() {
  try {
    const res = await fetch(new URL("../config.json", import.meta.url));
    if (!res.ok) return { glitchFx: defaults.glitchFx, auth: { ...defaults.auth } };
    const j = /** @type {Record<string, unknown>} */ (await res.json());
    const authIn = j.auth && typeof j.auth === "object" && j.auth !== null ? /** @type {Record<string, unknown>} */ (j.auth) : {};
    const username = typeof authIn.username === "string" ? authIn.username : defaults.auth.username;
    const password = typeof authIn.password === "string" ? authIn.password : defaults.auth.password;
    return {
      glitchFx: typeof j.glitchFx === "boolean" ? j.glitchFx : defaults.glitchFx,
      auth: { username, password },
    };
  } catch {
    return { glitchFx: defaults.glitchFx, auth: { ...defaults.auth } };
  }
}
