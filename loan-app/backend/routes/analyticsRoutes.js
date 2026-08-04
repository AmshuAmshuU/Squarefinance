const express = require("express");
const router = express.Router();
const analyticsController = require("../controllers/analyticsController");
const { isAuthenticated, authorizeRoles } = require("../middlewares/auth");
const ErrorHandler = require("../utils/ErrorHandler");

// Enforces the existing "Analytics" permission toggle from the Employees
// section (permissions.analytics.view). Mirrors Sidebar.jsx's exact
// existing convention for that toggle: it only ever restricts EMPLOYEE-role
// accounts - ADMIN (like SUPER_ADMIN) already has blanket access to every
// module regardless of the per-user permission toggles, same as every
// other sidebar-gated module in this app. Previously this permission was
// UI-only (just hid the sidebar link); this is what actually enforces it.
const requireAnalyticsViewPermission = (req, res, next) => {
  if (req.user.role === "EMPLOYEE" && !req.user.permissions?.analytics?.view) {
    return next(new ErrorHandler("You do not have permission to view Analytics", 403));
  }
  next();
};

/**
 * @route GET /api/analytics/stats
 * @desc Get analytics stats for the dashboard
 * @access Private/Admin
 */
router.get(
  "/stats",
  isAuthenticated,
  authorizeRoles("SUPER_ADMIN", "ADMIN", "EMPLOYEE"),
  requireAnalyticsViewPermission,
  analyticsController.getAnalyticsStats
);

router.get(
  "/export-data",
  isAuthenticated,
  authorizeRoles("SUPER_ADMIN", "ADMIN", "EMPLOYEE"),
  requireAnalyticsViewPermission,
  analyticsController.exportAllData
);

// Kept open to EMPLOYEE (with the same analytics.view permission check as
// the rest of Part 1) - this same endpoint also powers the "Disbursement
// vs Collection" chart in the first (all-roles) part of the page, just
// with different query params for the cumulative view. There's no
// server-side way to tell those two apart, so the "Total Growth Trend"
// restriction below is enforced only on the frontend for this one chart -
// the underlying numbers are already the same data an EMPLOYEE can see via
// the other chart anyway, just summed differently.
router.get(
  "/trend-stats",
  isAuthenticated,
  authorizeRoles("SUPER_ADMIN", "ADMIN", "EMPLOYEE"),
  requireAnalyticsViewPermission,
  analyticsController.getTrendStats
);

// 2026-08-05: Karthik wants everything from "Total Growth Trend" onward
// restricted to SUPER_ADMIN/ADMIN only, not EMPLOYEE - EMPLOYEE removed
// from these three.
router.get(
  "/profit",
  isAuthenticated,
  authorizeRoles("SUPER_ADMIN", "ADMIN"),
  analyticsController.getProfitStats
);

router.get(
  "/simple-stats",
  isAuthenticated,
  authorizeRoles("SUPER_ADMIN", "ADMIN"),
  analyticsController.getSimpleStats
);

router.get(
  "/roi",
  isAuthenticated,
  authorizeRoles("SUPER_ADMIN", "ADMIN"),
  analyticsController.getBusinessROI
);

// Widened from SUPER_ADMIN-only to match the same SUPER_ADMIN/ADMIN tier
// as the rest of this "Total Growth Trend onward" section, per Karthik's
// 2026-08-05 instruction covering the whole remainder of the page.
router.get(
  "/valuation",
  isAuthenticated,
  authorizeRoles("SUPER_ADMIN", "ADMIN"),
  analyticsController.getCompanyValuation
);

module.exports = router;
