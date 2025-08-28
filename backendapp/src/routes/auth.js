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
    
    // Hash password
    const hashedPassword = await authService.hashPassword(password);
    
    // In production, save user to database
    const user = {
      id: Date.now().toString(),
      email,
      username: username || email.split('@')[0],
      password: hashedPassword,
      role: 'user',
      createdAt: new Date().toISOString()
    };
    
    // Create session
    const session = authService.createSession(user);
    
    res.status(201).json({
      message: 'User registered successfully',
      ...session
    });
  } catch (error) {
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
    
    // In production, fetch user from database
    // For now, creating mock user
    const user = {
      id: Date.now().toString(),
      email,
      username: email.split('@')[0],
      role: 'user'
    };
    
    // Create session
    const session = authService.createSession(user);
    
    res.json({
      message: 'Login successful',
      ...session
    });
  } catch (error) {
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
    
    // Verify refresh token
    const decoded = authService.verifyToken(refreshToken);
    
    if (decoded.type !== 'refresh') {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }
    
    // Create new access token
    const user = { id: decoded.id, email: 'user@example.com', role: 'user' };
    const newToken = authService.generateToken(user);
    
    res.json({
      accessToken: newToken,
      refreshToken
    });
  } catch (error) {
    res.status(401).json({ error: 'Invalid refresh token' });
  }
});

// GitHub OAuth login
router.get('/github', 
  passport.authenticate('github', { scope: ['user:email', 'repo'] })
);

// GitHub OAuth callback
router.get('/github/callback',
  passport.authenticate('github', { session: false, failureRedirect: '/login' }),
  (req, res) => {
    // Create session for GitHub user
    const session = authService.createSession(req.user);
    
    // Redirect to frontend with tokens
    const redirectUrl = `${process.env.FRONTEND_URL || 'http://localhost:3001'}/auth/callback?token=${session.accessToken}&refresh=${session.refreshToken}`;
    res.redirect(redirectUrl);
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