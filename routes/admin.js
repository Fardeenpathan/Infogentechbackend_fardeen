const express = require('express');
const { body } = require('express-validator');
const {
  getContacts,
  getContact,
  updateContact,
  deleteContact,
  addNote,
  getContactStats,
  exportContacts
} = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validation');

const router = express.Router();

router.use(protect);

const updateContactValidation = [
  body('status')
    .optional()
    .isIn(['pending', 'in-progress', 'resolved', 'closed'])
    .withMessage('Status must be one of: pending, in-progress, resolved, closed'),
  
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high', 'urgent'])
    .withMessage('Priority must be one of: low, medium, high, urgent'),
  
  body('assignedTo')
    .optional()
    .isMongoId()
    .withMessage('Assigned to must be a valid admin ID')
];

const addNoteValidation = [
  body('content')
    .trim()
    .isLength({ min: 1, max: 500 })
    .withMessage('Note content must be between 1 and 500 characters')
];

// Routes
router.get('/contacts/stats', getContactStats);
router.get('/contacts/export', exportContacts);
router.get('/contacts', getContacts);
router.get('/contacts/:id', getContact);
router.put('/contacts/:id', updateContactValidation, validate, updateContact);
router.delete('/contacts/:id', authorize('super-admin'), deleteContact);
router.post('/contacts/:id/notes', addNoteValidation, validate, addNote);

module.exports = router;