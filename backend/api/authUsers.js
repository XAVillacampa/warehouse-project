const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET; // Use environment variables in production
const JWT_EXPIRATION = "24h";

// Helper functions
const generateToken = (user) => {
  // Only include the fields you want to expose
  const payload = {
    id: user.id,
    email: user.email,
    username: user.username,
    role: user.role,
    vendor_number: user.vendor_number,
    last_login: user.last_login,
  };
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN });
};

const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1]; // Bearer <token>
  if (!token) {
    return res.status(401).json({ message: "No token provided" });
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

// Helper function to decode a token string (used in /api/activate)
const decodeToken = (token) => {
  return jwt.verify(token, JWT_SECRET);
};

module.exports = { generateToken, verifyToken, decodeToken };
