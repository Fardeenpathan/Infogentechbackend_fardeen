const express = require('express');
const { body } = require('express-validator');
const { addGmail, getAllGmails, getGmailById, deleteGmail } = require('../controllers/gmailController');

const router = express.Router();

const gmailValidation = [
    body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Please provide a valid email address')
];

// POST - Add new Gmail
router.post('/', gmailValidation, addGmail);

// GET - Get Gmail by ID (must be before /:id route)
router.get('/all', getAllGmails);

// GET - Get Gmail by ID
router.get('/:id', getGmailById);

// DELETE - Delete Gmail
router.delete('/:id', deleteGmail);

module.exports = router;