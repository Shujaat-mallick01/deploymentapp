# Deployment Platform

A web deployment platform similar to Vercel/Netlify built with Node.js and React.

## 🚀 Quick Start

### Prerequisites

- Node.js (v16 or higher)
- MongoDB (local or MongoDB Atlas)
- Redis (local or Docker)
- ngrok (for webhooks in development)

### Installation

1. **Clone the repository**
```bash
git clone <your-repo-url>
cd deployment-platform
```

2. **Install dependencies**

Backend:
```bash
cd deploymentapp/backendapp
npm install
```

Frontend:
```bash
cd ../frontendapp
npm install
```

### Configuration

1. **Setup environment variables**

```bash
cd deploymentapp/backendapp
cp .env.example .env
```

2. **Update `.env` file**

Essential variables to configure:
- `JWT_SECRET` - Generate with: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`
- `MONGODB_URI` - Your MongoDB connection string
- `GITHUB_CLIENT_ID` & `GITHUB_CLIENT_SECRET` - From GitHub OAuth App

See `ENV_SETUP_GUIDE.md` for detailed instructions on obtaining all keys.

### Running the Application

#### Option 1: With Ngrok (Recommended for webhook testing)

1. **Start ngrok helper**
```bash
cd deploymentapp/backendapp
node start-ngrok.js
```
This will:
- Start ngrok tunnel
- Show you the public URL
- Optionally update your .env file

2. **Start the backend** (in a new terminal)
```bash
cd deploymentapp/backendapp
npm start
```

3. **Start the frontend** (in another terminal)
```bash
cd deploymentapp/frontendapp
npm run dev
```

4. **Access the application**
- Frontend: http://localhost:3001
- Backend API: http://localhost:3000
- Ngrok Inspector: http://127.0.0.1:4040

#### Option 2: Without Ngrok (No webhook support)

Terminal 1 - Backend:
```bash
cd deploymentapp/backendapp
npm start
```

Terminal 2 - Frontend:
```bash
cd deploymentapp/frontendapp
npm run dev
```

## 📦 Services Setup

### MongoDB

**Option 1: MongoDB Atlas (Free Cloud)**
1. Sign up at: https://www.mongodb.com/cloud/atlas
2. Create a free M0 cluster
3. Get connection string and add to `.env`

**Option 2: Local MongoDB**
```bash
# Windows: Download installer from MongoDB website
# Mac: brew install mongodb-community
# Linux: sudo apt install mongodb

# Start MongoDB
mongod
```

### Redis

**Option 1: Docker (Easiest)**
```bash
docker run -d -p 6379:6379 redis
```

**Option 2: Local Installation**
```bash
# Windows: Use WSL2 or download from GitHub
# Mac: brew install redis
# Linux: sudo apt install redis-server

# Start Redis
redis-server
```

### Ngrok

**Installation:**
```bash
# Windows: Download from https://ngrok.com/download
# Mac: brew install ngrok
# Linux: sudo snap install ngrok
```

**Setup (Optional - for better limits):**
```bash
# Sign up at https://dashboard.ngrok.com/signup
# Get auth token and configure
ngrok config add-authtoken YOUR_AUTH_TOKEN
```

## 🔧 GitHub Integration

### OAuth Setup

1. Go to: https://github.com/settings/developers
2. Click "New OAuth App"
3. Fill in:
   - Application name: `Deployment Platform Dev`
   - Homepage URL: `http://localhost:3001`
   - Callback URL: `http://localhost:3000/api/auth/github/callback`
4. Copy Client ID and Client Secret to `.env`

### Webhook Setup

1. Run ngrok: `ngrok http 3000` or `node start-ngrok.js`
2. Copy the HTTPS URL (e.g., `https://abc123.ngrok-free.app`)
3. Go to your GitHub repo → Settings → Webhooks
4. Add webhook:
   - Payload URL: `https://abc123.ngrok-free.app/api/git/webhook`
   - Content type: `application/json`
   - Secret: Your `WEBHOOK_SECRET` from `.env`
   - Events: Just the push event

## 🏗️ Architecture

### Backend Services
- **Authentication Service** - JWT & OAuth2
- **Git Integration** - Repository webhooks
- **Build Service** - Project detection and builds
- **Deployment Service** - Static/container deployments
- **Domain Service** - Custom domains & SSL
- **Monitoring Service** - Metrics and logging

### Frontend
- React with TypeScript
- Vite for fast development
- Tailwind CSS + shadcn/ui
- Protected routes with JWT

## 📝 Available Scripts

### Backend
- `npm start` - Start production server
- `npm run dev` - Start with nodemon (auto-reload)
- `npm run ngrok` - Start ngrok tunnel

### Frontend
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build

## 🛠️ Development Tips

### Using Ngrok

1. **Automatic setup**: Run `node start-ngrok.js` in backend
2. **Manual setup**: Run `ngrok http 3000` and update `.env`
3. **Monitor webhooks**: Visit http://127.0.0.1:4040

### Environment Variables

- Development config is in `.env`
- See `ENV_SETUP_GUIDE.md` for detailed setup
- See `NGROK_SETUP.md` for webhook configuration

### Testing Webhooks

1. Ensure ngrok is running
2. Push a commit to your connected repository
3. Check ngrok inspector for incoming webhooks
4. Check backend logs for processing

## 📚 Documentation

- [Environment Setup Guide](deploymentapp/backendapp/ENV_SETUP_GUIDE.md)
- [Ngrok Setup Guide](deploymentapp/backendapp/NGROK_SETUP.md)
- [Architecture Document](readme)

## 🚨 Troubleshooting

### Backend won't start
- Check MongoDB is running
- Check Redis is running
- Verify `.env` file exists with valid JWT_SECRET

### Webhooks not working
- Ensure ngrok is running
- Verify webhook URL in GitHub matches ngrok URL
- Check webhook secret matches in both places
- Visit http://127.0.0.1:4040 to see requests

### Authentication errors
- Verify GitHub OAuth credentials
- Check callback URL matches exactly
- Ensure frontend URL in `.env` is correct

### Build queue not processing
- Check Redis is running: `redis-cli ping`
- Check Redis connection in `.env`

## 🔒 Security Notes

- Never commit `.env` file
- Rotate secrets regularly
- Use different secrets for production
- Keep ngrok sessions short in development

## 📄 License

ISC

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

---

Built with ❤️ using Node.js, React, and shadcn/ui