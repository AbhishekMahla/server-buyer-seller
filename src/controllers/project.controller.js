const { AppError, catchAsync } = require("../utils/errorHandler");

// Get All Projects
const getAllProjects = catchAsync(async (req, res, next) => {
  const { status, minBudget, maxBudget } = req.query;
  const filters = {};

  // Apply filters if provided
  if (status) {
    filters.status = status;
  }

  if (minBudget) {
    filters.budgetMax = { gte: parseFloat(minBudget) };
  }

  if (maxBudget) {
    filters.budgetMin = { lte: parseFloat(maxBudget) };
  }

  // For buyers, only show their own projects
  if (req.user.role === "BUYER") {
    filters.buyerId = req.user.id;
  }

  const projects = await req.prisma.project.findMany({
    where: filters,
    include: {
      buyer: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      bids: {
        select: {
          id: true,
          bidAmount: true,
          estimatedCompletion: true,
          seller: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
      selectedBid: true,
      deliverables: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  res.status(200).json({
    status: "success",
    results: projects.length,
    data: {
      projects,
    },
  });
});

// Get a single project by ID

const getProject = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  const project = await req.prisma.project.findUnique({
    where: { id },
    include: {
      buyer: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      bids: {
        include: {
          seller: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      },
      selectedBid: {
        include: {
          seller: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      },
      deliverables: true,
      review: true,
    },
  });

  if (!project) {
    return next(new AppError("Project not found", 404));
  }

  // Check if user has access to this project
  if (req.user.role === "BUYER" && project.buyerId !== req.user.id) {
    return next(
      new AppError("You do not have permission to access this project", 403)
    );
  }

  res.status(200).json({
    status: "success",
    data: {
      project,
    },
  });
});

// Create Project
const createProject = catchAsync(async (req, res, next) => {
  const { title, description, budgetMin, budgetMax, deadline } = req.body;

  // Check if user is a buyer
  if (req.user.role !== "BUYER") {
    return next(new AppError("Only buyers can create projects", 403));
  }

  // Validate required fields
  if (!title || !description || !budgetMin || !budgetMax || !deadline) {
    return next(
      new AppError(
        "Please provide title, description, budgetMin, budgetMax, and deadline",
        400
      )
    );
  }

  // Validate budget range
  if (parseFloat(budgetMin) >= parseFloat(budgetMax)) {
    return next(
      new AppError("Minimum budget must be less than maximum budget", 400)
    );
  }

  // Validate deadline
  const deadlineDate = new Date(deadline);
  if (deadlineDate <= new Date()) {
    return next(new AppError("Deadline must be in the future", 400));
  }

  // Create project
  const project = await req.prisma.project.create({
    data: {
      title,
      description,
      budgetMin: parseFloat(budgetMin),
      budgetMax: parseFloat(budgetMax),
      deadline: deadlineDate,
      buyer: {
        connect: { id: req.user.id },
      },
    },
  });

  res.status(201).json({
    status: "success",
    data: {
      project,
    },
  });
});

//  Update a project

const updateProject = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { title, description, budgetMin, budgetMax, deadline } = req.body;

  // Check if project exists and user is the owner
  const project = await req.prisma.project.findUnique({
    where: { id },
  });

  if (!project) {
    return next(new AppError("Project not found", 404));
  }

  if (project.buyerId !== req.user.id) {
    return next(
      new AppError("You do not have permission to update this project", 403)
    );
  }

  // Prevent updates if project is not in PENDING status
  if (project.status !== "PENDING") {
    return next(
      new AppError(
        "Cannot update a project that is already in progress or completed",
        400
      )
    );
  }

  // Validate budget range if provided
  if (
    budgetMin &&
    budgetMax &&
    parseFloat(budgetMin) >= parseFloat(budgetMax)
  ) {
    return next(
      new AppError("Minimum budget must be less than maximum budget", 400)
    );
  }

  // Validate deadline if provided
  let deadlineDate;
  if (deadline) {
    deadlineDate = new Date(deadline);
    if (deadlineDate <= new Date()) {
      return next(new AppError("Deadline must be in the future", 400));
    }
  }

  // Update project
  const updatedProject = await req.prisma.project.update({
    where: { id },
    data: {
      title,
      description,
      budgetMin: budgetMin ? parseFloat(budgetMin) : undefined,
      budgetMax: budgetMax ? parseFloat(budgetMax) : undefined,
      deadline: deadlineDate,
    },
  });

  res.status(200).json({
    status: "success",
    data: {
      project: updatedProject,
    },
  });
});

// Delete a project

const deleteProject = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  // Check if project exists and user is the owner
  const project = await req.prisma.project.findUnique({
    where: { id },
  });

  if (!project) {
    return next(new AppError("Project not found", 404));
  }

  if (project.buyerId !== req.user.id) {
    return next(
      new AppError("You do not have permission to delete this project", 403)
    );
  }

  // Prevent deletion if project is not in PENDING status
  if (project.status !== "PENDING") {
    return next(
      new AppError(
        "Cannot delete a project that is already in progress or completed",
        400
      )
    );
  }

  // Delete project
  await req.prisma.project.delete({
    where: { id },
  });

  res.status(204).json({
    status: "success",
    data: null,
  });
});

module.exports = {
  getAllProjects,
  getProject,
  createProject,
  updateProject,
  deleteProject,
};
