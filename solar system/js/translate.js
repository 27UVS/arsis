import { app } from "./state.js";
import { I18N } from "./locale.js";

export function t(key) {
  const table = I18N[app.lang] ?? I18N.ru;
  return table[key] ?? I18N.en[key] ?? key;
}
