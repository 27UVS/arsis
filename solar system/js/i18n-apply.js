import { app, persistLang } from "./state.js";
import { t } from "./translate.js";
import { updateScaleUi } from "./scale-ui.js";
import { updateTimeRateReadout } from "./time-panel.js";
import { syncNameToggleButtons } from "./labels.js";
import { updateChartLabelFontSizes } from "./camera-view.js";
import { syncView3dToggleButton } from "./view3d.js";

export function applyStaticI18n() {
  document.documentElement.lang = app.lang;
  document.getElementById("registry")?.removeAttribute("data-registry-built");
  const titleEl = document.querySelector("title");
  if (titleEl) titleEl.textContent = t("doc_title");

  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    if (key) el.textContent = t(key);
  });

  document.querySelectorAll("[data-i18n-title]").forEach((el) => {
    const key = el.getAttribute("data-i18n-title");
    if (key) el.setAttribute("title", t(key));
  });

  document.getElementById("time-slower")?.setAttribute("title", t("time_slower_tip"));
  document.getElementById("time-faster")?.setAttribute("title", t("time_faster_tip"));

  const shell = document.querySelector(".shell");
  if (shell) {
    const ak = shell.getAttribute("data-i18n-aria");
    if (ak) shell.setAttribute("aria-label", t(ak));
  }

  const sysSvg = document.getElementById("system");
  if (sysSvg) {
    const ak = sysSvg.getAttribute("data-i18n-aria");
    if (ak) sysSvg.setAttribute("aria-label", t(ak));
  }

  const scaleBtn = document.getElementById("scale-toggle");
  if (scaleBtn) {
    scaleBtn.setAttribute("aria-label", t("aria_scale_toggle"));
  }

  const btn = document.getElementById("lang-toggle");
  if (btn) {
    btn.setAttribute("aria-label", t("lang_aria"));
    btn.textContent = app.lang === "ru" ? t("lang_go_en") : t("lang_go_ru");
  }

  const exitBtn = document.getElementById("session-exit");
  if (exitBtn) {
    exitBtn.setAttribute("aria-label", t("session_exit_aria"));
    exitBtn.textContent = t("session_exit");
  }

  document.getElementById("toggle-planet-names")?.setAttribute("aria-label", t("aria_toggle_planet_names"));
  document.getElementById("toggle-moon-names")?.setAttribute("aria-label", t("aria_toggle_moon_names"));

  updateScaleUi();
  updateTimeRateReadout();
  syncNameToggleButtons();
  updateChartLabelFontSizes();
  syncView3dToggleButton();
}

export function setAppLang(next) {
  app.lang = next;
  persistLang();
  applyStaticI18n();
}
