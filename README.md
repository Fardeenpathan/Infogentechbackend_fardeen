# Contact Form Backend API

A complete Node.js backend API for contact form submissions with admin panel functionality, built with Express, MongoDB, and JWT authentication.

## Features

- ✅ Contact form submission with validation
- ✅ Email notifications (admin & user confirmation)
- ✅ JWT-based admin authentication
- ✅ Complete admin CRUD operations
- ✅ Advanced pagination and filtering
- ✅ Search functionality
- ✅ Rate limiting and security
- ✅ Contact statistics and analytics
- ✅ Export functionality
- ✅ Notes system for contacts
- ✅ Role-based access control

## Quick Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Environment setup:**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Start MongoDB:**
   ```bash
   # Using local MongoDB
   mongod
   
   # Or using MongoDB Atlas (update MONGODB_URI in .env)
   ```

4. **Run the application:**
   ```bash
   # Development
   npm run dev
   
   # Production
   npm start
   ```

## Environment Variables

```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/contact_form_db
JWT_SECRET=your_super_secret_jwt_key_here
JWT_EXPIRE=30d
ADMIN_EMAIL=admin@yourcompany.com
ADMIN_PASSWORD=admin123

# Email configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
EMAIL_FROM=noreply@yourcompany.com

# Rate limiting
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX=100

# CORS
CORS_ORIGIN=http://localhost:3000
```

## API Endpoints

### Public Endpoints

#### Contact Form Submission
```http
POST /api/contact
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "phoneNumber": "+1234567890",
  "productQuestion": "General Inquiry",
  "message": "Hello, I'm interested in your services."
}
```

**Response:**
```json
{
  "success": true,
  "message": "Contact form submitted successfully. We will get back to you soon!",
  "data": {
    "id": "contact_id",
    "name": "John Doe",
    "email": "john@example.com",
    "productQuestion": "General Inquiry",
    "status": "pending",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### Authentication Endpoints

#### Admin Registration (Initial Setup)
```http
POST /api/auth/register
Content-Type: application/json

{
  "name": "Admin User",
  "email": "admin@example.com",
  "password": "SecurePass123",
  "role": "admin"
}
```

#### Admin Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "admin@example.com",
  "password": "SecurePass123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "token": "jwt_token_here",
  "data": {
    "id": "admin_id",
    "name": "Admin User",
    "email": "admin@example.com",
    "role": "admin",
    "isActive": true,
    "lastLogin": "2024-01-01T00:00:00.000Z"
  }
}
```

#### Get Current Admin
```http
GET /api/auth/me
Authorization: Bearer {token}
```

#### Update Password
```http
PUT /api/auth/updatepassword
Authorization: Bearer {token}
Content-Type: application/json

{
  "currentPassword": "OldPass123",
  "newPassword": "NewPass123"
}
```

### Admin Endpoints (Protected)

#### Get All Contacts (with Pagination & Filtering)
```http
GET /api/admin/contacts?page=1&limit=10&status=pending&search=john
Authorization: Bearer {token}
```

**Query Parameters:**
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 10)
- `status` - Filter by status: pending, in-progress, resolved, closed
- `priority` - Filter by priority: low, medium, high, urgent
- `productQuestion` - Filter by product question category
- `assignedTo` - Filter by assigned admin ID
- `isRead` - Filter by read status: true, false
- `search` - Search in name, email, phone, message
- `startDate` - Filter from date (YYYY-MM-DD)
- `endDate` - Filter to date (YYYY-MM-DD)
- `sortBy` - Sort field:direction (e.g., createdAt:desc)

**Response:**
```json
{
  "success": true,
  "count": 10,
  "total": 150,
  "pagination": {
    "next": {
      "page": 2,
      "limit": 10
    }
  },
  "data": [
    {
      "id": "contact_id",
      "name": "John Doe",
      "email": "john@example.com",
      "phoneNumber": "+1234567890",
      "productQuestion": "General Inquiry",
      "message": "Hello, I'm interested...",
      "status": "pending",
      "priority": "medium",
      "isRead": false,
      "assignedTo": null,
      "source": "website",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

#### Get Single Contact
```http
GET /api/admin/contacts/{id}
Authorization: Bearer {token}
```

#### Update Contact
```http
PUT /api/admin/contacts/{id}
Authorization: Bearer {token}
Content-Type: application/json

{
  "status": "in-progress",
  "priority": "high",
  "assignedTo": "admin_id"
}
```

#### Delete Contact (Super Admin Only)
```http
DELETE /api/admin/contacts/{id}
Authorization: Bearer {token}
```

#### Add Note to Contact
```http
POST /api/admin/contacts/{id}/notes
Authorization: Bearer {token}
Content-Type: application/json

{
  "content": "Contacted customer via phone. Follow up required."
}
```

#### Get Contact Statistics
```http
GET /api/admin/contacts/stats
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "total": 150,
    "unread": 45,
    "today": 12,
    "thisWeek": 67,
    "thisMonth": 150,
    "byStatus": [
      { "_id": "pending", "count": 45 },
      { "_id": "in-progress", "count": 30 },
      { "_id": "resolved", "count": 50 },
      { "_id": "closed", "count": 25 }
    ],
    "byPriority": [
      { "_id": "low", "count": 30 },
      { "_id": "medium", "count": 80 },
      { "_id": "high", "count": 30 },
      { "_id": "urgent", "count": 10 }
    ],
    "avgResponseTimeMs": 86400000
  }
}
```

#### Export Contacts
```http
GET /api/admin/contacts/export?status=pending&startDate=2024-01-01
Authorization: Bearer {token}
```

## Data Models

### Contact Model
```javascript
{
  name: String (required, 2-100 chars),
  email: String (required, valid email),
  phoneNumber: String (required, valid format),
  productQuestion: String (required, enum),
  message: String (required, 10-1000 chars),
  status: String (enum: pending, in-progress, resolved, closed),
  priority: String (enum: low, medium, high, urgent),
  assignedTo: ObjectId (ref: Admin),
  notes: [{
    content: String (required),
    addedBy: ObjectId (ref: Admin),
    addedAt: Date
  }],
  source: String (enum: website, api, mobile-app),
  ipAddress: String,
  userAgent: String,
  isRead: Boolean,
  readAt: Date,
  readBy: ObjectId (ref: Admin),
  createdAt: Date,
  updatedAt: Date
}
```

### Admin Model
```javascript
{
  email: String (required, unique),
  password: String (required, hashed),
  name: String (required),
  role: String (enum: admin, super-admin),
  isActive: Boolean,
  lastLogin: Date,
  createdAt: Date,
  updatedAt: Date
}
```

## Product Question Categories

- General Inquiry
- Product Information
- Technical Support
- Pricing
- Custom Solution
- Partnership
- Other

## Security Features

- JWT authentication with secure cookies
- Password hashing with bcrypt
- Rate limiting (5 requests/15min for auth, 5/hour for contact form)
- Input validation and sanitization
- XSS protection
- NoSQL injection prevention
- CORS configuration
- Helmet security headers

## Rate Limits

- **General API**: 100 requests per 15 minutes
- **Authentication**: 5 requests per 15 minutes
- **Contact Form**: 5 submissions per hour

## Error Handling

All errors return consistent JSON format:
```json
{
  "success": false,
  "message": "Error description",
  "errors": {
    "field": "Specific field error"
  }
}
```

## Health Check

```http
GET /health
```

Returns server status and uptime information.

## Development

```bash
# Install dependencies
npm install

# Run in development mode (with nodemon)
npm run dev

# Run tests
npm test

# Production mode
npm start
```

## Deployment

### For Vercel (Serverless Functions)
1. Convert routes to serverless functions
2. Use Vercel's MongoDB integration
3. Set environment variables in Vercel dashboard

### For Traditional Hosting
1. Set up MongoDB instance
2. Configure environment variables
3. Use PM2 for process management

## License

MIT License

---

**Note**: Make sure to change the JWT_SECRET and admin credentials in production!