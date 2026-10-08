const express = require("express");
const router = express.Router();
const { isAuthenticated, authorizeRoles } = require("../middlewares/auth");
const { receivePhoto, getPhoto, setPhoto, deletePhoto, uploadTempPhoto } = require("../controllers/photoController");

// Customer photos (see controllers/photoController.js).
router.use(isAuthenticated);
router.use(authorizeRoles("SUPER_ADMIN", "ADMIN", "EMPLOYEE"));

// Picture taken while a loan is still being created (loan has no id yet).
router.post("/temp/:loanModel", receivePhoto, uploadTempPhoto);

router.get("/:loanModel/:loanId", getPhoto);
router.post("/:loanModel/:loanId", receivePhoto, setPhoto);
router.delete("/:loanModel/:loanId", deletePhoto);

module.exports = router;
