import { app } from "./state.js";
import { t } from "./translate.js";

export function updateScaleUi() {
  const scaleBtn = document.getElementById("scale-toggle");
  if (scaleBtn) {
    scaleBtn.setAttribute("aria-pressed", app.orbitMode === "realistic" ? "true" : "false");
    const locked = app.view3d;
    scaleBtn.disabled = locked;
    if (locked) {
      scaleBtn.setAttribute("title", t("scale_locked_in_3d"));
    } else {
      scaleBtn.removeAttribute("title");
    }
  }
  const hint = document.getElementById("scale-hint");
  if (hint) {
    hint.textContent = t(app.orbitMode === "realistic" ? "scale_hint_real" : "scale_hint_simple");
  }
}
