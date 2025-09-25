const Blog = require('../models/Blog');
const Category = require('../models/Category');
const { deleteImage } = require('../config/cloudinary');
const slugify = require('slugify');

const validateSlug = async (slug, excludeId = null) => {
  if (!slug) return null;
  
  const formattedSlug = slugify(slug, { lower: true, strict: true });
  
  const query = { slug: formattedSlug };
  if (excludeId) {
    query._id = { $ne: excludeId };
  }
  
  const existingBlog = await Blog.findOne(query);
  if (existingBlog) {
    throw new Error('Slug already exists. Please choose a different slug.');
  }
  
  return formattedSlug;
};

// @desc    Get all blogs
// @route   GET /api/blogs
// @access  Public
const getBlogs = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;

    let query = {};
    
    if (!req.admin) {
      query.status = 'published';
    } else if (req.query.status) {
      query.status = req.query.status;
    }

    if (req.query.category) {
      const categories = req.query.category.split(',').map(cat => cat.trim());
      const categoryQueries = [];
      
      for (const cat of categories) {
        if (cat.match(/^[0-9a-fA-F]{24}$/)) {
          categoryQueries.push(cat);
        } else {
          const category = await Category.findOne({
            $or: [
              { slug: cat.toLowerCase() },
              { name: new RegExp(cat, 'i') }
            ]
          });
          if (category) {
            categoryQueries.push(category._id);
          }
        }
      }
      
      if (categoryQueries.length > 0) {
        query.category = categoryQueries.length === 1 ? 
          categoryQueries[0] : 
          { $in: categoryQueries };
      }
    }

    if (req.query.author) {
      query.author = req.query.author;
    }

    if (req.query.featured !== undefined) {
      query.isFeatured = req.query.featured === 'true';
    }

    if (req.query.tags) {
      const tags = req.query.tags.split(',').map(tag => tag.trim().toLowerCase());
      query.tags = { $in: tags };
    }

    if (req.query.startDate || req.query.endDate) {
      const dateField = req.query.dateField || 'publishedAt';
      query[dateField] = {};
      if (req.query.startDate) {
        query[dateField].$gte = new Date(req.query.startDate);
      }
      if (req.query.endDate) {
        query[dateField].$lte = new Date(req.query.endDate);
      }
    }

    if (req.query.search) {
      query.$text = { $search: req.query.search };
    }

    let sort = {};
    if (req.query.sortBy) {
      const parts = req.query.sortBy.split(':');
      sort[parts[0]] = parts[1] === 'desc' ? -1 : 1;
    } else {
      sort = req.query.search ? 
        { score: { $meta: 'textScore' }, publishedAt: -1 } : 
        { publishedAt: -1 };
    }

    const blogs = await Blog.find(query)
      .populate('category', 'name slug color')
      .populate('author', 'name email')
      .sort(sort)
      .limit(limit * 1)
      .skip(startIndex)
      .select(req.query.fullContent ? '' : '-blocks'); 

    const total = await Blog.countDocuments(query);

    const pagination = {};
    if (startIndex + limit < total) {
      pagination.next = { page: page + 1, limit };
    }
    if (startIndex > 0) {
      pagination.prev = { page: page - 1, limit };
    }

    res.status(200).json({
      success: true,
      count: blogs.length,
      pagination,
      total,
      data: blogs
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single blog
// @route   GET /api/blogs/:id
// @access  Public
const getBlog = async (req, res, next) => {
  try {
    const blog = await Blog.findById(req.params.id)
      .populate('category', 'name slug color description')
      .populate('author', 'name email');

      console.log(blog)

    // if (!blog) {
    //   return res.status(404).json({
    //     success: false,
    //     message: 'Blog not found'
    //   });
    // }

    console.log(req.params.id)

    // if (blog.status !== 'published' && !req.admin) {
    //   return res.status(404).json({
    //     success: false,
    //     message: 'Blog not found'
    //   });
    // }

    // if (blog.status === 'published' && !req.admin) {
    //   await blog.incrementViews();
    // }

    res.status(200).json({
      success: true,
      data: blog
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get blog by slug
// @route   GET /api/blogs/slug/:slug
// @access  Public
const getBlogBySlug = async (req, res, next) => {
  try {
    const blog = await Blog.findOne({ slug: req.params.slug })
      .populate('category', 'name slug color description')
      .populate('author', 'name email');

    // if (!blog) {
    //   return res.status(404).json({
    //     success: false,
    //     message: 'Blog not found'
    //   });
    // }

    // if (blog.status !== 'published' && !req.admin) {
    //   return res.status(404).json({
    //     success: false,
    //     message: 'Blog not found'
    //   });
    // }

    // if (blog.status === 'published' && !req.admin) {
    //   await blog.incrementViews();
    // }

    res.status(200).json({
      success: true,
      data: blog
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get blogs by category
// @route   GET /api/blogs/category/:categorySlug
// @access  Public
const getBlogsByCategory = async (req, res, next) => {
  try {
    const { categorySlug } = req.params;
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;

    const category = await Category.findOne({ slug: categorySlug });
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    let query = {
      category: category._id,
      status: 'published'
    };

    // Additional filters
    if (req.query.featured !== undefined) {
      query.isFeatured = req.query.featured === 'true';
    }

    if (req.query.tags) {
      const tags = req.query.tags.split(',').map(tag => tag.trim().toLowerCase());
      query.tags = { $in: tags };
    }

    if (req.query.search) {
      query.$text = { $search: req.query.search };
    }

    let sort = {};
    if (req.query.sortBy) {
      const parts = req.query.sortBy.split(':');
      sort[parts[0]] = parts[1] === 'desc' ? -1 : 1;
    } else {
      sort = { publishedAt: -1 };
    }

    const blogs = await Blog.find(query)
      .populate('category', 'name slug color')
      .populate('author', 'name email')
      .sort(sort)
      .limit(limit * 1)
      .skip(startIndex)
      .select('-blocks'); 

    const total = await Blog.countDocuments(query);

    const pagination = {};
    if (startIndex + limit < total) {
      pagination.next = { page: page + 1, limit };
    }
    if (startIndex > 0) {
      pagination.prev = { page: page - 1, limit };
    }

    res.status(200).json({
      success: true,
      count: blogs.length,
      total,
      pagination,
      category: {
        name: category.name,
        slug: category.slug,
        description: category.description,
        color: category.color
      },
      data: blogs
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get categories with blog count
// @route   GET /api/blogs/categories-with-count
// @access  Public
const getCategoriesWithBlogCount = async (req, res, next) => {
  try {
    const categories = await Category.aggregate([
      {
        $lookup: {
          from: 'blogs',
          localField: '_id',
          foreignField: 'category',
          as: 'blogs'
        }
      },
      {
        $addFields: {
          blogCount: {
            $size: {
              $filter: {
                input: '$blogs',
                cond: { $eq: ['$$this.status', 'published'] }
              }
            }
          },
          totalBlogs: { $size: '$blogs' }
        }
      },
      {
        $project: {
          name: 1,
          slug: 1,
          description: 1,
          color: 1,
          image: 1,
          blogCount: 1,
          totalBlogs: 1,
          isActive: 1
        }
      },
      {
        $sort: { blogCount: -1 }
      }
    ]);

    res.status(200).json({
      success: true,
      count: categories.length,
      data: categories
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new blog
// @route   POST /api/admin/blogs
// @access  Private (Admin only)
const createBlog = async (req, res, next) => {
  try {
    const { 
      title, 
      slug, // Manual slug input
      excerpt, 
      category, 
      status, 
      priority, 
      isFeatured, 
      tags, 
      blocks,
      seo,
      language,
      scheduledAt
    } = req.body;

    const categoryExists = await Category.findById(category);
    if (!categoryExists) {
      return res.status(400).json({
        success: false,
        message: 'Invalid category'
      });
    }

    if (slug) {
      try {
        await validateSlug(slug);
      } catch (error) {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }
    }

    const blogData = {
      title,
      slug, 
      excerpt,
      category,
      author: req.admin.id,
      status: status || 'draft',
      priority: priority || 'medium',
      isFeatured: isFeatured || false,
      tags: tags || [],
      blocks: blocks || [],
      seo: seo || {},
      language: language || 'en',
      scheduledAt: scheduledAt || null
    };

    if (req.file) {
      blogData.featuredImage = {
        public_id: req.file.filename,
        url: req.file.path,
        alt: req.body.featuredImageAlt || ''
      };
    }

    const blog = await Blog.create(blogData);

    const populatedBlog = await Blog.findById(blog._id)
      .populate('category', 'name slug color')
      .populate('author', 'name email');

    res.status(201).json({
      success: true,
      message: 'Blog created successfully',
      data: populatedBlog
    });
  } catch (error) {
    if (req.file && req.file.filename) {
      try {
        await deleteImage(req.file.filename);
      } catch (deleteError) {
        console.error('Error deleting uploaded image:', deleteError);
      }
    }
    next(error);
  }
};

// @desc    Update blog
// @route   PUT /api/admin/blogs/:id
// @access  Private (Admin only)
const updateBlog = async (req, res, next) => {
  try {
    const blog = await Blog.findById(req.params.id);

    if (!blog) {
      return res.status(404).json({
        success: false,
        message: 'Blog not found'
      });
    }

    const { 
      title, 
      slug, // Manual slug update
      excerpt, 
      category, 
      status, 
      priority, 
      isFeatured, 
      tags, 
      blocks,
      seo,
      language,
      scheduledAt
    } = req.body;

    if (category && category !== blog.category.toString()) {
      const categoryExists = await Category.findById(category);
      if (!categoryExists) {
        return res.status(400).json({
          success: false,
          message: 'Invalid category'
        });
      }
    }

    // Check if manual slug is provided and validate it
    if (slug && slug !== blog.slug) {
      try {
        await validateSlug(slug, req.params.id);
      } catch (error) {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }
    }

    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (slug !== undefined) updateData.slug = slug; // Add slug to update data
    if (excerpt !== undefined) updateData.excerpt = excerpt;
    if (category !== undefined) updateData.category = category;
    if (status !== undefined) updateData.status = status;
    if (priority !== undefined) updateData.priority = priority;
    if (isFeatured !== undefined) updateData.isFeatured = isFeatured;
    if (tags !== undefined) updateData.tags = tags;
    if (blocks !== undefined) updateData.blocks = blocks;
    if (seo !== undefined) updateData.seo = { ...blog.seo, ...seo };
    if (language !== undefined) updateData.language = language;
    if (scheduledAt !== undefined) updateData.scheduledAt = scheduledAt;

    if (req.file) {
      if (blog.featuredImage && blog.featuredImage.public_id) {
        try {
          await deleteImage(blog.featuredImage.public_id);
        } catch (deleteError) {
          console.error('Error deleting old image:', deleteError);
        }
      }
      
      updateData.featuredImage = {
        public_id: req.file.filename,
        url: req.file.path,
        alt: req.body.featuredImageAlt || ''
      };
    } else if (req.body.featuredImageAlt !== undefined) {
      updateData['featuredImage.alt'] = req.body.featuredImageAlt;
    }

    const updatedBlog = await Blog.findByIdAndUpdate(
      req.params.id,
      updateData,
      {
        new: true,
        runValidators: true
      }
    ).populate('category', 'name slug color')
     .populate('author', 'name email');

    res.status(200).json({
      success: true,
      message: 'Blog updated successfully',
      data: updatedBlog
    });
  } catch (error) {
    if (req.file && req.file.filename) {
      try {
        await deleteImage(req.file.filename);
      } catch (deleteError) {
        console.error('Error deleting uploaded image:', deleteError);
      }
    }
    next(error);
  }
};

// @desc    Delete blog
// @route   DELETE /api/admin/blogs/:id
// @access  Private (Admin only)
const deleteBlog = async (req, res, next) => {
  try {
    const blog = await Blog.findById(req.params.id);

    if (!blog) {
      return res.status(404).json({
        success: false,
        message: 'Blog not found'
      });
    }

    if (blog.featuredImage && blog.featuredImage.public_id) {
      try {
        await deleteImage(blog.featuredImage.public_id);
      } catch (deleteError) {
        console.error('Error deleting featured image:', deleteError);
      }
    }

    if (blog.blocks && blog.blocks.length > 0) {
      for (const block of blog.blocks) {
        if (block.type === 'image' && block.data.public_id) {
          try {
            await deleteImage(block.data.public_id);
          } catch (deleteError) {
            console.error('Error deleting block image:', deleteError);
          }
        } else if (block.type === 'gallery' && block.data.images) {
          for (const image of block.data.images) {
            if (image.public_id) {
              try {
                await deleteImage(image.public_id);
              } catch (deleteError) {
                console.error('Error deleting gallery image:', deleteError);
              }
            }
          }
        }
      }
    }

    await Blog.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Blog deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Upload content image
// @route   POST /api/admin/blogs/upload-image
// @access  Private (Admin only)
const uploadContentImage = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No image file provided'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Image uploaded successfully',
      data: {
        public_id: req.file.filename,
        url: req.file.path,
        alt: req.body.alt || ''
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get blog statistics
// @route   GET /api/admin/blogs/stats
// @access  Private (Admin only)
const getBlogStats = async (req, res, next) => {
  try {
    const stats = await Blog.getStats();
    const popularTags = await Blog.getPopularTags(10);
    
    const recentBlogs = await Blog.find({ status: 'published' })
      .populate('category', 'name')
      .populate('author', 'name')
      .sort({ publishedAt: -1 })
      .limit(5)
      .select('title slug views likes publishedAt');

    const mostViewed = await Blog.find({ status: 'published' })
      .populate('category', 'name')
      .sort({ views: -1 })
      .limit(5)
      .select('title slug views publishedAt');

    res.status(200).json({
      success: true,
      data: {
        ...stats,
        popularTags,
        recentBlogs,
        mostViewed
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get featured blogs
// @route   GET /api/blogs/featured
// @access  Public
const getFeaturedBlogs = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 5;

    const blogs = await Blog.find({ 
      status: 'published',
      isFeatured: true 
    })
      .populate('category', 'name slug color')
      .populate('author', 'name')
      .sort({ publishedAt: -1 })
      .limit(limit)
      .select('-blocks'); 

    res.status(200).json({
      success: true,
      count: blogs.length,
      data: blogs
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get popular tags
// @route   GET /api/blogs/tags
// @access  Public
const getPopularTags = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 20;
    const tags = await Blog.getPopularTags(limit);

    res.status(200).json({
      success: true,
      count: tags.length,
      data: tags
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Search blogs
// @route   GET /api/blogs/search
// @access  Public
const searchBlogs = async (req, res, next) => {
  try {
    const { q, category, tags, limit = 10, page = 1 } = req.query;
    
    if (!q || q.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Search query is required'
      });
    }

    const startIndex = (page - 1) * limit;
    let query = {
      status: 'published',
      $text: { $search: q }
    };

    if (category) {
      query.category = category;
    }

    if (tags) {
      const tagArray = tags.split(',').map(tag => tag.trim().toLowerCase());
      query.tags = { $in: tagArray };
    }

    const blogs = await Blog.find(query)
      .populate('category', 'name slug color')
      .populate('author', 'name')
      .sort({ score: { $meta: 'textScore' }, publishedAt: -1 })
      .limit(limit * 1)
      .skip(startIndex)
      .select('-blocks');

    const total = await Blog.countDocuments(query);

    res.status(200).json({
      success: true,
      count: blogs.length,
      total,
      data: blogs
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Check slug availability
// @route   POST /api/admin/blogs/check-slug
// @access  Private (Admin only)
const checkSlugAvailability = async (req, res, next) => {
  try {
    const { slug, excludeId } = req.body;
    
    if (!slug) {
      return res.status(400).json({
        success: false,
        message: 'Slug is required'
      });
    }

    try {
      const formattedSlug = await validateSlug(slug, excludeId);
      res.status(200).json({
        success: true,
        message: 'Slug is available',
        data: {
          available: true,
          formattedSlug
        }
      });
    } catch (error) {
      res.status(200).json({
        success: true,
        message: error.message,
        data: {
          available: false,
          formattedSlug: slugify(slug, { lower: true, strict: true })
        }
      });
    }
  } catch (error) {
    next(error);
  }
};

module.exports = {
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
};