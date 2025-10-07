db = db.getSiblingDB('contact_form_db');

db.createUser({
  user: 'app_user',
  pwd: 'app_password_123',
  roles: [
    {
      role: 'readWrite',
      db: 'contact_form_db'
    }
  ]
});

db.contacts.createIndex({ "email": 1 });
db.contacts.createIndex({ "status": 1 });
db.contacts.createIndex({ "createdAt": -1 });
db.contacts.createIndex({ "isRead": 1 });

db.admins.createIndex({ "email": 1 }, { unique: true });

db.categories.createIndex({ "name": 1 });
db.categories.createIndex({ "slug": 1 }, { unique: true });
db.categories.createIndex({ "isActive": 1 });

db.blogs.createIndex({ "title": "text", "excerpt": "text", "tags": "text" });
db.blogs.createIndex({ "status": 1 });
db.blogs.createIndex({ "category": 1 });
db.blogs.createIndex({ "publishedAt": -1 });
db.blogs.createIndex({ "slug": 1 }, { unique: true });

print("Database initialization completed successfully!");