const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss');

dotenv.config();

const connectDB = require('./config/database');

const contactRoutes = require('./routes/contact');
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const categoryRoutes = require('./routes/category');
const blogRoutes = require('./routes/blog');
// const testRoutes = require('./routes/test');

const errorHandler = require('./middleware/errorHandler');
const { generalLimiter, authLimiter, contactLimiter } = require('./middleware/rateLimiter');

connectDB();

const app = express();

app.set('trust proxy', 1);

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  crossOriginEmbedderPolicy: false
}));

// CORS
const rawOrigins = (process.env.CORS_ORIGIN || 'http://localhost:3000').split(',').map(o => o.trim()).filter(Boolean);

app.use((req, res, next) => {
  const origin = req.get('Origin');

  if (!origin) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return next();
  }

  if (rawOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Vary', 'Origin');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    return next();
  }

  res.status(403).json({ success: false, message: 'CORS origin not allowed' });
});

app.use(compression());

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

app.use(mongoSanitize());

app.use((req, res, next) => {
  if (req.body) {
    Object.keys(req.body).forEach(key => {
      if (typeof req.body[key] === 'string') {
        req.body[key] = xss(req.body[key]);
      }
    });
  }
  next();
});

// // Apply rate limiting
// app.use('/api/', generalLimiter);
// app.use('/api/auth/', authLimiter);
// app.use('/api/contact/', contactLimiter);

app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

app.use('/api/contact', contactRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/blogs', blogRoutes);
// app.use('/api/test', testRoutes);

app.all('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`
  });
});

app.use(errorHandler);

const PORT = process.env.PORT || 5000;
// const HOST = process.env.HOST || '0.0.0.0';

// const server = app.listen(PORT, HOST, () => {
//   console.log(`Server running in ${process.env.NODE_ENV || 'production'} mode on ${HOST}:${PORT}`);
// });
const server = app.listen(PORT, () => {
  console.log(`
 Server running in ${process.env.NODE_ENV} mode on port ${PORT}
 Health check: http://localhost:${PORT}/health
 Contact API: http://localhost:${PORT}/api/contact
 Auth API: http://localhost:${PORT}/api/auth
 Admin API: http://localhost:${PORT}/api/admin
 Categories API: http://localhost:${PORT}/api/categories
 Blogs API: http://localhost:${PORT}/api/blogs
  `);
});

process.on('unhandledRejection', (err, promise) => {
  console.log(`Error: ${err.message}`);
  server.close(() => {
    process.exit(1);
  });
});

process.on('uncaughtException', (err) => {
  console.log(`Error: ${err.message}`);
  console.log('Shutting down the server due to Uncaught Exception');
  process.exit(1);
});

module.exports = app;