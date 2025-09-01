# Environment Variables Setup Guide

This guide explains how to obtain and configure all the environment variables required for the Deployment Platform backend.

## Quick Start

1. Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

2. Follow the instructions below to get each key/secret.

---

## Server Configuration

### `PORT=3000`
- **What it is**: The port number where your backend server will run
- **Default**: 3000
- **Change if**: You have another service running on port 3000

### `NODE_ENV=development`
- **Options**: `development`, `production`, `test`
- **Use**: 
  - `development` - for local development (shows detailed errors)
  - `production` - for deployed applications (optimized, secure)
  - `test` - for running tests

---

## JWT Configuration

### `JWT_SECRET`
- **What it is**: Secret key used to sign and verify JSON Web Tokens
- **How to generate**:
  ```bash
  # Option 1: Using Node.js
  node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
  
  # Option 2: Using OpenSSL
  openssl rand -hex 64
  
  # Option 3: Using online generator (NOT for production!)
  # Visit: https://www.allkeysgenerator.com/
  ```
- **Important**: 
  - Must be at least 32 characters long
  - Keep this secret! Never commit to version control
  - Use different secrets for different environments

### `JWT_EXPIRES_IN=7d`
- **Format**: Number + unit (s=seconds, m=minutes, h=hours, d=days)
- **Examples**: `30m`, `24h`, `7d`, `1y`
- **Recommendation**: 
  - Access tokens: 15m to 1h
  - Refresh tokens: 7d to 30d

---

## GitHub OAuth Configuration

### Setting up GitHub OAuth App

1. **Go to GitHub Settings**:
   - Navigate to: https://github.com/settings/developers
   - Or: Profile → Settings → Developer settings → OAuth Apps

2. **Create New OAuth App**:
   - Click "New OAuth App"
   - Fill in the details:
     ```
     Application name: Your Deployment Platform
     Homepage URL: http://localhost:3001 (for development)
     Authorization callback URL: https://1xklqtdz-3000.uks1.devtunnels.ms/api/auth/github/callback
     ```

3. **Get your credentials**:

### `GITHUB_CLIENT_ID`
- **Where to find**: After creating OAuth App, copy the "Client ID"
- **Format**: String of letters and numbers
- **Example**: `Ov23liTQPK8kExa12345`

### `GITHUB_CLIENT_SECRET`
- **Where to find**: Click "Generate a new client secret" in your OAuth App settings
- **Format**: 40-character string
- **Example**: `abc123def456ghi789jkl012mno345pqr678stu9`
- **Important**: Only shown once! Copy immediately

### `GITHUB_CALLBACK_URL`
- **Development**: `https://1xklqtdz-3000.uks1.devtunnels.ms/api/auth/github/callback`
- **Production**: `https://yourdomain.com/api/auth/github/callback`
- **Must match**: The callback URL in your GitHub OAuth App settings

---

## Frontend Configuration

### `FRONTEND_URL=http://localhost:3001`
- **Development**: `http://localhost:3001`
- **Production**: `https://yourdomain.com`
- **Use**: For CORS configuration and redirects after OAuth

---

## Webhook Configuration

### `WEBHOOK_SECRET`
- **What it is**: Secret key to verify webhook payloads from GitHub
- **How to generate**:
  ```bash
  # Generate a random string
  openssl rand -hex 32
  ```
- **Setting up in GitHub**:
  1. Go to your repository → Settings → Webhooks
  2. Click "Add webhook"
  3. Payload URL: Your webhook URL (see below)
  4. Content type: `application/json`
  5. Secret: Paste your generated secret
  6. Events: Select "Push events" and "Pull request events"

### `WEBHOOK_URL`
- **Development**: Use ngrok for local testing
  ```bash
  # Install ngrok: https://ngrok.com/download
  ngrok http 3000
  # Copy the HTTPS URL, e.g., https://abc123.ngrok.io/api/git/webhook
  ```
- **Production**: `https://yourdomain.com/api/git/webhook`
- **Important**: Must be HTTPS for GitHub webhooks

---

## Redis Configuration

### Installing Redis

**Windows**:
```bash
# Option 1: Using WSL2 (Recommended)
wsl --install
# Inside WSL:
sudo apt update
sudo apt install redis-server
sudo service redis-server start

# Option 2: Using Docker
docker run -d -p 6379:6379 redis

# Option 3: Windows Binary
# Download from: https://github.com/microsoftarchive/redis/releases
```

**Mac**:
```bash
brew install redis
brew services start redis
```

**Linux**:
```bash
sudo apt install redis-server  # Ubuntu/Debian
sudo yum install redis         # CentOS/RHEL
```

### `REDIS_HOST=localhost`
- **Default**: `localhost` for local development
- **Docker**: `host.docker.internal` if Redis is on host machine
- **Production**: Your Redis server IP or hostname

### `REDIS_PORT=6379`
- **Default**: 6379 (Redis default port)
- **Change if**: Running Redis on a different port

---

## MongoDB Configuration

### Setting up MongoDB

**Option 1: MongoDB Atlas (Cloud - FREE)**:
1. Visit: https://www.mongodb.com/cloud/atlas
2. Sign up for free account
3. Create a cluster (M0 tier is free)
4. Click "Connect" → "Connect your application"
5. Copy the connection string

**Option 2: Local Installation**:
```bash
# Windows: Download from https://www.mongodb.com/try/download/community

# Mac:
brew tap mongodb/brew
brew install mongodb-community

# Linux:
# Follow: https://docs.mongodb.com/manual/administration/install-on-linux/
```

### `MONGODB_URI`
- **MongoDB Atlas**: 
  ```
  mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/deployment-platform?retryWrites=true&w=majority
  ```
  Replace `<username>` and `<password>` with your database user credentials

- **Local MongoDB**: 
  ```
  mongodb://localhost:27017/deployment-platform
  ```

- **With Authentication**:
  ```
  mongodb://username:password@localhost:27017/deployment-platform
  ```

---

## Storage Configuration

### AWS S3 Setup

1. **Create AWS Account**: https://aws.amazon.com/
2. **Go to S3**: https://console.aws.amazon.com/s3/
3. **Create Bucket**:
   - Click "Create bucket"
   - Choose unique name and region
   - Keep default settings for development

4. **Get Access Keys**:
   - Go to IAM: https://console.aws.amazon.com/iam/
   - Users → Add User → Programmatic access
   - Attach policy: `AmazonS3FullAccess`
   - Save the Access Key ID and Secret

### `S3_BUCKET`
- **Format**: Globally unique bucket name
- **Example**: `my-deployment-platform-files`

### `S3_REGION`
- **Examples**: `us-east-1`, `eu-west-1`, `ap-southeast-1`
- **Find yours**: Check where you created your bucket

### `S3_ACCESS_KEY_ID`
- **Format**: 20-character string
- **Example**: `AKIAIOSFODNN7EXAMPLE`

### `S3_SECRET_ACCESS_KEY`
- **Format**: 40-character string
- **Example**: `wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY`

**Alternative: Use MinIO (Self-hosted S3)**:
```bash
# Docker
docker run -p 9000:9000 -p 9001:9001 \
  -e MINIO_ROOT_USER=minioadmin \
  -e MINIO_ROOT_PASSWORD=minioadmin \
  minio/minio server /data --console-address ":9001"

# Then use:
S3_BUCKET=my-bucket
S3_REGION=us-east-1
S3_ACCESS_KEY_ID=minioadmin
S3_SECRET_ACCESS_KEY=minioadmin
```

---

## Cloudflare Configuration

### Setting up Cloudflare

1. **Sign up**: https://dash.cloudflare.com/sign-up
2. **Add your domain**: Follow the setup wizard
3. **Get API Token**:
   - Go to: My Profile → API Tokens
   - Click "Create Token"
   - Use template: "Edit zone DNS"
   - Or create custom token with permissions:
     - Zone:DNS:Edit
     - Zone:Zone:Read

### `CLOUDFLARE_API_TOKEN`
- **Format**: Long alphanumeric string
- **Example**: `YQSn-xWAQiiEh9qM58wZNnyQS7FUdoqGIUAbrh7T`

### `CLOUDFLARE_ZONE_ID`
- **Where to find**: 
  - Go to your domain in Cloudflare dashboard
  - Right sidebar → "Zone ID"
- **Format**: 32-character string
- **Example**: `023e105f4ecef8ad9ca31a8372d0c353`

---

## Monitoring Configuration (Optional)

### `PROMETHEUS_PORT=9090`
- **Default**: 9090
- **Setup Prometheus**:
  ```bash
  docker run -p 9090:9090 prom/prometheus
  ```

### `GRAFANA_URL=https://1xklqtdz-3000.uks1.devtunnels.ms`
- **Default**: Port 3000 (might conflict with backend)
- **Setup Grafana**:
  ```bash
  docker run -p 3001:3000 grafana/grafana
  ```

---

## Security Best Practices

1. **Never commit `.env` file** - Add to `.gitignore`
2. **Use different values for each environment** (dev, staging, production)
3. **Rotate secrets regularly** (every 3-6 months)
4. **Use secret management services in production**:
   - AWS Secrets Manager
   - HashiCorp Vault
   - Azure Key Vault
   - Google Secret Manager

5. **Minimum secret lengths**:
   - JWT_SECRET: 64+ characters
   - WEBHOOK_SECRET: 32+ characters
   - Database passwords: 20+ characters

---

## Environment Variables by Priority

### Essential (Required to start):
- `JWT_SECRET`
- `MONGODB_URI` (or use local MongoDB)

### Important (For full functionality):
- `GITHUB_CLIENT_ID`
- `GITHUB_CLIENT_SECRET`
- `REDIS_HOST` (for build queue)

### Production Required:
- `S3_*` variables (for file storage)
- `CLOUDFLARE_*` (for custom domains)
- `WEBHOOK_URL` (for GitHub integration)

---

## Testing Your Configuration

After setting up your `.env` file, test each service:

```bash
# 1. Test MongoDB connection
node -e "require('mongoose').connect(process.env.MONGODB_URI).then(() => console.log('MongoDB connected!'))"

# 2. Test Redis connection
node -e "require('redis').createClient().ping().then(() => console.log('Redis connected!'))"

# 3. Start the server
npm start

# 4. Test auth endpoint
curl https://1xklqtdz-3000.uks1.devtunnels.ms/health
```

---

## Troubleshooting

### MongoDB Connection Issues
- Check if MongoDB service is running
- Verify connection string format
- Check firewall/network settings
- For Atlas: Whitelist your IP address

### Redis Connection Issues
- Ensure Redis server is running: `redis-cli ping`
- Check if port 6379 is available
- Try `127.0.0.1` instead of `localhost`

### GitHub OAuth Issues
- Ensure callback URLs match exactly
- Check if secrets are copied correctly
- Verify OAuth app is not in suspended state

### JWT Issues
- Ensure JWT_SECRET is the same across server restarts
- Check token expiration settings
- Verify secret length (minimum 32 characters)

---

## Quick Setup for Development

For fastest development setup, use these minimal settings:

```env
PORT=3000
NODE_ENV=development
JWT_SECRET=your-very-long-random-string-at-least-32-chars
JWT_EXPIRES_IN=7d
FRONTEND_URL=http://localhost:3001
MONGODB_URI=mongodb://localhost:27017/deployment-platform
REDIS_HOST=localhost
REDIS_PORT=6379
```

Then add OAuth and other services as needed.