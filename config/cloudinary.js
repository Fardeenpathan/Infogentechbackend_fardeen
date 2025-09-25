const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');
require('dotenv').config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const createCloudinaryStorage = (folder, allowedFormats = ['jpg', 'jpeg', 'png', 'gif', 'webp']) => {
  return new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
      folder: `blog-app/${folder}`,
      allowed_formats: allowedFormats,
      transformation: [
        { quality: 'auto' },
        { fetch_format: 'auto' }
      ]
    }
  });
};

const blogImageStorage = createCloudinaryStorage('blogs');

const categoryImageStorage = createCloudinaryStorage('categories');

const contentImageStorage = createCloudinaryStorage('content');

const blogImageUpload = multer({
  storage: blogImageStorage,
  limits: {
    fileSize: 15 * 1024 * 1024, // 15MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Please upload only image files'), false);
    }
  }
});

const categoryImageUpload = multer({
  storage: categoryImageStorage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Please upload only image files'), false);
    }
  }
});

const contentImageUpload = multer({
  storage: contentImageStorage,
  limits: {
    fileSize: 10 * 1024 * 1024, 
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Please upload only image files'), false);
    }
  }
});

const deleteImage = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result;
  } catch (error) {
    console.error('Error deleting image from Cloudinary:', error);
    throw error;
  }
};

const optimizeImageUrl = (url, options = {}) => {
  const {
    width,
    height,
    quality = 'auto',
    format = 'auto',
    crop = 'fill'
  } = options;
  
  if (!url) return null;
  
  const publicIdMatch = url.match(/\/v\d+\/(.+)\.(\w+)$/);
  if (!publicIdMatch) return url;
  
  const publicId = publicIdMatch[1];
  
  let transformation = [`q_${quality}`, `f_${format}`];
  
  if (width && height) {
    transformation.push(`w_${width}`, `h_${height}`, `c_${crop}`);
  } else if (width) {
    transformation.push(`w_${width}`);
  } else if (height) {
    transformation.push(`h_${height}`);
  }
  
  return cloudinary.url(publicId, {
    transformation: transformation
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
