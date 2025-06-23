const express = require("express");
const {
  getAllProjects,
  getProject,
  createProject,
  updateProject,
  deleteProject,
} = require("../controllers/project.controller");
const { protect, restrictTo } = require("../middleware/auth.middleware");

const router = express.Router();

// Protect all routes after this middleware
router.use(protect);

// Get All projects
router.get("/", getAllProjects);

// Create Project
router.post("/", restrictTo("BUYER"), createProject);

// Get Single Project
router.get("/:id", getProject);

// Update Project
router.patch("/:id", restrictTo("BUYER"), updateProject);

// Delete Project
router.delete("/:id", restrictTo("BUYER"), deleteProject);

module.exports = router;
