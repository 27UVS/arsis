/** @type {readonly number[]} */
export const TIME_RATE_STEPS = [
  1e-7,
  1e-6,
  1e-5,
  1e-4,
  0.001,
  0.01,
  0.1,
  0.5,
  1,
  5,
  60,
  3600,
  86400,
  604800,
  2_592_000,
  7_776_000,
  15_552_000,
  31_557_600,
  63_115_200,
];

export const DEFAULT_TIME_RATE_INDEX = TIME_RATE_STEPS.findIndex((x) => Math.abs(x - 1) < 1e-12);

export const J2000_MS = Date.UTC(2000, 0, 1, 11, 58, 55, 816);
export const MS_PER_DAY = 86400000;
export const LANG_KEY = "arsis-lang";
export const ORBIT_KEY = "arsis-orbit-mode";
export const ASPECT_KEY = "arsis-viewport-aspect";
export const VIEW3D_KEY = "arsis-chart-view3d";
export const NAMES_PLANETS_KEY = "arsis-show-planet-names";
export const NAMES_MOONS_KEY = "arsis-show-moon-names";

export const BODY_FILL = [
  "hsl(168, 52%, 82%)",
  "hsl(186, 28%, 58%)",
  "hsl(184, 22%, 52%)",
  "hsl(182, 26%, 48%)",
  "hsl(180, 24%, 44%)",
  "hsl(179, 22%, 43%)",
  "hsl(178, 20%, 42%)",
  "hsl(176, 18%, 40%)",
  "hsl(188, 16%, 38%)",
  "hsl(190, 14%, 36%)",
  "hsl(186, 12%, 34%)",
];

export const ORBIT_STROKE = "rgba(150, 228, 218, 0.2)";
export const ORBIT_STROKE_REALISTIC = "rgba(168, 240, 228, 0.55)";
export const RING_STROKE = "rgba(170, 240, 230, 0.38)";
export const LABEL_FILL = "rgba(210, 255, 248, 0.88)";

export const LABEL_SCREEN_PX_PLANET = 13;
export const LABEL_SCREEN_PX_MOON = 11;
export const LABEL_SCREEN_PX_BELT = 10.5;

/** 2D chart labels when UI is English (screen-px target × this in realistic scale). */
export const LABEL_SCREEN_EN_SCALE = 1.09;

export const MAX_AU = 40.5;
export const MAX_CHART_AU = 48;
export const R_REAL_MAX = 520 * 200;

export const VIEWBOX_MIN_W = 40;
export const VIEWBOX_MAX_W = 1.2e6;

/** @type {Record<string, number>} */
export const KM_R = {
  sun: 696000,
  mercury: 2440,
  venus: 6051,
  earth: 6378,
  mars: 3396,
  jupiter: 71492,
  saturn: 60268,
  uranus: 25559,
  neptune: 24764,
  pluto: 1188,
  ceres: 473,
  moon: 1737,
  io: 1821,
  europa: 1560,
  ganymede: 2634,
  callisto: 2410,
  phobos: 11,
  deimos: 6,
  enceladus: 252,
  rhea: 763,
  titan: 2575,
  titania: 788,
  oberon: 761,
  triton: 1353,
  charon: 606,
};

export const JUP_REF_PX = 12;
