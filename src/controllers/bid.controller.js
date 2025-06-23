const { AppError, catchAsync } = require("../utils/errorHandler");
const emailService = require("../utils/emailService");

//  Get all bids for a project

const getBidsForProject = catchAsync(async (req, res, next) => {
  const { projectId } = req.params;

  // Check if project exists
  const project = await req.prisma.project.findUnique({
    where: { id: projectId },
    include: {
      buyer: true,
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

  // Get bids
  const bids = await req.prisma.bid.findMany({
    where: { projectId },
    include: {
      seller: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: {
      bidAmount: "asc",
    },
  });

  res.status(200).json({
    status: "success",
    results: bids.length,
    data: {
      bids,
    },
  });
});

// Create a bid for a project

const createBid = catchAsync(async (req, res, next) => {
  const { projectId } = req.params;
  const { bidAmount, estimatedCompletion, message } = req.body;

  // Check if user is a seller
  if (req.user.role !== "SELLER") {
    return next(new AppError("Only sellers can create bids", 403));
  }

  // Validate required fields
  if (!bidAmount || !estimatedCompletion || !message) {
    return next(
      new AppError(
        "Please provide bidAmount, estimatedCompletion, and message",
        400
      )
    );
  }

  // Check if project exists and is in PENDING status
  const project = await req.prisma.project.findUnique({
    where: { id: projectId },
  });

  if (!project) {
    return next(new AppError("Project not found", 404));
  }

  if (project.status !== "PENDING") {
    return next(
      new AppError("Cannot bid on a project that is not in PENDING status", 400)
    );
  }

  // Check if seller has already bid on this project
  const existingBid = await req.prisma.bid.findFirst({
    where: {
      projectId,
      sellerId: req.user.id,
    },
  });

  if (existingBid) {
    return next(new AppError("You have already bid on this project", 400));
  }

  // Validate bid amount is within budget range
  if (
    parseFloat(bidAmount) < project.budgetMin ||
    parseFloat(bidAmount) > project.budgetMax
  ) {
    return next(
      new AppError(
        `Bid amount must be between ${project.budgetMin} and ${project.budgetMax}`,
        400
      )
    );
  }

  // Validate estimated completion date
  const completionDate = new Date(estimatedCompletion);
  if (completionDate <= new Date()) {
    return next(
      new AppError("Estimated completion date must be in the future", 400)
    );
  }

  if (completionDate > new Date(project.deadline)) {
    return next(
      new AppError(
        "Estimated completion date cannot be after the project deadline",
        400
      )
    );
  }

  // Create bid
  const bid = await req.prisma.bid.create({
    data: {
      bidAmount: parseFloat(bidAmount),
      estimatedCompletion: completionDate,
      message,
      project: {
        connect: { id: projectId },
      },
      seller: {
        connect: { id: req.user.id },
      },
    },
    include: {
      seller: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  res.status(201).json({
    status: "success",
    data: {
      bid,
    },
  });
});

//  Select a bid for a project

const selectBid = catchAsync(async (req, res, next) => {
  const { projectId, bidId } = req.params;

  // Check if user is a buyer
  if (req.user.role !== "BUYER") {
    return next(new AppError("Only buyers can select bids", 403));
  }

  // Check if project exists and user is the owner
  const project = await req.prisma.project.findUnique({
    where: { id: projectId },
  });

  if (!project) {
    return next(new AppError("Project not found", 404));
  }

  if (project.buyerId !== req.user.id) {
    return next(
      new AppError(
        "You do not have permission to select a bid for this project",
        403
      )
    );
  }

  // Check if project is in PENDING status
  if (project.status !== "PENDING") {
    return next(
      new AppError(
        "Cannot select a bid for a project that is not in PENDING status",
        400
      )
    );
  }

  // Check if bid exists and belongs to the project
  const bid = await req.prisma.bid.findFirst({
    where: {
      id: bidId,
      projectId,
    },
    include: {
      seller: true,
    },
  });

  if (!bid) {
    return next(new AppError("Bid not found for this project", 404));
  }

  // Update project with selected bid and change status to IN_PROGRESS
  const updatedProject = await req.prisma.project.update({
    where: { id: projectId },
    data: {
      selectedBidId: bidId,
      status: "IN_PROGRESS",
    },
    include: {
      selectedBid: {
        include: {
          seller: true,
        },
      },
    },
  });

  // Send email notification to seller
  try {
    await emailService.sendBidSelectionNotification({
      email: bid.seller.email,
      name: bid.seller.name,
      projectTitle: project.title,
    });
  } catch (error) {
    console.error("Failed to send email notification:", error);
    // Continue execution even if email fails
  }

  res.status(200).json({
    status: "success",
    data: {
      project: updatedProject,
    },
  });
});

module.exports = {
  getBidsForProject,
  createBid,
  selectBid,
};
