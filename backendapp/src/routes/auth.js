const express = require('express');
const passport = require('passport');
const crypto = require('crypto');
const authService = require('../services/authService');

const router = express.Router();

// User registration
router.post('/register', async (req, res, next) => {
  try {
    const { email, password, username } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    
    const userData = {
      email,
      password,
      username: username || email.split('@')[0]
    };
    
    const session = await authService.register(userData);
    
    res.status(201).json({
      message: 'User registered successfully',
      ...session
    });
  } catch (error) {
    if (error.message === 'User already exists') {
      return res.status(409).json({ error: error.message });
    }
    next(error);
  }
});

// User login
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    
    const session = await authService.login(email, password);
    
    res.json({
      message: 'Login successful',
      ...session
    });
  } catch (error) {
    if (error.message === 'Invalid credentials') {
      return res.status(401).json({ error: error.message });
    }
    next(error);
  }
});

// Refresh token
router.post('/refresh', async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token is required' });
    }
    
    const accessToken = await authService.refreshAccessToken(refreshToken);
    
    res.json({
      accessToken,
      refreshToken
    });
  } catch (error) {
    res.status(401).json({ error: error.message || 'Invalid refresh token' });
  }
});

// GitHub OAuth login
router.get('/github', 
  passport.authenticate('github', { scope: ['user:email', 'repo'] })
);

// GitHub OAuth callback
router.get('/github/callback',
  (req, res, next) => {
    passport.authenticate('github', { session: false }, (err, user, info) => {
      if (err) {
        console.error('GitHub OAuth Error:', err);
        return res.status(500).json({ 
          error: 'Authentication failed',
          message: err.message,
          details: process.env.NODE_ENV === 'development' ? err.stack : undefined
        });
      }
      
      if (!user) {
        console.error('GitHub OAuth: No user returned', info);
        return res.status(401).json({ 
          error: 'Authentication failed',
          message: info?.message || 'Unable to authenticate with GitHub'
        });
      }
      
      try {
        // Create session for GitHub user
        const session = authService.createSession(user);
        
        // Redirect to frontend with tokens
        const redirectUrl = `${process.env.FRONTEND_URL || 'http://localhost:3001'}/auth/callback?token=${session.accessToken}&refresh=${session.refreshToken}`;
        res.redirect(redirectUrl);
      } catch (error) {
        console.error('Session creation error:', error);
        return res.status(500).json({ 
          error: 'Session creation failed',
          message: error.message
        });
      }
    })(req, res, next);
  }
);

// Logout
router.post('/logout', (req, res) => {
  // In production, you might want to blacklist the token
  res.json({ message: 'Logged out successfully' });
});

// Verify token
router.get('/verify', 
  passport.authenticate('jwt', { session: false }),
  (req, res) => {
    res.json({
      valid: true,
      user: req.user
    });
  }
);

// Generate API key
router.post('/api-key',
  passport.authenticate('jwt', { session: false }),
  async (req, res, next) => {
    try {
      const apiKey = crypto.randomBytes(32).toString('hex');
      
      // In production, save API key to database with user association
      res.json({
        apiKey,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString() // 1 year
      });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;