import { t } from "./translate.js";
import { fmtRange } from "./format.js";

export function footerLine(state) {
  const earth = state.find((s) => s.id === "earth");
  const el = document.getElementById("footer-coords");
  if (!el || !earth) return;
  const ra = ((earth.L / 15) % 24).toFixed(4);
  const dec = (Math.sin((earth.L * Math.PI) / 180) * 23.44).toFixed(4);
  el.textContent = t("footer_earth")
    .replace("{L}", earth.L.toFixed(3))
    .replace("{ra}", ra)
    .replace("{dec}", dec)
    .replace("{range}", fmtRange(earth));
}
