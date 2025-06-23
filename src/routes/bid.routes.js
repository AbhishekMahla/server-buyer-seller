const express = require("express");
const {
  getBidsForProject,
  createBid,
  selectBid,
} = require("../controllers/bid.controller");
const { protect, restrictTo } = require("../middleware/auth.middleware");

// mergeParams: true allows access to params from parent router
const router = express.Router({ mergeParams: true });

// Protect all routes after this middleware
router.use(protect);

// Get All Bid For the project
router.get("/:projectId", getBidsForProject);

// Create Bid
router.post("/:projectId", restrictTo("SELLER"), createBid);

// Select Bid
router.put("/:projectId/:bidId/select", restrictTo("BUYER"), selectBid);

module.exports = router;
