// API Configuration
export const API_BASE_URL = process.env.NODE_ENV === 'production' 
    ? window.location.origin.replace(':3001', ':3000')  // Dynamic for production
    : 'http://localhost:3000';

export const config = {
    apiUrl: API_BASE_URL,
    githubOAuthUrl: `${API_BASE_URL}/api/auth/github`,
    webhookUrl: `${API_BASE_URL}/api/git/webhook`
};

// For ngrok or external URLs, this will be updated by setup-ngrok.ps1 script