const { AppError, catchAsync } = require("../utils/errorHandler");

// Create Review
const createReview = catchAsync(async (req, res, next) => {
  const { projectId } = req.params;
  const { rating, reviewText } = req.body;

  // Check if user is a buyer
  if (req.user.role !== "BUYER") {
    return next(new AppError("Only buyers can create reviews", 403));
  }

  // Validate rating
  if (!rating || rating < 1 || rating > 5) {
    return next(new AppError("Rating must be between 1 and 5", 400));
  }

  // Check if project exists, is completed, and user is the owner
  const project = await req.prisma.project.findUnique({
    where: { id: projectId },
    include: {
      selectedBid: true,
      review: true,
    },
  });

  if (!project) {
    return next(new AppError("Project not found", 404));
  }

  if (project.buyerId !== req.user.id) {
    return next(
      new AppError("You do not have permission to review this project", 403)
    );
  }

  if (project.status !== "COMPLETED") {
    return next(
      new AppError("Cannot review a project that is not completed", 400)
    );
  }

  // Check if a review already exists for this project
  if (project.review) {
    return next(new AppError("A review already exists for this project", 400));
  }

  // Check if the project has a selected bid (and thus a seller)
  if (!project.selectedBid) {
    return next(
      new AppError(
        "This project does not have a selected seller to review",
        400
      )
    );
  }

  // Create review
  const review = await req.prisma.review.create({
    data: {
      rating,
      reviewText,
      buyer: {
        connect: { id: req.user.id },
      },
      seller: {
        connect: { id: project.selectedBid.sellerId },
      },
      project: {
        connect: { id: projectId },
      },
    },
  });

  res.status(201).json({
    status: "success",
    data: {
      review,
    },
  });
});

// Get All Review Of Seller
const getSellerReviews = catchAsync(async (req, res, next) => {
  const { sellerId } = req.params;

  // Check if seller exists
  const seller = await req.prisma.user.findUnique({
    where: {
      id: sellerId,
      role: "SELLER",
    },
  });

  if (!seller) {
    return next(new AppError("Seller not found", 404));
  }

  // Get reviews
  const reviews = await req.prisma.review.findMany({
    where: { sellerId },
    include: {
      buyer: {
        select: {
          id: true,
          name: true,
        },
      },
      project: {
        select: {
          id: true,
          title: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  // Calculate average rating
  const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
  const averageRating = reviews.length > 0 ? totalRating / reviews.length : 0;

  res.status(200).json({
    status: "success",
    results: reviews.length,
    data: {
      reviews,
      averageRating,
    },
  });
});

module.exports = {
  createReview,
  getSellerReviews,
};
