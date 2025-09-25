const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');

const protect = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to access this route'
      });
    }

    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      const admin = await Admin.findById(decoded.id).select('+password');

      if (!admin) {
        return res.status(401).json({
          success: false,
          message: 'No admin found with this token'
        });
      }

      if (!admin.isActive) {
        return res.status(401).json({
          success: false,
          message: 'Admin account is deactivated'
        });
      }

      req.admin = admin;
      next();
    } catch (err) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to access this route'
      });
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.admin.role)) {
      return res.status(403).json({
        success: false,
        message: `Admin role ${req.admin.role} is not authorized to access this route`
      });
    }
    next();
  };
};

// Admin only middleware - requires admin role
const adminOnly = authorize('admin', 'super-admin');

module.exports = { protect, authorize, adminOnly };