const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");

dotenv.config();

const JWT_SECRET = process.env.SECRET_KEY; // Use environment variables in production

// Middleware to verify JWT
const authenticateUser = (req, res, next) => {
  const token = req.header("Authorization");

  if (!token) {
    return res
      .status(401)
      .json({ success: false, error: "Access denied. No token provided." });
  }

  try {
    const decoded = jwt.verify(token.replace("Bearer ", ""), JWT_SECRET);
    req.user = decoded; // Store user details in `req.user`
    next();
  } catch (error) {
    return res.status(403).json({ success: false, error: "Invalid token." });
  }
};

// Middleware to check if user is an admin
const authorizeAdmin = (req, res, next) => {
  if (req.user.role !== "admin") {
    return res
      .status(403)
      .json({ success: false, error: "Access denied. Admins only." });
  }
  next();
};

module.exports = { authenticateUser, authorizeAdmin };
