# Ngrok Setup Guide for Webhooks

Ngrok creates a secure tunnel from the internet to your localhost, allowing GitHub to send webhooks to your local development environment.

## Quick Setup

### 1. Install Ngrok

**Windows (Using Chocolatey):**
```bash
choco install ngrok
```

**Windows (Manual):**
1. Download from: https://ngrok.com/download
2. Extract the zip file
3. Add to PATH or run from the extracted folder

**Mac:**
```bash
brew install ngrok
```

**Linux:**
```bash
# Download and extract
curl -s https://ngrok-agent.s3.amazonaws.com/ngrok.asc | sudo tee /etc/apt/trusted.gpg.d/ngrok.asc >/dev/null
echo "deb https://ngrok-agent.s3.amazonaws.com buster main" | sudo tee /etc/apt/sources.list.d/ngrok.list
sudo apt update && sudo apt install ngrok
```

### 2. Create Ngrok Account (Optional but Recommended)

1. Sign up at: https://dashboard.ngrok.com/signup
2. Get your auth token from: https://dashboard.ngrok.com/get-started/your-authtoken
3. Configure ngrok with your token:
```bash
ngrok config add-authtoken YOUR_AUTH_TOKEN_HERE
```

**Benefits of having an account:**
- Longer session times (8 hours vs 2 hours)
- Custom subdomains (with paid plan)
- Multiple tunnels
- Better rate limits

### 3. Start Ngrok Tunnel

Run this command to expose your backend (port 3000):

```bash
ngrok http 3000
```

You'll see output like this:
```
Session Status                online
Account                       yourname@email.com (Plan: Free)
Version                       3.4.0
Region                        United States (us)
Web Interface                 http://127.0.0.1:4040
Forwarding                    https://abc123def456.ngrok-free.app -> http://localhost:3000

Connections                   ttl     opn     rt1     rt5     p50     p90
                              0       0       0.00    0.00    0.00    0.00
```

### 4. Copy Your Ngrok URL

From the output above, copy the HTTPS forwarding URL:
```
https://abc123def456.ngrok-free.app
```

### 5. Update Your .env File

Create a `.env` file from `.env.example`:
```bash
cp .env.example .env
```

Update the webhook URL in your `.env`:
```env
WEBHOOK_URL=https://abc123def456.ngrok-free.app/api/git/webhook
```

**Complete example with ngrok:**
```env
# Your ngrok URL (changes each time you restart ngrok)
WEBHOOK_URL=https://abc123def456.ngrok-free.app/api/git/webhook

# Also update the GitHub callback if using ngrok for everything
GITHUB_CALLBACK_URL=https://abc123def456.ngrok-free.app/api/auth/github/callback
```

### 6. Configure GitHub Webhook

1. Go to your GitHub repository
2. Navigate to: Settings → Webhooks → Add webhook
3. Configure:
   - **Payload URL**: `https://abc123def456.ngrok-free.app/api/git/webhook`
   - **Content type**: `application/json`
   - **Secret**: Your `WEBHOOK_SECRET` from .env
   - **Events**: Select "Just the push event" or customize as needed
4. Click "Add webhook"

### 7. Test the Webhook

1. Make sure your backend is running:
```bash
npm start
```

2. Make sure ngrok is running:
```bash
ngrok http 3000
```

3. Push a commit to your GitHub repository

4. Check ngrok web interface for requests:
   - Open: http://127.0.0.1:4040
   - You'll see all incoming webhook requests here

## Development Workflow

### Start Everything in Order:

**Terminal 1 - Backend:**
```bash
cd deploymentapp/backendapp
npm start
```

**Terminal 2 - Frontend:**
```bash
cd deploymentapp/frontendapp
npm run dev
```

**Terminal 3 - Ngrok:**
```bash
ngrok http 3000
```

### Important Notes

1. **URL Changes**: Every time you restart ngrok (free plan), you get a new URL
   - Update your `.env` file with the new URL
   - Update GitHub webhook settings with the new URL

2. **Session Limits**: 
   - Free plan: 2-hour session limit (without account)
   - Free plan with account: 8-hour session limit
   - The tunnel will close after this time

3. **Rate Limits**:
   - Free plan: 40 requests per minute
   - Sufficient for development

4. **Security Warning**: 
   - Ngrok exposes your local server to the internet
   - Only run when actively developing
   - Stop ngrok when not in use (Ctrl+C)

## Automation Script

Create a helper script to automate the ngrok setup:

**start-with-ngrok.js:**
```javascript
const { exec, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Start ngrok
const ngrok = spawn('ngrok', ['http', '3000'], {
  detached: false
});

// Wait for ngrok to start and get URL
setTimeout(() => {
  exec('curl -s http://localhost:4040/api/tunnels', (error, stdout) => {
    if (error) {
      console.error('Failed to get ngrok URL');
      return;
    }
    
    const data = JSON.parse(stdout);
    const httpsUrl = data.tunnels.find(t => t.proto === 'https')?.public_url;
    
    if (httpsUrl) {
      console.log('✅ Ngrok URL:', httpsUrl);
      console.log('📋 Webhook URL:', `${httpsUrl}/api/git/webhook`);
      
      // Update .env file
      const envPath = path.join(__dirname, '.env');
      let envContent = fs.readFileSync(envPath, 'utf8');
      envContent = envContent.replace(
        /WEBHOOK_URL=.*/,
        `WEBHOOK_URL=${httpsUrl}/api/git/webhook`
      );
      fs.writeFileSync(envPath, envContent);
      console.log('✅ Updated .env file with new ngrok URL');
      
      // Start the backend
      spawn('npm', ['start'], {
        stdio: 'inherit',
        shell: true
      });
    }
  });
}, 3000);

// Handle exit
process.on('SIGINT', () => {
  ngrok.kill();
  process.exit();
});
```

Use it with:
```bash
node start-with-ngrok.js
```

## Alternative: Cloudflare Tunnel (Free, More Stable)

For a more stable solution, consider Cloudflare Tunnel:

1. Install Cloudflare Tunnel:
```bash
# Windows
winget install --id Cloudflare.cloudflared

# Mac
brew install cloudflared

# Linux
wget -q https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
sudo dpkg -i cloudflared-linux-amd64.deb
```

2. Login to Cloudflare:
```bash
cloudflared tunnel login
```

3. Create a tunnel:
```bash
cloudflared tunnel create dev-platform
```

4. Run the tunnel:
```bash
cloudflared tunnel --url http://localhost:3000 run dev-platform
```

This gives you a stable URL that doesn't change!

## Troubleshooting

### Ngrok not starting?
- Check if port 3000 is already in use
- Make sure your backend is running first
- Try with explicit region: `ngrok http 3000 --region us`

### Webhook not receiving?
- Check ngrok web interface: http://127.0.0.1:4040
- Verify the webhook secret matches in GitHub and .env
- Check GitHub webhook recent deliveries for errors

### Getting 404 errors?
- Ensure the path is correct: `/api/git/webhook`
- Make sure your backend routes are properly configured
- Check that the backend is running on port 3000

### Rate limited?
- Create a free ngrok account for better limits
- Consider upgrading or using Cloudflare Tunnel

## Next Steps

After setting up ngrok:

1. ✅ Test webhook by pushing to your GitHub repo
2. ✅ Monitor requests at http://127.0.0.1:4040
3. ✅ Check backend logs for webhook processing
4. ✅ Set up GitHub OAuth with ngrok URL if needed