const express = require("express");
const {
  createReview,
  getSellerReviews,
} = require("../controllers/review.controller");
const { protect, restrictTo } = require("../middleware/auth.middleware");

// mergeParams: true allows access to params from parent router
const router = express.Router({ mergeParams: true });

// Protect all routes after this middleware
router.use(protect);

// Give rating
router.post("/:projectId", restrictTo("BUYER"), createReview);

// Get All Seller Review
router.get("/sellers/:sellerId", getSellerReviews);

module.exports = router;
