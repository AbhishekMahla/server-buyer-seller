const express = require("express");
const { register, login, getMe } = require("../controllers/auth.controller");
const { protect } = require("../middleware/auth.middleware");

const router = express.Router();

// Register User
router.post("/register", register);

// Login User
router.post("/login", login);

// get profile
router.get("/me", protect, getMe);

module.exports = router;
