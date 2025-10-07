const mongoose = require('mongoose');

const contactSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    // maxlength: [100, 'Name cannot exceed 100 characters'],
    // minlength: [2, 'Name must be at least 2 characters long']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email'],
    maxlength: [255, 'Email cannot exceed 255 characters']
  },
  phoneNumber: {
    type: String,
    required: [true, 'Phone number is required'],
    trim: true,
    match: [/^[\+]?[1-9][\d]{0,15}$/, 'Please enter a valid phone number'],
    maxlength: [20, 'Phone number cannot exceed 20 characters']
  },
  productQuestion: {
    type: String,
    required: [true, 'Product question is required'],
    enum: {
      values: [
        'General Inquiry',
        'Product Information',
        'Technical Support',
        'Pricing',
        'Custom Solution',
        'Partnership',
        'Other'
      ],
      message: 'Please select a valid product question category'
    }
  },
  message: {
    type: String,
    required: [true, 'Message is required'],
    trim: true,
    maxlength: [1000, 'Message cannot exceed 1000 characters'],
  },
  status: {
    type: String,
    enum: ['pending', 'in-progress', 'resolved', 'closed'],
    default: 'pending'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    default: null
  },
  notes: [{
    content: {
      type: String,
      required: true,
      maxlength: [500, 'Note cannot exceed 500 characters']
    },
    addedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
      required: true
    },
    addedAt: {
      type: Date,
      default: Date.now
    }
  }],
  source: {
    type: String,
    enum: ['website', 'api', 'mobile-app'],
    default: 'website'
  },
  ipAddress: {
    type: String,
    default: null
  },
  userAgent: {
    type: String,
    default: null
  },
  isRead: {
    type: Boolean,
    default: false
  },
  readAt: {
    type: Date,
    default: null
  },
  readBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

contactSchema.index({ email: 1 });
contactSchema.index({ status: 1 });
contactSchema.index({ priority: 1 });
contactSchema.index({ createdAt: -1 });
contactSchema.index({ assignedTo: 1 });
contactSchema.index({ isRead: 1 });

contactSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

contactSchema.virtual('fullContactInfo').get(function() {
  return `${this.name} (${this.email}) - ${this.phoneNumber}`;
});

contactSchema.methods.markAsRead = function(adminId) {
  this.isRead = true;
  this.readAt = new Date();
  this.readBy = adminId;
  return this.save();
};

contactSchema.methods.addNote = function(content, adminId) {
  this.notes.push({
    content,
    addedBy: adminId,
    addedAt: new Date()
  });
  return this.save();
};

contactSchema.statics.getStats = async function() {
  const stats = await this.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);
  
  const priorityStats = await this.aggregate([
    {
      $group: {
        _id: '$priority',
        count: { $sum: 1 }
      }
    }
  ]);

  const totalContacts = await this.countDocuments();
  const unreadContacts = await this.countDocuments({ isRead: false });
  
  return {
    total: totalContacts,
    unread: unreadContacts,
    byStatus: stats,
    byPriority: priorityStats
  };
};

module.exports = mongoose.model('Contact', contactSchema);