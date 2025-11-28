const Gmail = require('../models/Gmail');

// @desc    Add a new Gmail address
// @route   POST /api/gmails
// @access  Public
const addGmail = async (req, res, next) => {
  try {
    const { email } = req.body; 
    const newGmail = new Gmail({ email });
    await newGmail.save();
    res.status(201).json({
        success: true,
        message: 'Gmail address added successfully',
        data: newGmail
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Gmail address already exists'
      });
    }
    next(error);
  }
};

// @desc    Get all Gmail addresses
// @route   GET /api/gmails/all
// @access  Public
const getAllGmails = async (req, res, next) => {
  try {
    const gmails = await Gmail.find().sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      count: gmails.length,
      data: gmails
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get a single Gmail by ID
// @route   GET /api/gmails/:id
// @access  Public
const getGmailById = async (req, res, next) => {
  try {
    const gmail = await Gmail.findById(req.params.id);
    if (!gmail) {
      return res.status(404).json({
        success: false,
        message: 'Gmail address not found'
      });
    }
    res.status(200).json({
      success: true,
      data: gmail
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a Gmail address
// @route   DELETE /api/gmails/:id
// @access  Public
const deleteGmail = async (req, res, next) => {
  try {
    const gmail = await Gmail.findByIdAndDelete(req.params.id);
    if (!gmail) {
      return res.status(404).json({
        success: false,
        message: 'Gmail address not found'
      });
    }
    res.status(200).json({
      success: true,
      message: 'Gmail address deleted successfully',
      data: gmail
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  addGmail,
  getAllGmails,
  getGmailById,
  deleteGmail
};