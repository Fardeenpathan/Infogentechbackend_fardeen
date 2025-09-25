const Contact = require('../models/Contact');
const Admin = require('../models/Admin');

// @desc    Get all contacts with pagination and filtering
// @route   GET /api/admin/contacts
// @access  Private
const getContacts = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;

    let query = {};

    if (req.query.status) {
      query.status = req.query.status;
    }
    
    if (req.query.priority) {
      query.priority = req.query.priority;
    }
    
    if (req.query.productQuestion) {
      query.productQuestion = req.query.productQuestion;
    }
    
    if (req.query.assignedTo) {
      query.assignedTo = req.query.assignedTo;
    }
    
    if (req.query.isRead !== undefined) {
      query.isRead = req.query.isRead === 'true';
    }

    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search, 'i');
      query.$or = [
        { name: searchRegex },
        { email: searchRegex },
        { phoneNumber: searchRegex },
        { message: searchRegex }
      ];
    }

    if (req.query.startDate || req.query.endDate) {
      query.createdAt = {};
      if (req.query.startDate) {
        query.createdAt.$gte = new Date(req.query.startDate);
      }
      if (req.query.endDate) {
        query.createdAt.$lte = new Date(req.query.endDate);
      }
    }

    let sort = {};
    if (req.query.sortBy) {
      const parts = req.query.sortBy.split(':');
      sort[parts[0]] = parts[1] === 'desc' ? -1 : 1;
    } else {
      sort = { createdAt: -1 };
    }

    const contacts = await Contact.find(query)
      .populate('assignedTo', 'name email')
      .populate('readBy', 'name email')
      .populate('notes.addedBy', 'name email')
      .sort(sort)
      .limit(limit * 1)
      .skip(startIndex);

    const total = await Contact.countDocuments(query);

    const pagination = {};

    if (startIndex + limit < total) {
      pagination.next = {
        page: page + 1,
        limit
      };
    }

    if (startIndex > 0) {
      pagination.prev = {
        page: page - 1,
        limit
      };
    }

    res.status(200).json({
      success: true,
      count: contacts.length,
      pagination,
      total,
      data: contacts
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single contact
// @route   GET /api/admin/contacts/:id
// @access  Private
const getContact = async (req, res, next) => {
  try {
    const contact = await Contact.findById(req.params.id)
      .populate('assignedTo', 'name email role')
      .populate('readBy', 'name email')
      .populate('notes.addedBy', 'name email');

    if (!contact) {
      return res.status(404).json({
        success: false,
        message: 'Contact not found'
      });
    }

    if (!contact.isRead) {
      await contact.markAsRead(req.admin.id);
    }

    res.status(200).json({
      success: true,
      data: contact
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update contact
// @route   PUT /api/admin/contacts/:id
// @access  Private
const updateContact = async (req, res, next) => {
  try {
    const allowedFields = ['status', 'priority', 'assignedTo'];
    const updateData = {};

    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    });

    const contact = await Contact.findByIdAndUpdate(
      req.params.id,
      updateData,
      {
        new: true,
        runValidators: true
      }
    ).populate('assignedTo', 'name email');

    if (!contact) {
      return res.status(404).json({
        success: false,
        message: 'Contact not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Contact updated successfully',
      data: contact
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete contact
// @route   DELETE /api/admin/contacts/:id
// @access  Private (Super Admin only)
const deleteContact = async (req, res, next) => {
  try {
    const contact = await Contact.findById(req.params.id);

    if (!contact) {
      return res.status(404).json({
        success: false,
        message: 'Contact not found'
      });
    }

    await Contact.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Contact deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Add note to contact
// @route   POST /api/admin/contacts/:id/notes
// @access  Private
const addNote = async (req, res, next) => {
  try {
    const { content } = req.body;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Note content is required'
      });
    }

    const contact = await Contact.findById(req.params.id);

    if (!contact) {
      return res.status(404).json({
        success: false,
        message: 'Contact not found'
      });
    }

    await contact.addNote(content.trim(), req.admin.id);

    const updatedContact = await Contact.findById(req.params.id)
      .populate('notes.addedBy', 'name email');

    res.status(201).json({
      success: true,
      message: 'Note added successfully',
      data: updatedContact
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get contact statistics
// @route   GET /api/admin/contacts/stats
// @access  Private
const getContactStats = async (req, res, next) => {
  try {
    const stats = await Contact.getStats();

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const todayContacts = await Contact.countDocuments({
      createdAt: { $gte: todayStart, $lte: todayEnd }
    });

    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - 7);
    
    const weekContacts = await Contact.countDocuments({
      createdAt: { $gte: weekStart }
    });

    const monthStart = new Date();
    monthStart.setDate(monthStart.getDate() - 30);
    
    const monthContacts = await Contact.countDocuments({
      createdAt: { $gte: monthStart }
    });

    const avgResponseTime = await Contact.aggregate([
      {
        $match: { 
          status: { $in: ['resolved', 'closed'] },
          updatedAt: { $gt: '$createdAt' }
        }
      },
      {
        $project: {
          responseTime: { $subtract: ['$updatedAt', '$createdAt'] }
        }
      },
      {
        $group: {
          _id: null,
          avgResponseTime: { $avg: '$responseTime' }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      data: {
        ...stats,
        today: todayContacts,
        thisWeek: weekContacts,
        thisMonth: monthContacts,
        avgResponseTimeMs: avgResponseTime.length > 0 ? avgResponseTime[0].avgResponseTime : 0
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Export contacts
// @route   GET /api/admin/contacts/export
// @access  Private
const exportContacts = async (req, res, next) => {
  try {
    let query = {};
    
    if (req.query.status) query.status = req.query.status;
    if (req.query.priority) query.priority = req.query.priority;
    if (req.query.startDate || req.query.endDate) {
      query.createdAt = {};
      if (req.query.startDate) query.createdAt.$gte = new Date(req.query.startDate);
      if (req.query.endDate) query.createdAt.$lte = new Date(req.query.endDate);
    }

    const contacts = await Contact.find(query)
      .populate('assignedTo', 'name email')
      .sort({ createdAt: -1 });

    const csvData = contacts.map(contact => ({
    //   id: contact._id,
      name: contact.name,
      email: contact.email,
      phoneNumber: contact.phoneNumber,
      productQuestion: contact.productQuestion,
      message: contact.message,
      status: contact.status,
      priority: contact.priority,
      assignedTo: contact.assignedTo ? contact.assignedTo.name : '',
      isRead: contact.isRead,
      source: contact.source,
      createdAt: contact.createdAt.toISOString(),
      updatedAt: contact.updatedAt.toISOString()
    }));

    res.status(200).json({
      success: true,
      message: 'Contacts exported successfully',
      count: csvData.length,
      data: csvData
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getContacts,
  getContact,
  updateContact,
  deleteContact,
  addNote,
  getContactStats,
  exportContacts
};