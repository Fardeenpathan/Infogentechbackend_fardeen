// const rateLimit = require('express-rate-limit');

// // Rate limiting middleware
// const createRateLimit = (windowMs, max, message) => {
//   return rateLimit({
//     windowMs,
//     max,
//     message: {
//       success: false,
//       message: message || 'Too many requests from this IP, please try again later.'
//     },
//     standardHeaders: true,
//     legacyHeaders: false,
//     // Skip successful requests
//     skipSuccessfulRequests: false,
//     // Skip failed requests
//     skipFailedRequests: false,
//   });
// };

// // General rate limiting
// const generalLimiter = createRateLimit(
//   15 * 60 * 1000, // 15 minutes
//   100, // limit each IP to 100 requests per windowMs
//   'Too many requests from this IP, please try again after 15 minutes.'
// );

// // Strict rate limiting for auth routes
// const authLimiter = createRateLimit(
//   15 * 60 * 1000, // 15 minutes
//   5, // limit each IP to 5 requests per windowMs
//   'Too many authentication attempts from this IP, please try again after 15 minutes.'
// );

// // Contact form rate limiting
// const contactLimiter = createRateLimit(
//   60 * 60 * 1000, // 1 hour
//   5, // limit each IP to 5 contact form submissions per hour
//   'Too many contact form submissions from this IP, please try again after 1 hour.'
// );

// module.exports = {
//   generalLimiter,
//   authLimiter,
//   contactLimiter
// };