import { t } from "./translate.js";
import { getTimeRate } from "./sim-time.js";

export function formatTimeRate(r) {
  const back = r < 0;
  const a = Math.abs(r);
  const prefix = back ? "← " : "";
  if (Math.abs(a - 1) < 1e-12) return `${prefix}${t("time_rate_real")}`;
  if (a >= 1e6) return `${prefix}${(a / 1e6).toFixed(2)} M×`;
  if (a >= 1000) return `${prefix}${(a / 1000).toFixed(a >= 1e5 ? 0 : 1)} k×`;
  if (a >= 1) return `${prefix}${a < 20 && a % 1 !== 0 ? a.toFixed(1) : a.toFixed(0)}×`;
  if (a >= 0.01) return `${prefix}${a.toFixed(3)}×`;
  return `${prefix}${a.toExponential(1)}×`;
}

export function updateTimeRateReadout() {
  const el = document.getElementById("time-rate-readout");
  if (el) el.textContent = formatTimeRate(getTimeRate());
}
