const express = require("express");
const {
  submitDeliverable,
  getDeliverables,
  completeProject,
} = require("../controllers/deliverable.controller");
const { protect, restrictTo } = require("../middleware/auth.middleware");
const { upload } = require("../utils/fileUpload");

// mergeParams: true allows access to params from parent router
const router = express.Router({ mergeParams: true });

// Protect all routes after this middleware
router.use(protect);

// Get All Deliverables
router.get("/:projectId", getDeliverables);

// Upload Deliverables
router.post(
  "/:projectId",
  restrictTo("SELLER"),
  upload.single("file"),
  submitDeliverable
);

// Complete The Project
router.put("/:projectId/complete", restrictTo("BUYER"), completeProject);

module.exports = router;
