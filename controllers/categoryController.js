const Category = require('../models/Category');
const { deleteImage } = require('../config/cloudinary');

// @desc    Get all categories
// @route   GET /api/categories
// @access  Public
const getCategories = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const startIndex = (page - 1) * limit;

    let query = {};
    
    if (req.query.active !== undefined) {
      query.isActive = req.query.active === 'true';
    } else {
      query.isActive = true;
    }

    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search, 'i');
      query.$or = [
        { name: searchRegex },
        { description: searchRegex }
      ];
    }

    let sort = {};
    if (req.query.sortBy) {
      const parts = req.query.sortBy.split(':');
      sort[parts[0]] = parts[1] === 'desc' ? -1 : 1;
    } else {
      sort = { order: 1, name: 1 }; 
    }

    const includeInactive = req.admin ? true : false; 
    
    if (req.query.withCounts === 'true') {
      const categories = await Category.getCategoriesWithCounts(includeInactive);
      const filteredCategories = categories.filter(cat => {
        if (req.query.search) {
          const searchRegex = new RegExp(req.query.search, 'i');
          return searchRegex.test(cat.name) || searchRegex.test(cat.description);
        }
        return true;
      });
      
      const paginatedCategories = filteredCategories.slice(startIndex, startIndex + limit);
      
      return res.status(200).json({
        success: true,
        count: paginatedCategories.length,
        total: filteredCategories.length,
        data: paginatedCategories
      });
    }

    const categories = await Category.find(query)
      .populate('createdBy', 'name email')
      .sort(sort)
      .limit(limit * 1)
      .skip(startIndex);

    const total = await Category.countDocuments(query);

    // Pagination result
    const pagination = {};
    if (startIndex + limit < total) {
      pagination.next = { page: page + 1, limit };
    }
    if (startIndex > 0) {
      pagination.prev = { page: page - 1, limit };
    }

    res.status(200).json({
      success: true,
      count: categories.length,
      pagination,
      total,
      data: categories
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single category
// @route   GET /api/categories/:id
// @access  Public
const getCategory = async (req, res, next) => {
  try {
    const category = await Category.findById(req.params.id)
      .populate('createdBy', 'name email');

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    let stats = null;
    if (req.admin) {
      stats = await category.getStats();
    }

    res.status(200).json({
      success: true,
      data: {
        ...category.toObject(),
        stats
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get category by slug
// @route   GET /api/categories/slug/:slug
// @access  Public
const getCategoryBySlug = async (req, res, next) => {
  try {
    const category = await Category.findOne({ slug: req.params.slug })
      .populate('createdBy', 'name email');

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    res.status(200).json({
      success: true,
      data: category
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new category
// @route   POST /api/admin/categories
// @access  Private (Admin only)
const createCategory = async (req, res, next) => {
  try {
    const { name, description, color, seoTitle, seoDescription, order, isActive } = req.body;

    const existingCategory = await Category.findOne({ 
      name: { $regex: new RegExp(`^${name}$`, 'i') }
    });

    if (existingCategory) {
      return res.status(400).json({
        success: false,
        message: 'Category with this name already exists'
      });
    }

    const categoryData = {
      name,
      description,
      color,
      seoTitle,
      seoDescription,
      order: order || 0,
      isActive: isActive !== undefined ? isActive : true,
      createdBy: req.admin.id
    };

    if (req.file) {
      categoryData.image = {
        public_id: req.file.filename,
        url: req.file.path
      };
    }

    const category = await Category.create(categoryData);

    const populatedCategory = await Category.findById(category._id)
      .populate('createdBy', 'name email');

    res.status(201).json({
      success: true,
      message: 'Category created successfully',
      data: populatedCategory
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

// @desc    Update category
// @route   PUT /api/admin/categories/:id
// @access  Private (Admin only)
const updateCategory = async (req, res, next) => {
  try {
    const category = await Category.findById(req.params.id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    const { name, description, color, seoTitle, seoDescription, order, isActive } = req.body;
    
    if (name && name !== category.name) {
      const existingCategory = await Category.findOne({ 
        name: { $regex: new RegExp(`^${name}$`, 'i') },
        _id: { $ne: req.params.id }
      });

      if (existingCategory) {
        return res.status(400).json({
          success: false,
          message: 'Category with this name already exists'
        });
      }
    }

    // Update fields
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (color !== undefined) updateData.color = color;
    if (seoTitle !== undefined) updateData.seoTitle = seoTitle;
    if (seoDescription !== undefined) updateData.seoDescription = seoDescription;
    if (order !== undefined) updateData.order = order;
    if (isActive !== undefined) updateData.isActive = isActive;

    if (req.file) {
      if (category.image && category.image.public_id) {
        try {
          await deleteImage(category.image.public_id);
        } catch (deleteError) {
          console.error('Error deleting old image:', deleteError);
        }
      }
      
      updateData.image = {
        public_id: req.file.filename,
        url: req.file.path
      };
    }

    const updatedCategory = await Category.findByIdAndUpdate(
      req.params.id,
      updateData,
      {
        new: true,
        runValidators: true
      }
    ).populate('createdBy', 'name email');

    res.status(200).json({
      success: true,
      message: 'Category updated successfully',
      data: updatedCategory
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

// @desc    Delete category
// @route   DELETE /api/admin/categories/:id
// @access  Private (Super Admin only)
const deleteCategory = async (req, res, next) => {
  try {
    const category = await Category.findById(req.params.id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    const Blog = require('../models/Blog');
    const blogCount = await Blog.countDocuments({ category: req.params.id });

    if (blogCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete category. It has ${blogCount} blog(s) associated with it. Please move or delete the blogs first.`
      });
    }

    if (category.image && category.image.public_id) {
      try {
        await deleteImage(category.image.public_id);
      } catch (deleteError) {
        console.error('Error deleting category image:', deleteError);
      }
    }

    await Category.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Category deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Reorder categories
// @route   PUT /api/admin/categories/reorder
// @access  Private (Admin only)
const reorderCategories = async (req, res, next) => {
  try {
    const { categories } = req.body; 

    if (!Array.isArray(categories)) {
      return res.status(400).json({
        success: false,
        message: 'Categories array is required'
      });
    }

    const updatePromises = categories.map(({ id, order }) => 
      Category.findByIdAndUpdate(id, { order }, { new: true })
    );

    await Promise.all(updatePromises);

    res.status(200).json({
      success: true,
      message: 'Categories reordered successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get category statistics
// @route   GET /api/admin/categories/stats
// @access  Private (Admin only)
const getCategoryStats = async (req, res, next) => {
  try {
    const totalCategories = await Category.countDocuments();
    const activeCategories = await Category.countDocuments({ isActive: true });
    const inactiveCategories = await Category.countDocuments({ isActive: false });
    
    const categoriesWithCounts = await Category.getCategoriesWithCounts(true);
    
    res.status(200).json({
      success: true,
      data: {
        total: totalCategories,
        active: activeCategories,
        inactive: inactiveCategories,
        categoriesWithCounts
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCategories,
  getCategory,
  getCategoryBySlug,
  createCategory,
  updateCategory,
  deleteCategory,
  reorderCategories,
  getCategoryStats
};