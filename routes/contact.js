const express = require('express');
const { body } = require('express-validator');
const { submitContactForm } = require('../controllers/contactController');
const { validate } = require('../middleware/validation');

const router = express.Router();

const contactValidation = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('Name can only contain letters and spaces'),
  
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address')
    .isLength({ max: 255 })
    .withMessage('Email cannot exceed 255 characters'),
  
  body('phoneNumber')
    .trim()
    .matches(/^[\+]?[1-9][\d]{0,15}$/)
    .withMessage('Please provide a valid phone number')
    .isLength({ max: 20 })
    .withMessage('Phone number cannot exceed 20 characters'),
  
  body('productQuestion')
    .isIn(['General Inquiry', 'Product Information', 'Technical Support', 'Pricing', 'Custom Solution', 'Partnership', 'Other'])
    .withMessage('Please select a valid product question category'),
  
  // body('message')
  //   .trim()
  //   .isLength({ min: 10, max: 1000 })
  //   .withMessage('Message must be between 10 and 1000 characters')
];

router.post('/', contactValidation, validate, submitContactForm);

module.exports = router;