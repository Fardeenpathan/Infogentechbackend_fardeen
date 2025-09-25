const express = require('express');
const { body, query } = require('express-validator');
const rateLimit = require('express-rate-limit');
const {
  getBlogs,
  getBlog,
  getBlogBySlug,
  getBlogsByCategory,
  getCategoriesWithBlogCount,
  createBlog,
  updateBlog,
  deleteBlog,
  uploadContentImage,
  getBlogStats,
  getFeaturedBlogs,
  getPopularTags,
  searchBlogs,
  checkSlugAvailability
} = require('../controllers/blogController');
const { protect, adminOnly } = require('../middleware/auth');
const { validate } = require('../middleware/validation');
const { parseFormJsonFields } = require('../middleware/formParser');
const { blogImageUpload, contentImageUpload } = require('../config/cloudinary');

const router = express.Router();

// Rate limiting for blog routes
const blogLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // limit each IP to 200 requests per windowMs
  message: 'Too many blog requests from this IP, please try again later.'
});

// Rate limiting for admin blog operations
const adminBlogLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // limit each IP to 50 requests per windowMs
  message: 'Too many admin blog requests from this IP, please try again later.'
});

const validateContentBlock = (block, { req }) => {
  const { type, data } = block;
  
  switch (type) {
    case 'paragraph':
      if (!data.content || typeof data.content !== 'string' || data.content.trim().length === 0) {
        throw new Error('Paragraph block must have content');
      }
      break;
    case 'heading':
      if (!data.content || typeof data.content !== 'string' || data.content.trim().length === 0) {
        throw new Error('Heading block must have content');
      }
      if (data.level && ![1, 2, 3, 4, 5, 6].includes(data.level)) {
        throw new Error('Heading level must be between 1 and 6');
      }
      break;
    case 'image':
      if (!data.url || typeof data.url !== 'string') {
        throw new Error('Image block must have a URL');
      }
      break;
    case 'list':
      if (!data.items || !Array.isArray(data.items) || data.items.length === 0) {
        throw new Error('List block must have items');
      }
      break;
    case 'quote':
      if (!data.content || typeof data.content !== 'string' || data.content.trim().length === 0) {
        throw new Error('Quote block must have content');
      }
      break;
    case 'code':
      if (!data.content || typeof data.content !== 'string') {
        throw new Error('Code block must have content');
      }
      break;
    case 'video':
      if (!data.url || typeof data.url !== 'string') {
        throw new Error('Video block must have a URL');
      }
      break;
  }
  return true;
};

const blogValidation = [
  body('title')
    .trim()
    .isLength({ min: 5, max: 200 })
    .withMessage('Blog title must be between 5 and 200 characters'),
  body('slug')
    .optional()
    .trim()
    .isLength({ min: 3, max: 100 })
    .matches(/^[a-z0-9-]+$/)
    .withMessage('Slug must be 3-100 characters long and contain only lowercase letters, numbers, and hyphens'),
  body('excerpt')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Excerpt must not exceed 500 characters'),
  body('category')
    .isMongoId()
    .withMessage('Valid category ID is required'),
  body('status')
    .optional()
    .isIn(['draft', 'published', 'archived'])
    .withMessage('Status must be draft, published, or archived'),
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high', 'urgent'])
    .withMessage('Priority must be low, medium, high, or urgent'),
  body('isFeatured')
    .optional()
    .isBoolean()
    .withMessage('isFeatured must be a boolean value'),
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array'),
  body('tags.*')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Each tag must be between 1 and 50 characters'),
  body('blocks')
    .optional()
    .isArray()
    .withMessage('Blocks must be an array'),
  body('blocks.*')
    .optional()
    .custom(validateContentBlock),
  body('language')
    .optional()
    .isLength({ min: 2, max: 5 })
    .withMessage('Language code must be between 2 and 5 characters'),
  body('scheduledAt')
    .optional()
    .isISO8601()
    .withMessage('Scheduled date must be a valid ISO date'),
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
    .withMessage('Each SEO keyword must be between 1 and 50 characters'),
  body('featuredImageAlt')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Featured image alt text must not exceed 200 characters')
];

const blogQueryValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Limit must be between 1 and 50'),
  query('category')
    .optional()
    .custom((value) => {
      if (value.match(/^[0-9a-fA-F]{24}$/)) return true;
      if (typeof value === 'string' && value.length >= 2) return true;
      throw new Error('Category must be a valid ObjectId or slug');
    }),
  query('author')
    .optional()
    .isMongoId()
    .withMessage('Author must be a valid ObjectId'),
  query('status')
    .optional()
    .isIn(['draft', 'published', 'archived'])
    .withMessage('Status must be draft, published, or archived'),
  query('featured')
    .optional()
    .isBoolean()
    .withMessage('Featured must be a boolean value'),
  query('tags')
    .optional()
    .trim()
    .isLength({ min: 1 })
    .withMessage('Tags query must not be empty'),
  query('search')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Search query must be between 2 and 100 characters'),
  query('sortBy')
    .optional()
    .matches(/^(title|publishedAt|views|likes|createdAt|updatedAt):(asc|desc)$/)
    .withMessage('SortBy must be in format field:direction (e.g., publishedAt:desc)'),
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Start date must be a valid ISO date'),
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid ISO date'),
  query('dateField')
    .optional()
    .isIn(['publishedAt', 'createdAt', 'updatedAt'])
    .withMessage('Date field must be publishedAt, createdAt, or updatedAt'),
  query('fullContent')
    .optional()
    .isBoolean()
    .withMessage('fullContent must be a boolean value')
];

const searchValidation = [
  query('q')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Search query must be between 2 and 100 characters'),
  query('category')
    .optional()
    .isMongoId()
    .withMessage('Category must be a valid ObjectId'),
  query('tags')
    .optional()
    .trim()
    .isLength({ min: 1 })
    .withMessage('Tags query must not be empty'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 20 })
    .withMessage('Limit must be between 1 and 20'),
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer')
];

router.get('/', blogLimiter, blogQueryValidation, validate, getBlogs);
router.get('/featured', blogLimiter, getFeaturedBlogs);
router.get('/tags', blogLimiter, getPopularTags);
router.get('/search', blogLimiter, searchValidation, validate, searchBlogs);
router.get('/categories-with-count', blogLimiter, getCategoriesWithBlogCount);
router.get('/category/:categorySlug', blogLimiter, getBlogsByCategory);
router.get('/slug/:slug', blogLimiter, getBlogBySlug);
router.get('/:id', blogLimiter, getBlog);

router.use('/admin', protect, adminOnly, adminBlogLimiter);

router.get('/admin/stats', getBlogStats);

router.post('/admin/check-slug', [
  body('slug').notEmpty().withMessage('Slug is required'),
  body('excludeId').optional().isMongoId().withMessage('Invalid exclude ID')
], validate, checkSlugAvailability);

router.post('/admin', 
  blogImageUpload.single('featuredImage'),
  parseFormJsonFields,
  blogValidation, 
  validate,
  createBlog
);

router.put('/admin/:id', 
  blogImageUpload.single('featuredImage'),
  parseFormJsonFields,
  blogValidation, 
  validate,
  updateBlog
);

router.delete('/admin/:id', deleteBlog);

router.post('/admin/upload-image',
  contentImageUpload.single('image'),
  [
    body('alt')
      .optional()
      .trim()
      .isLength({ max: 200 })
      .withMessage('Alt text must not exceed 200 characters')
  ],
  validate,
  uploadContentImage
);

module.exports = router;