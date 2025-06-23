const { verifyToken } = require('../utils/jwt');
const { AppError, catchAsync } = require('../utils/errorHandler');

/**
 * Middleware to protect routes that require authentication
 */
const protect = catchAsync(async (req, res, next) => {
  // 1) Get token from headers
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return next(new AppError('You are not logged in. Please log in to get access.', 401));
  }

  // 2) Verify token
  const decoded = verifyToken(token);

  // 3) Check if user still exists
  const user = await req.prisma.user.findUnique({
    where: { id: decoded.id },
  });

  if (!user) {
    return next(new AppError('The user belonging to this token no longer exists.', 401));
  }

  // 4) Grant access to protected route
  req.user = user;
  next();
});

/**
 * Middleware to restrict access to certain roles
 * @param {...string} roles - Allowed roles
 * @returns {Function} Express middleware
 */
const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(new AppError('You do not have permission to perform this action', 403));
    }
    next();
  };
};

/**
 * Middleware to check if user is the owner of a resource
 * @param {string} model - Prisma model name
 * @param {string} paramId - Request parameter for resource ID
 * @param {string} ownerField - Field name for owner ID
 * @returns {Function} Express middleware
 */
const isOwner = (model, paramId, ownerField) => {
  return catchAsync(async (req, res, next) => {
    const resourceId = req.params[paramId];
    
    // Get the resource
    const resource = await req.prisma[model].findUnique({
      where: { id: resourceId },
    });

    if (!resource) {
      return next(new AppError(`${model} not found`, 404));
    }

    // Check if the current user is the owner
    if (resource[ownerField] !== req.user.id) {
      return next(new AppError('You do not have permission to perform this action', 403));
    }

    // Add resource to request for later use
    req.resource = resource;
    next();
  });
};

module.exports = {
  protect,
  restrictTo,
  isOwner,
};