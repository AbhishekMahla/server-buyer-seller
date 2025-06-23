const { AppError, catchAsync } = require("../utils/errorHandler");
const { uploadToCloudinary } = require("../utils/fileUpload");
const emailService = require("../utils/emailService");

// Submit Deliverables
const submitDeliverable = catchAsync(async (req, res, next) => {
  const { projectId } = req.params;
  const { description } = req.body;
  const file = req.file;

  // Check if user is a seller
  if (req.user.role !== "SELLER") {
    return next(new AppError("Only sellers can submit deliverables", 403));
  }

  // Check if file is provided
  if (!file) {
    return next(new AppError("Please provide a file", 400));
  }

  // Check if project exists and is in IN_PROGRESS status
  const project = await req.prisma.project.findUnique({
    where: { id: projectId },
    include: {
      selectedBid: true,
      buyer: true,
    },
  });

  if (!project) {
    return next(new AppError("Project not found", 404));
  }

  if (project.status !== "IN_PROGRESS") {
    return next(
      new AppError(
        "Cannot submit deliverables for a project that is not in progress",
        400
      )
    );
  }

  // Check if user is the selected seller for this project
  if (!project.selectedBid || project.selectedBid.sellerId !== req.user.id) {
    return next(
      new AppError("You are not the selected seller for this project", 403)
    );
  }

  // Upload file to Cloudinary
  const result = await uploadToCloudinary(file.buffer);

  // Create deliverable
  const deliverable = await req.prisma.deliverable.create({
    data: {
      fileUrl: result.secure_url,
      description,
      project: {
        connect: { id: projectId },
      },
    },
  });

  res.status(201).json({
    status: "success",
    data: {
      deliverable,
    },
  });
});

// Get All Deliverables
const getDeliverables = catchAsync(async (req, res, next) => {
  const { projectId } = req.params;

  // Check if project exists
  const project = await req.prisma.project.findUnique({
    where: { id: projectId },
    include: {
      selectedBid: true,
    },
  });

  if (!project) {
    return next(new AppError("Project not found", 404));
  }

  // Check if user has access to this project
  if (
    (req.user.role === "BUYER" && project.buyerId !== req.user.id) ||
    (req.user.role === "SELLER" &&
      (!project.selectedBid || project.selectedBid.sellerId !== req.user.id))
  ) {
    return next(
      new AppError("You do not have permission to access this project", 403)
    );
  }

  // Get deliverables
  const deliverables = await req.prisma.deliverable.findMany({
    where: { projectId },
    orderBy: {
      createdAt: "desc",
    },
  });

  res.status(200).json({
    status: "success",
    results: deliverables.length,
    data: {
      deliverables,
    },
  });
});

// Complete the project
const completeProject = catchAsync(async (req, res, next) => {
  const { projectId } = req.params;

  // Check if user is a buyer
  if (req.user.role !== "BUYER") {
    return next(new AppError("Only buyers can mark projects as complete", 403));
  }

  // Check if project exists and user is the owner
  const project = await req.prisma.project.findUnique({
    where: { id: projectId },
    include: {
      buyer: true,
      selectedBid: {
        include: {
          seller: true,
        },
      },
    },
  });

  if (!project) {
    return next(new AppError("Project not found", 404));
  }

  if (project.buyerId !== req.user.id) {
    return next(
      new AppError("You do not have permission to complete this project", 403)
    );
  }

  // Check if project is in IN_PROGRESS status
  if (project.status !== "IN_PROGRESS") {
    return next(
      new AppError("Cannot complete a project that is not in progress", 400)
    );
  }

  // Check if there are any deliverables
  const deliverables = await req.prisma.deliverable.findMany({
    where: { projectId },
  });

  if (deliverables.length === 0) {
    return next(
      new AppError("Cannot complete a project with no deliverables", 400)
    );
  }

  // Update project status to COMPLETED
  const updatedProject = await req.prisma.project.update({
    where: { id: projectId },
    data: {
      status: "COMPLETED",
    },
  });

  // Send email notifications
  try {
    // Notify buyer
    await emailService.sendProjectCompletionNotification({
      email: project.buyer.email,
      name: project.buyer.name,
      projectTitle: project.title,
      role: "buyer",
    });

    // Notify seller
    if (project.selectedBid && project.selectedBid.seller) {
      await emailService.sendProjectCompletionNotification({
        email: project.selectedBid.seller.email,
        name: project.selectedBid.seller.name,
        projectTitle: project.title,
        role: "seller",
      });
    }
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
  submitDeliverable,
  getDeliverables,
  completeProject,
};
