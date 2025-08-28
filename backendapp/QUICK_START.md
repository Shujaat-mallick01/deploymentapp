# 🚀 Quick Start Guide - Get Running in 5 Minutes!

## Step 1: Install Required Services

### 1.1 Install Ngrok (for webhooks)

**Windows (Easiest method):**
1. Download from: https://ngrok.com/download
2. Extract the zip file to a folder (e.g., `C:\ngrok`)
3. Add to PATH or run from that folder

**Alternative - Using Chocolatey:**
```bash
choco install ngrok
```

### 1.2 Install Redis (for build queue)

**Windows - Using Docker (Recommended):**
```bash
docker run -d -p 6379:6379 --name redis redis
```

**Alternative - WSL2:**
```bash
wsl
sudo apt update
sudo apt install redis-server
sudo service redis-server start
```

### 1.3 Install MongoDB

**Option 1: MongoDB Atlas (FREE Cloud - Recommended)**
1. Sign up at: https://www.mongodb.com/cloud/atlas
2. Create FREE M0 cluster
3. Get connection string
4. Update `.env`: `MONGODB_URI=mongodb+srv://...`

**Option 2: Local MongoDB**
Download from: https://www.mongodb.com/try/download/community

## Step 2: Start Ngrok and Get Your URL

### Method 1: Using Helper Script (Easiest)
```bash
cd deploymentapp/backendapp
node start-ngrok.js
```
The script will:
- Start ngrok
- Show you the URL
- Offer to update .env automatically

### Method 2: Manual Setup
```bash
# In terminal 1:
ngrok http 3000

# You'll see output like:
# Forwarding  https://abc123def456.ngrok-free.app -> http://localhost:3000
#             ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
#             Copy this HTTPS URL!
```

## Step 3: Update Your .env File

The `.env` file has been created with your GitHub credentials. You just need to:

1. Replace the ngrok URL:
```env
# Change this line:
WEBHOOK_URL=https://REPLACE-WITH-YOUR-NGROK-URL.ngrok-free.app/api/git/webhook

# To your actual ngrok URL:
WEBHOOK_URL=https://abc123def456.ngrok-free.app/api/git/webhook
```

2. If using MongoDB Atlas, update:
```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/deployment-platform
```

## Step 4: Start the Platform

### Terminal 1 - Keep Ngrok Running
```bash
ngrok http 3000
# Or: node start-ngrok.js
```

### Terminal 2 - Start Backend
```bash
cd deploymentapp/backendapp
npm start
```

### Terminal 3 - Start Frontend
```bash
cd deploymentapp/frontendapp
npm run dev
```

## Step 5: Access Your Platform

- **Frontend**: http://localhost:3001
- **Backend API**: http://localhost:3000/health
- **Ngrok Inspector**: http://127.0.0.1:4040

## Step 6: Configure GitHub Webhook (Optional)

1. Go to your GitHub repository
2. Settings → Webhooks → Add webhook
3. Configure:
   - **Payload URL**: Your ngrok URL from Step 2 + `/api/git/webhook`
   - **Content type**: `application/json`
   - **Secret**: `f7b8c5a3e9d4b8c3a2e1d5f8b9c4a7d3` (from .env)
   - **Events**: Just the push event

## 🎉 That's It! You're Running!

### Test the Platform:
1. Open http://localhost:3001
2. Click "Sign up" to create an account
3. Or use GitHub OAuth to login

### Monitor Activity:
- **Webhook requests**: http://127.0.0.1:4040
- **Backend logs**: Terminal 2
- **Frontend logs**: Terminal 3

## ⚠️ Important Notes

1. **Ngrok URL changes** every time you restart it (free plan)
   - Update `.env` when it changes
   - Update GitHub webhook URL

2. **Keep terminals open**:
   - Terminal 1: Ngrok
   - Terminal 2: Backend
   - Terminal 3: Frontend

3. **Minimal Setup** (if you just want to test):
   - You can skip Redis/MongoDB initially
   - The app will show errors but basic pages will work

## 🆘 Troubleshooting

### "ngrok: command not found"
→ Download from https://ngrok.com/download and add to PATH

### "Cannot connect to MongoDB"
→ Use MongoDB Atlas (free) or install local MongoDB

### "Redis connection failed"
→ Run: `docker run -d -p 6379:6379 redis`

### "Port 3000 already in use"
→ Stop other services or change PORT in .env

### Need Help?
Check the detailed guides:
- [Full Environment Setup](ENV_SETUP_GUIDE.md)
- [Ngrok Setup Guide](NGROK_SETUP.md)
- [Main README](../README.md)