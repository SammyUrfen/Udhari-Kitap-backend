# Deployment Guide - Render

This guide walks you through deploying the Udhari Kitab backend to Render.

---

## Prerequisites

- GitHub account with your repository pushed
- Render account (free tier available at https://render.com)
- MongoDB Atlas account (free tier at https://mongodb.com/atlas)
- Cloudinary account (free tier at https://cloudinary.com)

---

## Step 1: Prepare MongoDB Atlas

1. **Create MongoDB Atlas Account**
   - Go to https://www.mongodb.com/cloud/atlas/register
   - Sign up for free tier

2. **Create a New Cluster**
   - Click "Build a Database"
   - Choose "M0 FREE" tier
   - Select a cloud provider and region close to your Render deployment
   - Click "Create"

3. **Configure Database Access**
   - Go to "Database Access" in left sidebar
   - Click "Add New Database User"
   - Choose "Password" authentication
   - Username: `udhari-admin` (or your choice)
   - Generate a strong password and **SAVE IT**
   - Set privileges to "Read and write to any database"
   - Click "Add User"

4. **Configure Network Access**
   - Go to "Network Access" in left sidebar
   - Click "Add IP Address"
   - Click "Allow Access from Anywhere" (0.0.0.0/0)
   - Click "Confirm"

5. **Get Connection String**
   - Go to "Database" → Your Cluster → "Connect"
   - Choose "Connect your application"
   - Copy the connection string (looks like):
     ```
     mongodb+srv://udhari-admin:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
     ```
   - Replace `<password>` with your actual password
   - Add database name: `/udhari-kitab` after `.net/` and before `?`
   - Final: `mongodb+srv://udhari-admin:yourpassword@cluster0.xxxxx.mongodb.net/udhari-kitab?retryWrites=true&w=majority`
   - **SAVE THIS CONNECTION STRING**

---

## Step 2: Set Up Cloudinary

1. **Create Account**
   - Go to https://cloudinary.com/users/register_free
   - Sign up for free tier

2. **Get Credentials**
   - After login, go to Dashboard
   - You'll see:
     - Cloud Name
     - API Key
     - API Secret
   - **SAVE THESE CREDENTIALS**

---

## Step 3: Deploy to Render

### 3.1 Create Render Account

1. Go to https://render.com
2. Sign up (can use GitHub for easy integration)
3. Verify your email

### 3.2 Create Web Service

1. **Click "New +"** → "Web Service"

2. **Connect Repository**
   - If first time: Click "Connect GitHub" and authorize Render
   - Search for your `Udhari-Kitap-backend` repository
   - Click "Connect"

3. **Configure Service**

   **Basic Settings:**
   ```
   Name: udhari-kitab-backend
   Region: Choose closest to your users
   Branch: main
   Root Directory: (leave empty)
   Runtime: Node
   ```

   **Build & Deploy:**
   ```
   Build Command: npm install
   Start Command: npm start
   ```

   **Instance Type:**
   ```
   Free (or paid plan for production)
   ```

4. **Set Environment Variables**

   Click "Advanced" → "Add Environment Variable"
   
   Add these variables:

   ```env
   NODE_ENV=production
   
   PORT=5000
   
   MONGODB_URI=mongodb+srv://udhari-admin:yourpassword@cluster0.xxxxx.mongodb.net/udhari-kitab?retryWrites=true&w=majority
   
   JWT_SECRET=your-super-secret-jwt-key-at-least-32-characters-long-random-string
   
   JWT_EXPIRES_IN=7d
   
   CLOUDINARY_CLOUD_NAME=your-cloud-name
   
   CLOUDINARY_API_KEY=your-api-key
   CLOUDINARY_API_SECRET=your-api-secret
   ```

   **⚠️ Important:**
   - Generate a strong random string for `JWT_SECRET` (use password generator)
   - Use your actual MongoDB connection string
   - Use your actual Cloudinary credentials

5. **Create Web Service**
   - Click "Create Web Service"
   - Render will start deploying (takes 2-5 minutes)

### 3.3 Monitor Deployment

1. Watch the deployment logs in Render dashboard
2. Look for:
   ```
   ✓ Connected to MongoDB
   Server running on http://localhost:5000
   ```
3. Once deployed, you'll see status as "Live" with a green dot

### 3.4 Get Your API URL

After deployment, your API will be available at:
```
https://udhari-kitab-backend.onrender.com
```
(The exact URL will be shown in your Render dashboard)

---

## Step 4: Test Your Deployment

### 4.1 Health Check

```bash
curl https://your-app-name.onrender.com/api/health
```

Expected response:
```json
{
  "status": "OK",
  "timestamp": "2025-10-23T...",
  "uptime": 123.45
}
```

### 4.2 Database Connection Check

```bash
curl https://your-app-name.onrender.com/api/health/db
```

Expected response:
```json
{
  "status": "OK",
  "database": "connected",
  "timestamp": "2025-10-23T..."
}
```

### 4.3 Test Registration

```bash
curl -X POST https://your-app-name.onrender.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "password": "password123"
  }'
```

---

## Step 5: Configure for Frontend

Once deployed, save your API URL for frontend configuration:

```
API_URL=https://udhari-kitab-backend.onrender.com
```

You'll use this in your frontend environment variables.

---

## Common Issues & Solutions

### 1. Build Failed
**Issue:** "npm install failed"
- **Solution:** Check package.json is valid
- Ensure all dependencies are listed
- Check Node version compatibility

### 2. MongoDB Connection Failed
**Issue:** "MongoServerError: Authentication failed"
- **Solution:** 
  - Verify username/password in connection string
  - Check Network Access allows 0.0.0.0/0
  - Ensure password is URL-encoded (no special chars like @, :, /)

### 3. Application Not Starting
**Issue:** App crashes on start
- **Solution:** 
  - Check Render logs for error messages
  - Verify all environment variables are set
  - Ensure PORT is set to 5000
  - Check start command is `npm start`

### 4. CORS Errors from Frontend
**Issue:** "CORS policy blocked"
- **Solution:** Update `src/app.js` to allow your frontend domain:
  ```javascript
  app.use(cors({
    origin: ['https://your-frontend-domain.com', 'http://localhost:3000'],
    credentials: true
  }));
  ```
  - Redeploy after updating

### 5. Free Tier Sleep
**Issue:** First request slow (Render free tier sleeps after inactivity)
- **Solution:** 
  - Upgrade to paid plan for production
  - Or use a service like UptimeRobot to ping every 5 minutes

---

## Optional: Custom Domain

1. In Render dashboard, go to your service
2. Click "Settings" → "Custom Domain"
3. Click "Add Custom Domain"
4. Enter your domain (e.g., api.yourdomain.com)
5. Follow DNS configuration instructions
6. Render automatically provisions SSL certificate

---

## Monitoring & Maintenance

### View Logs
- Render Dashboard → Your Service → "Logs" tab
- Real-time log streaming
- Filter by error/warning levels

### Restart Service
- Render Dashboard → Your Service → "Manual Deploy" → "Clear build cache & deploy"

### Update Environment Variables
- Settings → Environment
- Add/Edit variables
- Service automatically redeploys

---

## Production Checklist

Before going live:

- [ ] Strong JWT_SECRET (32+ characters)
- [ ] MongoDB Atlas configured with proper access
- [ ] Cloudinary credentials set
- [ ] All environment variables set
- [ ] Health checks passing
- [ ] Test all API endpoints
- [ ] CORS configured for frontend domain
- [ ] SSL certificate active (automatic on Render)
- [ ] Error monitoring set up (optional: Sentry)
- [ ] Database backups configured (MongoDB Atlas)

---

## Costs (Free Tier Limitations)

**Render Free Tier:**
- 750 hours/month (enough for 1 service)
- Sleeps after 15 minutes of inactivity
- 512 MB RAM
- Shared CPU

**MongoDB Atlas Free Tier:**
- 512 MB storage
- Shared cluster
- No backup (manual export recommended)

**Cloudinary Free Tier:**
- 25 GB storage
- 25 GB bandwidth/month
- Should be sufficient for profile pictures

---

## Next Steps

1. ✅ Deploy backend to Render
2. ✅ Save API URL
3. ➡️ Move to frontend development
4. ➡️ Configure frontend to use deployed API
5. ➡️ Deploy frontend (Vercel/Netlify recommended)

---

## Support

- **Render Docs:** https://render.com/docs
- **MongoDB Atlas Docs:** https://docs.atlas.mongodb.com
- **Cloudinary Docs:** https://cloudinary.com/documentation

---

Your backend is now live! 🚀
Use the API URL in your frontend environment configuration.
