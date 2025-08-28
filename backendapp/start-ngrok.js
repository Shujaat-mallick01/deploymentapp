#!/usr/bin/env node

/**
 * Ngrok Setup Helper
 * This script helps you start ngrok and update your .env file
 */

const { exec, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('🚀 Starting Ngrok Setup for Deployment Platform\n');

// Check if .env exists
const envPath = path.join(__dirname, '.env');
if (!fs.existsSync(envPath)) {
  console.log('📝 Creating .env from .env.example...');
  fs.copyFileSync(path.join(__dirname, '.env.example'), envPath);
}

// Start ngrok
console.log('🌐 Starting ngrok tunnel on port 3000...');
console.log('   (This will expose your local server to the internet)\n');

const ngrokProcess = spawn('ngrok', ['http', '3000'], {
  stdio: ['inherit', 'pipe', 'pipe']
});

let ngrokStarted = false;

ngrokProcess.stdout.on('data', (data) => {
  if (!ngrokStarted) {
    console.log(data.toString());
  }
});

ngrokProcess.stderr.on('data', (data) => {
  console.error(`Error: ${data}`);
});

ngrokProcess.on('error', (error) => {
  if (error.code === 'ENOENT') {
    console.error('❌ Ngrok is not installed!');
    console.log('\n📦 To install ngrok:');
    console.log('   Windows: Download from https://ngrok.com/download');
    console.log('   Mac: brew install ngrok');
    console.log('   Linux: sudo snap install ngrok');
    process.exit(1);
  }
});

// Wait for ngrok to start and get the URL
setTimeout(() => {
  exec('curl -s http://localhost:4040/api/tunnels', (error, stdout) => {
    if (error) {
      console.error('❌ Failed to get ngrok URL. Make sure ngrok is running.');
      console.log('\n💡 Try running manually: ngrok http 3000');
      process.exit(1);
    }
    
    try {
      const data = JSON.parse(stdout);
      const tunnel = data.tunnels?.find(t => t.proto === 'https');
      
      if (!tunnel) {
        console.error('❌ No HTTPS tunnel found');
        process.exit(1);
      }
      
      const httpsUrl = tunnel.public_url;
      ngrokStarted = true;
      
      console.log('\n✅ Ngrok is running!');
      console.log('📌 Your public URL:', httpsUrl);
      console.log('🔗 Webhook URL:', `${httpsUrl}/api/git/webhook`);
      console.log('🌐 Web Interface: http://127.0.0.1:4040');
      
      rl.question('\n📝 Update .env file with this ngrok URL? (y/n): ', (answer) => {
        if (answer.toLowerCase() === 'y') {
          // Read current .env
          let envContent = fs.readFileSync(envPath, 'utf8');
          
          // Update WEBHOOK_URL
          envContent = envContent.replace(
            /WEBHOOK_URL=.*/,
            `WEBHOOK_URL=${httpsUrl}/api/git/webhook`
          );
          
          // Optionally update GitHub callback for full ngrok testing
          const updateGitHub = envContent.includes('GITHUB_CALLBACK_URL=http://localhost');
          if (updateGitHub) {
            envContent = envContent.replace(
              /GITHUB_CALLBACK_URL=.*/,
              `GITHUB_CALLBACK_URL=${httpsUrl}/api/auth/github/callback`
            );
          }
          
          // Write updated .env
          fs.writeFileSync(envPath, envContent);
          
          console.log('\n✅ Updated .env file:');
          console.log(`   WEBHOOK_URL=${httpsUrl}/api/git/webhook`);
          if (updateGitHub) {
            console.log(`   GITHUB_CALLBACK_URL=${httpsUrl}/api/auth/github/callback`);
          }
          
          console.log('\n📋 Next steps:');
          console.log('1. Keep this terminal open (ngrok is running)');
          console.log('2. Open a new terminal and run: npm start');
          console.log('3. Configure GitHub webhook with:', `${httpsUrl}/api/git/webhook`);
          console.log('\n🔍 Monitor webhooks at: http://127.0.0.1:4040');
          console.log('\n⚠️  Remember: This URL changes when you restart ngrok!');
          console.log('Press Ctrl+C to stop ngrok\n');
          
        } else {
          console.log('\n📋 Manual setup required:');
          console.log(`1. Add to .env: WEBHOOK_URL=${httpsUrl}/api/git/webhook`);
          console.log(`2. Configure GitHub webhook with this URL`);
          console.log('\nPress Ctrl+C to stop ngrok\n');
        }
        
        rl.close();
      });
      
    } catch (err) {
      console.error('❌ Failed to parse ngrok response:', err.message);
      process.exit(1);
    }
  });
}, 3000);

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n🛑 Stopping ngrok...');
  ngrokProcess.kill();
  process.exit(0);
});