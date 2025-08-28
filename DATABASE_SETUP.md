# Database Setup Guide

This guide will help you set up MongoDB and Redis for the Deployment Platform.

## Prerequisites

- **MongoDB**: Required for storing application data
- **Redis**: Required for build queue and caching
- **Ngrok**: Required for exposing local server to GitHub webhooks

## Option 1: Quick Setup (Recommended for Development)

### MongoDB Atlas (Free Cloud Option)

1. **Create MongoDB Atlas Account**
   - Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
   - Sign up for a free account
   - Create a free M0 cluster

2. **Get Connection String**
   - Click "Connect" on your cluster
   - Choose "Connect your application"
   - Copy the connection string
   - Replace `<password>` with your database user password
   - Update `MONGODB_URI` in `backendapp/.env`

### Redis Cloud (Free Option)

1. **Create Redis Cloud Account**
   - Go to [Redis Cloud](https://redis.com/try-free/)
   - Sign up for a free account
   - Create a free database

2. **Get Connection Details**
   - Copy the endpoint (host:port)
   - Copy the password
   - Update in `backendapp/.env`:
     ```
     REDIS_HOST=your-redis-endpoint.com
     REDIS_PORT=port-number
     ```

## Option 2: Local Installation

### Windows

#### MongoDB
```powershell
# Using Chocolatey
choco install mongodb

# Or download from: https://www.mongodb.com/try/download/community
# Install MongoDB as Windows Service
```

#### Redis (via WSL2)
```bash
# Install WSL2 first
wsl --install

# In WSL2 terminal:
sudo apt update
sudo apt install redis-server
sudo service redis-server start
```

### macOS

#### MongoDB
```bash
# Using Homebrew
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community
```

#### Redis
```bash
brew install redis
brew services start redis
```

### Linux (Ubuntu/Debian)

#### MongoDB
```bash
# Import MongoDB public key
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -

# Create list file
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list

# Install MongoDB
sudo apt-get update
sudo apt-get install -y mongodb-org

# Start MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod
```

#### Redis
```bash
sudo apt update
sudo apt install redis-server
sudo systemctl start redis-server
sudo systemctl enable redis-server
```

## Verification

### Test MongoDB Connection
```bash
# If using local MongoDB
mongosh mongodb://localhost:27017/deployment-platform

# If using MongoDB Atlas
mongosh "your-atlas-connection-string"
```

### Test Redis Connection
```bash
redis-cli ping
# Should return: PONG
```

## Setting up Ngrok

1. **Install Ngrok**
   - Download from [ngrok.com](https://ngrok.com/download)
   - Or use package manager:
     ```bash
     # Windows (Chocolatey)
     choco install ngrok
     
     # macOS (Homebrew)
     brew install ngrok/ngrok/ngrok
     
     # Linux
     snap install ngrok
     ```

2. **Run the Setup Script**
   ```powershell
   # Windows PowerShell
   .\setup-ngrok.ps1
   ```

3. **Manual Setup (Alternative)**
   ```bash
   # Start ngrok tunnel
   ngrok http 3000
   
   # Copy the HTTPS URL and update .env:
   # WEBHOOK_URL=https://your-ngrok-url.ngrok-free.app/api/git/webhook
   ```

## Environment Variables

Ensure your `backendapp/.env` file has these configurations:

```env
# MongoDB (choose one)
MONGODB_URI=mongodb://localhost:27017/deployment-platform  # Local
# OR
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/deployment-platform  # Atlas

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Ngrok URLs (updated by setup-ngrok.ps1)
WEBHOOK_URL=https://your-ngrok-url.ngrok-free.app/api/git/webhook
GITHUB_CALLBACK_URL=https://your-ngrok-url.ngrok-free.app/api/auth/github/callback
```

## Troubleshooting

### MongoDB Connection Issues
- Check if MongoDB service is running
- Verify connection string format
- Check firewall/network settings
- For Atlas: whitelist your IP address

### Redis Connection Issues
- Check if Redis service is running
- Verify port 6379 is not blocked
- Check Redis logs: `redis-cli monitor`

### Ngrok Issues
- Ensure ngrok is authenticated (free account required)
- Check if port 3000 is available
- Restart ngrok if tunnel expires

## Starting the Platform

After database setup:

1. **Start Backend**
   ```bash
   cd backendapp
   npm install
   npm start
   ```

2. **Start Frontend**
   ```bash
   cd frontendapp
   npm install
   npm run dev
   ```

3. **Run Ngrok Setup**
   ```powershell
   .\setup-ngrok.ps1
   ```

The platform will be available at:
- Frontend: http://localhost:3001
- Backend API: http://localhost:3000 (or ngrok URL)
- Ngrok Dashboard: http://localhost:4040