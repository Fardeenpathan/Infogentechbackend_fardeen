const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Admin = require('../models/Admin');

dotenv.config();

const createDefaultAdmin = async () => {
  try {

    console.log('Connecting to MongoDB...', 'mongodb+srv://infogentech99:Infogentech%402025@crm-inhouse.itngqaz.mongodb.net/admin_dashboard?retryWrites=true&w=majority');
    await mongoose.connect('mongodb+srv://infogentech99:Infogentech%402025@crm-inhouse.itngqaz.mongodb.net/admin_dashboard?retryWrites=true&w=majority', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    // console.log('Connected to MongoDB');

    // Check if admin already exists
    const existingAdmin = await Admin.findOne({ email: 'admin@yourcompany.com' });
    
    if (existingAdmin) {
      console.log('Default admin already exists');
      process.exit(0);
    }

    const admin = await Admin.create({
      name: 'Super Admin',
      email: 'admin@yourcompany.com',
      password: 'admin123',
      role: 'super-admin'
    });

    // console.log('Default admin created successfully:');
    // console.log(`Email: ${admin.email}`);
    // console.log(`Password: ${process.env.ADMIN_PASSWORD}`);
    // console.log('\n⚠️  Please change the default password after first login!');

    process.exit(0);
  } catch (error) {
    console.error('Error creating default admin:', error);
    process.exit(1);
  }
};

createDefaultAdmin();