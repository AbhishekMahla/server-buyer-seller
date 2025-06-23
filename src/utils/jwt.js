const jwt = require("jsonwebtoken");
const { AppError } = require("./errorHandler");

// Generate a JWT token for a user

const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

//  Verify a JWT token

const verifyToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    throw new AppError("Invalid token. Please log in again.", 401);
  }
};

module.exports = {
  generateToken,
  verifyToken,
};
