const bcrypt = require("bcryptjs");
const { AppError, catchAsync } = require("../utils/errorHandler");
const { generateToken } = require("../utils/jwt");

//  Register a new user

const register = catchAsync(async (req, res, next) => {
  const { name, email, password, role } = req.body;

  // Check if all required fields are provided
  if (!name || !email || !password || !role) {
    return next(
      new AppError("Please provide name, email, password, and role", 400)
    );
  }

  // Check if role is valid
  if (!["BUYER", "SELLER"].includes(role)) {
    return next(new AppError("Role must be either BUYER or SELLER", 400));
  }

  // Check if user already exists
  const existingUser = await req.prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    return next(new AppError("User already exists with this email", 400));
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 12);

  // Create user
  const user = await req.prisma.user.create({
    data: {
      name,
      email,
      password: hashedPassword,
      role,
    },
  });

  // Generate token
  const token = generateToken(user.id);

  // Remove password from response
  const { password: _, ...userWithoutPassword } = user;

  res.status(201).json({
    status: "success",
    token,
    data: {
      user: userWithoutPassword,
    },
  });
});

//  Login a user

const login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  // Check if email and password are provided
  if (!email || !password) {
    return next(new AppError("Please provide email and password", 400));
  }

  // Check if user exists
  const user = await req.prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    return next(new AppError("Invalid email or password", 401));
  }

  // Check if password is correct
  const isPasswordCorrect = await bcrypt.compare(password, user.password);

  if (!isPasswordCorrect) {
    return next(new AppError("Invalid email or password", 401));
  }

  // Generate token
  const token = generateToken(user.id);

  // Remove password from response
  const { password: _, ...userWithoutPassword } = user;

  res.status(200).json({
    status: "success",
    token,
    data: {
      user: userWithoutPassword,
    },
  });
});

//  Get current user profile

const getMe = catchAsync(async (req, res, next) => {
  // User is already available from the protect middleware
  const { password: _, ...userWithoutPassword } = req.user;

  res.status(200).json({
    status: "success",
    data: {
      user: userWithoutPassword,
    },
  });
});

module.exports = {
  register,
  login,
  getMe,
};
