const mongoose = require('mongoose');
const slugify = require('slugify');

const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Category name is required'],
    unique: true,
    trim: true,
    maxlength: [100, 'Category name cannot exceed 100 characters'],
    minlength: [2, 'Category name must be at least 2 characters long']
  },
  slug: {
    type: String,
    unique: true,
    lowercase: true
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  image: {
    public_id: {
      type: String,
      default: null
    },
    url: {
      type: String,
      default: null
    }
  },
  color: {
    type: String,
    default: '#6366f1', 
    match: [/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Please provide a valid hex color']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  order: {
    type: Number,
    default: 0
  },
  seoTitle: {
    type: String,
    trim: true,
    maxlength: [60, 'SEO title cannot exceed 60 characters']
  },
  seoDescription: {
    type: String,
    trim: true,
    maxlength: [160, 'SEO description cannot exceed 160 characters']
  },
  blogCount: {
    type: Number,
    default: 0
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

categorySchema.index({ name: 1 });
categorySchema.index({ slug: 1 });
categorySchema.index({ isActive: 1 });
categorySchema.index({ order: 1 });
categorySchema.index({ createdAt: -1 });

categorySchema.pre('save', function(next) {
  if (this.isModified('name')) {
    this.slug = slugify(this.name, {
      lower: true,
      strict: true,
      remove: /[*+~.()'"!:@]/g
    });
  }
  this.updatedAt = Date.now();
  next();
});

categorySchema.virtual('blogs', {
  ref: 'Blog',
  localField: '_id',
  foreignField: 'category',
  count: true
});

categorySchema.statics.updateBlogCount = async function(categoryId) {
  const blogCount = await mongoose.model('Blog').countDocuments({ 
    category: categoryId,
    status: 'published'
  });
  
  await this.findByIdAndUpdate(categoryId, { blogCount });
  return blogCount;
};

categorySchema.statics.getCategoriesWithCounts = async function(includeInactive = false) {
  const matchStage = includeInactive ? {} : { isActive: true };
  
  const categories = await this.aggregate([
    { $match: matchStage },
    {
      $lookup: {
        from: 'blogs',
        let: { categoryId: '$_id' },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ['$category', '$$categoryId'] },
                  { $eq: ['$status', 'published'] }
                ]
              }
            }
          }
        ],
        as: 'blogs'
      }
    },
    {
      $addFields: {
        blogCount: { $size: '$blogs' }
      }
    },
    {
      $project: {
        blogs: 0
      }
    },
    { $sort: { order: 1, name: 1 } }
  ]);
  
  return categories;
};

categorySchema.methods.getStats = async function() {
  const Blog = mongoose.model('Blog');
  
  const stats = await Blog.aggregate([
    { $match: { category: this._id } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);
  
  const totalBlogs = await Blog.countDocuments({ category: this._id });
  const publishedBlogs = await Blog.countDocuments({ 
    category: this._id, 
    status: 'published' 
  });
  
  return {
    total: totalBlogs,
    published: publishedBlogs,
    byStatus: stats
  };
};

module.exports = mongoose.model('Category', categorySchema);