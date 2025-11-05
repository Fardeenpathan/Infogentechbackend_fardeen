const mongoose = require("mongoose");
const slugify = require("slugify");

const blockSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true, 
  },
  data: {
    type: mongoose.Schema.Types.Mixed, 
    required: true,
  },
  order: {
    type: Number,
    required: true,
    default: 0,
  },
  settings: {
    type: mongoose.Schema.Types.Mixed, 
    default: {},
  },
});

const blogSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Blog title is required"],
      trim: true,
      maxlength: [300, "Title cannot exceed 300 characters"],
    },
    slug: {
      type: String,
      unique: true,
      lowercase: true,
    },
    excerpt: {
      type: String,
      trim: true,
      maxlength: [500, "Excerpt cannot exceed 500 characters"],
    },
    featuredImage: {
      public_id: { type: String, default: null },
      url: { type: String, default: null },
      alt: { type: String, default: "" },
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: [true, "Blog category is required"],
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      required: true,
    },
    status: {
      type: String,
      enum: ["draft", "published", "archived"],
      default: "draft",
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },
    tags: [
      {
        type: String,
        trim: true,
        lowercase: true,
      },
    ],
    blocks: [blockSchema], // Dynamic content blocks
    seo: {
      title: { type: String, trim: true },
      description: { type: String, trim: true },
      keywords: [{ type: String, trim: true, lowercase: true }],
      ogImage: {
        public_id: String,
        url: String,
      },
    },
    views: { type: Number, default: 0 },
    likes: { type: Number, default: 0 },
    readTime: { type: Number, default: 0 },
    publishedAt: { type: Date, default: null },
    scheduledAt: { type: Date, default: null },
    wordCount: { type: Number, default: 0 },
    language: {
      type: String,
      default: "en",
      enum: ["en", "es", "fr", "de", "it", "pt", "ru", "zh", "ja", "ar"],
    },
    country: {
      type: String,
      default: "global",
      enum: ["global", "us", "in", "uk", "ca", "au", "de", "fr", "es", "it", "jp", "br"],
      index: true, 
    },
    region: {
      type: String,
      enum: ["global", "north-america", "europe", "asia", "oceania", "south-america", "africa"],
      default: "global",
    },
    faqs: [
      {
        question: {
          type: String,
          required: true,
          trim: true,
          maxlength: [500, "FAQ question cannot exceed 500 characters"],
        },
        answer: {
          type: String,
          required: true,
          trim: true,
          maxlength: [2000, "FAQ answer cannot exceed 2000 characters"],
        },
        order: {
          type: Number,
          default: 0,
        },
        isActive: {
          type: Boolean,
          default: true,
        },
      },
    ],
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

blogSchema.pre("save", function (next) {
  if (!this.slug || (this.isModified("title") && !this.isModified("slug"))) {
    const baseSlug = slugify(this.title, { lower: true, strict: true });
    this.slug = `${baseSlug}`;
  }
  else if (this.isModified("slug")) {
    this.slug = slugify(this.slug, { lower: true, strict: true });
  }
  
  this.updatedAt = Date.now();
  if (this.isModified("status") && this.status === "published" && !this.publishedAt) {
    this.publishedAt = new Date();
  }
  this.calculateWordCount();
  this.calculateReadTime();
  next();
});

blogSchema.methods.calculateWordCount = function () {
  let totalWords = 0;
  totalWords += this.title?.split(/\s+/).length || 0;
  totalWords += this.excerpt?.split(/\s+/).length || 0;

  this.blocks.forEach((block) => {
    if (block.data) {
      const extractText = (obj) => {
        if (typeof obj === "string") return obj;
        if (Array.isArray(obj)) return obj.join(" ");
        if (typeof obj === "object") return Object.values(obj).join(" ");
        return "";
      };
      totalWords += extractText(block.data).split(/\s+/).length;
    }
  });

  this.wordCount = totalWords;
};

blogSchema.methods.calculateReadTime = function () {
  this.readTime = Math.ceil(this.wordCount / 200);
};

module.exports = mongoose.model("Blog", blogSchema);
