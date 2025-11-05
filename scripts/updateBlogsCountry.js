const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Blog = require('../models/Blog');

dotenv.config();

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/contact_form_db';

const updateBlogsCountry = async () => {
  try {
    console.log(' Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB successfully');

    // Get all blogs that don't have country field or have default values
    const blogsToUpdate = await Blog.find({
      $or: [
        { country: { $exists: false } },
        { country: 'global' },
        { region: { $exists: false } },
        { region: 'global' }
      ]
    });

    // console.log(` Found ${blogsToUpdate.length} blogs to update`);

    if (blogsToUpdate.length === 0) {
      console.log(' No blogs need updating. All blogs already have proper country/region set.');
      process.exit(0);
    }

    console.log('\n Blogs that will be updated:');
    blogsToUpdate.forEach((blog, index) => {
      console.log(`${index + 1}. "${blog.title}" (ID: ${blog._id})`);
      console.log(`   Current: country="${blog.country || 'undefined'}", region="${blog.region || 'undefined'}"`);
    });


 
    // console.log('\n Proceeding with update...');

    // Update all blogs to India
    const updateResult = await Blog.updateMany(
      {
        $or: [
          { country: { $exists: false } },
          { country: 'global' },
          { region: { $exists: false } },
          { region: 'global' }
        ]
      },
      {
        $set: {
          country: 'in',
          region: 'asia',
          updatedAt: new Date()
        }
      }
    );

    console.log(`✅ Successfully updated ${updateResult.modifiedCount} blogs`);

    const verificationBlogs = await Blog.find({ country: 'in', region: 'asia' });
    console.log(`\n🔍 Verification: Found ${verificationBlogs.length} blogs with country="in" and region="asia"`);

    // console.log('\n📋 Sample of updated blogs:');
    const sampleBlogs = verificationBlogs.slice(0, 5);
    sampleBlogs.forEach((blog, index) => {
      console.log(`${index + 1}. "${blog.title}"`);
      console.log(`   Updated: country="${blog.country}", region="${blog.region}"`);
    });

    if (verificationBlogs.length > 5) {
      console.log(`   ... and ${verificationBlogs.length - 5} more blogs`);
    }

    // console.log('\n Blog country update completed successfully!');
    // console.log('\n Now you can test with:');
    // console.log('   - Get India blogs: curl "http://localhost:5000/api/blogs?country=in"');
    // console.log('   - Get Asia blogs: curl "http://localhost:5000/api/blogs?region=asia"');
    // console.log('   - Get global blogs: curl "http://localhost:5000/api/blogs?country=global"');

  } catch (error) {
    console.error(' Error updating blogs country:', error);
    
    if (error.code === 'ENOTFOUND' || error.name === 'MongoNetworkError') {
      console.log('\n Connection failed. Make sure:');
      console.log('   1. MongoDB is running');
      console.log('   2. MONGODB_URI in .env is correct');
      console.log('   3. Database name matches your setup');
    }
  } finally {
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
      console.log(' Database connection closed');
    }
    process.exit(0);
  }
};

const updateToSpecificCountry = async (targetCountry = 'in', targetRegion = 'asia') => {
  try {
    // console.log(` Updating blogs to country: ${targetCountry}, region: ${targetRegion}`);
    
    await mongoose.connect(MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    const updateResult = await Blog.updateMany(
      { country: { $in: ['global', null, undefined] } },
      {
        $set: {
          country: targetCountry,
          region: targetRegion,
          updatedAt: new Date()
        }
      }
    );

    // console.log(` Updated ${updateResult.modifiedCount} blogs to ${targetCountry}`);
    
  } catch (error) {
    console.error(' Error:', error);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
};

const args = process.argv.slice(2);
if (args.length >= 2) {
  const [country, region] = args;
  console.log(` Custom update: Setting blogs to country="${country}" and region="${region}"`);
  updateToSpecificCountry(country, region);
} else if (args.length === 1) {
  const country = args[0];
  const regionMap = {
    'us': 'north-america',
    'in': 'asia', 
    'uk': 'europe',
    'ca': 'north-america',
    'au': 'oceania',
    'de': 'europe',
    'fr': 'europe',
    'es': 'europe',
    'it': 'europe',
    'jp': 'asia',
    'br': 'south-america'
  };
  
  const region = regionMap[country] || 'global';
  console.log(` Auto-detected region "${region}" for country "${country}"`);
  updateToSpecificCountry(country, region);
} else {
  // Default: update to India
  updateBlogsCountry();
}