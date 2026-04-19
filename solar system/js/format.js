import { MS_PER_DAY } from "./constants.js";
import { t } from "./translate.js";
import { OBJECTS, MOON_ALL } from "./model.js";

export function fmtDelta(ms) {
  const days = ms / MS_PER_DAY;
  if (days >= 1e6) return `${(days / 1e6).toFixed(3)} ${t("unit_mday")}`;
  if (days >= 1e3) return `${(days / 1e3).toFixed(3)} ${t("unit_kday")}`;
  return `${days.toFixed(2)} ${t("unit_day")}`;
}

export function fmtRange(obj) {
  if (obj.marker === "sun") return t("au_sol");
  const au = obj.r;
  return `${au.toFixed(3)} ${t("au_mean")}`;
}

export function bodyLabel(id) {
  const o = OBJECTS.find((x) => x.id === id);
  if (o) return t(o.nameKey);
  const m = MOON_ALL.find((x) => x.id === id);
  if (m) return t(m.nameKey);
  return id;
}
