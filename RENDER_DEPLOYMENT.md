# Render Deployment Guide

## 1. Prerequisites
- MongoDB Atlas account (free tier available)
- Cloudinary account
- Email service (Gmail with app password)
- GitHub repository

## 2. MongoDB Atlas Setup
1. Go to https://cloud.mongodb.com/
2. Create free cluster
3. Create database user
4. Add IP whitelist (0.0.0.0/0 for all IPs)
5. Get connection string

## 3. Deploy to Render
1. Connect GitHub repository to Render
2. Create new Web Service
3. Use these settings:
   - **Environment**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: Starter (or Pro for production)

## 4. Environment Variables in Render Dashboard
Set these in Render's Environment Variables section:

### Required Variables:
```
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/adminpanel?retryWrites=true&w=majority
JWT_SECRET=your-super-secure-jwt-secret-key-min-32-chars
ADMIN_PASSWORD=your-secure-admin-password
CLOUDINARY_API_SECRET=your-cloudinary-api-secret
RECAPTCHA_SECRET_KEY=your-recaptcha-secret-key
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-specific-password
```

## 5. Health Check
- Health check endpoint: `/health`
- Render will automatically monitor this endpoint

## 6. Domain Configuration
- Default domain: `your-app-name.onrender.com`
- Custom domain can be configured in Render dashboard

## 7. Scaling & Performance
- Render automatically handles scaling
- For high traffic, upgrade to Pro plan
- Monitor performance in Render dashboard

## 8. Logs & Monitoring
- View logs in Render dashboard
- Set up log alerts for errors
- Monitor memory and CPU usage

## 9. Deployment Process
1. Push code to GitHub
2. Render automatically detects changes
3. Builds and deploys automatically
4. Health check validates deployment

## 10. Troubleshooting
- Check logs in Render dashboard
- Verify environment variables
- Test MongoDB connection
- Validate Cloudinary configuration