const express = require("express");
const router = express.Router();
const deviceController = require("../controllers/deviceController");
const { isAuthenticated } = require("../middlewares/auth");

// Every logged-in person manages only their own devices.
router.use(isAuthenticated);

router.get("/", deviceController.getMyDevices);
router.post("/ping", deviceController.pingDevice);
router.post("/logout-others", deviceController.logoutOtherDevices);
router.patch("/:id", deviceController.renameDevice);
router.delete("/:id", deviceController.logoutDevice);

module.exports = router;
