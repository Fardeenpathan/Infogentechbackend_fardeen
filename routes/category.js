const express = require('express');
const { body, query } = require('express-validator');
const rateLimit = require('express-rate-limit');
const {
  getCategories,
  getCategory,
  getCategoryBySlug,
  createCategory,
  updateCategory,
  deleteCategory,
  reorderCategories,
  getCategoryStats
} = require('../controllers/categoryController');
const { protect, adminOnly } = require('../middleware/auth');
const { validate } = require('../middleware/validation');
const { categoryImageUpload } = require('../config/cloudinary');

const router = express.Router();

// Rate limiting for category routes
const categoryLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many category requests from this IP, please try again later.'
});

const adminCategoryLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // limit each IP to 50 requests per windowMs
  message: 'Too many admin category requests from this IP, please try again later.'
});

const categoryValidation = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Category name must be between 2 and 100 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description must not exceed 500 characters'),
  body('color')
    .optional()
    .matches(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/)
    .withMessage('Color must be a valid hex color code'),
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean value'),
  body('order')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Order must be a non-negative integer'),
  body('seo.title')
    .optional()
    .trim()
    .isLength({ max: 60 })
    .withMessage('SEO title must not exceed 60 characters'),
  body('seo.description')
    .optional()
    .trim()
    .isLength({ max: 160 })
    .withMessage('SEO description must not exceed 160 characters'),
  body('seo.keywords')
    .optional()
    .isArray()
    .withMessage('SEO keywords must be an array'),
  body('seo.keywords.*')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Each SEO keyword must be between 1 and 50 characters')
];

const categoryQueryValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('sort')
    .optional()
    .isIn(['name', 'order', 'blogCount', 'createdAt', 'updatedAt'])
    .withMessage('Invalid sort field'),
  query('order')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Order must be asc or desc'),
  query('search')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Search query must be between 1 and 100 characters'),
  query('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean value')
];

router.get('/', categoryLimiter, categoryQueryValidation, validate, getCategories);
router.get('/slug/:slug', categoryLimiter, getCategoryBySlug);
router.get('/:id', categoryLimiter, getCategory);

router.get('/admin/stats', protect, adminOnly, adminCategoryLimiter, getCategoryStats);

router.post('/admin', 
  protect, 
  adminOnly, 
  adminCategoryLimiter,
  categoryImageUpload.single('image'),
  categoryValidation, 
  validate,
  createCategory
);

router.put('/admin/:id', 
  protect, 
  adminOnly, 
  // adminCategoryLimiter,
  categoryImageUpload.single('image'),
  categoryValidation, 
  validate,
  updateCategory
);

router.delete('/admin/:id', protect, adminOnly, adminCategoryLimiter, deleteCategory);

router.patch('/admin/reorder', 
  protect, 
  adminOnly, 
  adminCategoryLimiter,
  [
    body('categories')
      .isArray({ min: 1 })
      .withMessage('Categories array is required'),
    body('categories.*.id')
      .isMongoId()
      .withMessage('Invalid category ID'),
    body('categories.*.order')
      .isInt({ min: 0 })
      .withMessage('Order must be a non-negative integer')
  ],
  validate,
  reorderCategories
);

module.exports = router;