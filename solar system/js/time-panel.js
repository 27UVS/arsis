import { t } from "./translate.js";
import { getTimeRate } from "./sim-time.js";

export function formatTimeRate(r) {
  if (Math.abs(r - 1) < 1e-12) return t("time_rate_real");
  if (r >= 1e6) return `${(r / 1e6).toFixed(2)} M×`;
  if (r >= 1000) return `${(r / 1000).toFixed(r >= 1e5 ? 0 : 1)} k×`;
  if (r >= 1) return `${r < 20 && r % 1 !== 0 ? r.toFixed(1) : r.toFixed(0)}×`;
  if (r >= 0.01) return `${r.toFixed(3)}×`;
  return `${r.toExponential(1)}×`;
}

export function updateTimeRateReadout() {
  const el = document.getElementById("time-rate-readout");
  if (el) el.textContent = formatTimeRate(getTimeRate());
}
