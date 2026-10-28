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
  ["/admin/collections", "blackhole"], // black hole illustration (NASA)
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
