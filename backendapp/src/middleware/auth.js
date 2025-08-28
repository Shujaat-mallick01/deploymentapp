const passport = require('passport');
const authService = require('../services/authService');

// JWT authentication middleware
const authenticate = (req, res, next) => {
  // Check for API key first
  const apiKey = req.headers['x-api-key'];
  if (apiKey) {
    if (authService.validateApiKey(apiKey)) {
      req.user = { id: 'api-user', role: 'api' };
      return next();
    } else {
      return res.status(401).json({ error: 'Invalid API key' });
    }
  }
  
  // Fall back to JWT authentication
  passport.authenticate('jwt', { session: false }, (err, user, info) => {
    if (err) {
      return next(err);
    }
    
    if (!user) {
      return res.status(401).json({ 
        error: 'Authentication required',
        message: info?.message || 'Invalid or missing token'
      });
    }
    
    req.user = user;
    next();
  })(req, res, next);
};

// Role-based access control middleware
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    if (roles.length && !roles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: 'Insufficient permissions',
        required: roles,
        current: req.user.role
      });
    }
    
    next();
  };
};

// Rate limiting middleware (basic implementation)
const rateLimit = (maxRequests = 100, windowMs = 60000) => {
  const requests = new Map();
  
  return (req, res, next) => {
    const key = req.user?.id || req.ip;
    const now = Date.now();
    
    if (!requests.has(key)) {
      requests.set(key, []);
    }
    
    const userRequests = requests.get(key).filter(timestamp => now - timestamp < windowMs);
    
    if (userRequests.length >= maxRequests) {
      return res.status(429).json({ 
        error: 'Too many requests',
        retryAfter: Math.ceil(windowMs / 1000)
      });
    }
    
    userRequests.push(now);
    requests.set(key, userRequests);
    
    next();
  };
};

module.exports = {
  authenticate,
  authorize,
  rateLimit
};