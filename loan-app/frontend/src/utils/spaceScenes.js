// Which space photo sits behind which part of the app (Space theme).
// First match wins; a path matches when it equals the prefix or lives under it.
export const SPACE_SCENE_RULES = [
  ["/admin/dashboard", "dashboard"], // Webb: the Carina nebula cliffs
  ["/admin/weekly-loans", "saturn"],
  ["/admin/daily-loans", "jupiter"],
  ["/admin/interest-loan", "mars"],
  ["/admin/loans", "moon"],
  ["/admin/emi-details", "moon"],
  ["/admin/seized-vehicles", "moon"],
  ["/admin/expired", "moon"],
  ["/admin/foreclosure-payments", "moon"],
  ["/admin/pending-payments", "andromeda"],
  ["/admin/followup-payments", "andromeda"],
  ["/admin/partial-payments", "andromeda"],
  ["/admin/collections", "planets"], // the planets along their orbits, Saturn in the distance (NASA)
  ["/admin/approvals", "whirlpool"],
  ["/admin/notifications", "whirlpool"],
  ["/admin/location-updates", "whirlpool"],
];

// Everything else (analytics, collections, expenses, employees, to-do, my devices, documents...)
// gets the calm Earth's-edge photo.
export const DEFAULT_SPACE_SCENE = "horizon";

export const sceneFor = (pathname) => {
  const p = pathname || "";
  for (const [prefix, scene] of SPACE_SCENE_RULES) {
    if (p === prefix || p.indexOf(prefix + "/") === 0) return scene;
  }
  return DEFAULT_SPACE_SCENE;
};

// The login page is never themed.
export const isSpaceEligiblePath = (pathname) => {
  const p = pathname || "";
  return p.indexOf("/admin") === 0 && p !== "/admin/login";
};

// Themes the user can pick (stored per device in localStorage "sf_theme").
export const THEME_IDS = ["default", "space", "desert", "rainforest", "beach", "supercars"];
// The picture themes besides Space. Desert, Rainforest and Supercars are dark (they switch on the app's dark
// styling like Space does); Island beach is the one light theme.
export const NATURE_THEMES = ["desert", "rainforest", "beach", "supercars"];
export const DARK_NATURE_THEMES = ["desert", "rainforest", "supercars"];
export const normalizeTheme = (t) => (THEME_IDS.indexOf(t) > 0 ? t : "default");

// Each nature theme has three pictures, a / b / c, used on different parts of the app:
//   a = dashboard + the follow-up, approval and notification pages
//   b = the four loan lists and the other loan-detail pages
//   c = everything else (analytics, collections, expenses, employees, to-do ...)
export const NATURE_SCENE_RULES = [
  ["/admin/dashboard", "a"],
  ["/admin/pending-payments", "a"],
  ["/admin/followup-payments", "a"],
  ["/admin/partial-payments", "a"],
  ["/admin/approvals", "a"],
  ["/admin/notifications", "a"],
  ["/admin/location-updates", "a"],
  ["/admin/weekly-loans", "b"],
  ["/admin/daily-loans", "b"],
  ["/admin/interest-loan", "b"],
  ["/admin/loans", "b"],
  ["/admin/emi-details", "b"],
  ["/admin/seized-vehicles", "b"],
  ["/admin/expired", "b"],
  ["/admin/foreclosure-payments", "b"],
];
export const DEFAULT_NATURE_SCENE = "c";

export const natureSceneFor = (pathname) => {
  const p = pathname || "";
  for (const [prefix, scene] of NATURE_SCENE_RULES) {
    if (p === prefix || p.indexOf(prefix + "/") === 0) return scene;
  }
  return DEFAULT_NATURE_SCENE;
};
