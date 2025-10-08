const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');
require('dotenv').config();
const path = require('path');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const createCloudinaryStorage = (
  folder,
  allowedFormats = ["jpg", "jpeg", "png", "gif", "webp", "mp4"]
) => {
  return new CloudinaryStorage({
    cloudinary,
    params: (req, file) => {
      const name = path.parse(file.originalname).name.replace(/\s+/g, "-").toLowerCase();
      const publicId = `${folder}/${Date.now()}-${name}`;
      return {
        folder: `blog-app/${folder}`,
        resource_type: "auto", // allow images & videos
        allowed_formats: allowedFormats,
        public_id: publicId,
        transformation: [{ quality: "auto" }, { fetch_format: "auto" }],      };
    },
  });
};

const blogImageStorage = createCloudinaryStorage("blogs", ["jpg", "jpeg", "png", "gif", "webp", "mp4"]);
const categoryImageStorage = createCloudinaryStorage("categories", ["jpg", "jpeg", "png", "gif", "webp", "mp4"]); // allow mp4 here
const contentImageStorage = createCloudinaryStorage("content", ["jpg", "jpeg", "png", "gif", "webp", "mp4"]);

const allowImage = (file) => file && file.mimetype && file.mimetype.startsWith("image/");
const allowVideo = (file) => file && file.mimetype && file.mimetype.startsWith("video/");

const blogImageUpload = multer({
  storage: blogImageStorage,
  limits: {
    fileSize: 15 * 1024 * 1024, 
  },
  fileFilter: (req, file, cb) => {
    if (allowImage(file) || allowVideo(file)) {
      cb(null, true);
    } else {
      cb(new Error("Please upload only image or video files (mp4)"), false);
    }
  }
});

const categoryImageUpload = multer({
  storage: categoryImageStorage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB to allow category videos
  },
  fileFilter: (req, file, cb) => {
    if (allowImage(file) || allowVideo(file)) {
      cb(null, true);
    } else {
      cb(new Error("Please upload only image or video files for category (mp4)"), false);
    }
  },
});

const contentImageUpload = multer({
  storage: contentImageStorage,
  limits: {
    fileSize: 15 * 1024 * 1024, // 15MB for content images
  },
  fileFilter: (req, file, cb) => {
    if (allowImage(file) || allowVideo(file)) {
      cb(null, true);
    } else {
      cb(new Error("Please upload only image or video files (mp4) for content"), false);
    }
  },
});

const deleteImage = async (publicId, resourceType = "auto") => {
  try {
    const result = await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
    return result;
  } catch (error) {
    console.error('Error deleting  from Cloudinary:', error);
    throw error;
  }
};

const optimizeImageUrl = (url, options = {}) => {
  const { width, height, quality = "auto", format = "auto", crop = "fill" } = options;
  if (!url) return null;

  const publicIdMatch = url.match(/\/v\d+\/(.+)\.(\w+)(\?.*)?$/);
  if (!publicIdMatch) return url;
  const publicId = publicIdMatch[1];

  const transformation = [`q_${quality}`, `f_${format}`];
  if (width && height) transformation.push(`w_${width}`, `h_${height}`, `c_${crop}`);
  else if (width) transformation.push(`w_${width}`);
  else if (height) transformation.push(`h_${height}`);

  return cloudinary.url(publicId, {
    resource_type: "auto",
    transformation,
  });
};

module.exports = {
  cloudinary,
  blogImageUpload,
  categoryImageUpload,
  contentImageUpload,
  deleteImage,
  optimizeImageUrl
};
