const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const passport = require('passport');
const { Strategy: JwtStrategy, ExtractJwt } = require('passport-jwt');
const GitHubStrategy = require('passport-github2').Strategy;

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

// Configure JWT Strategy
const jwtOptions = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: JWT_SECRET
};

passport.use(new JwtStrategy(jwtOptions, async (jwtPayload, done) => {
  try {
    // Here you would typically fetch the user from database
    // For now, returning the payload data
    const user = {
      id: jwtPayload.id,
      email: jwtPayload.email,
      role: jwtPayload.role
    };
    return done(null, user);
  } catch (error) {
    return done(error, false);
  }
}));

// Configure GitHub OAuth Strategy
if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
  passport.use(new GitHubStrategy({
    clientID: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
    callbackURL: process.env.GITHUB_CALLBACK_URL || "http://localhost:3000/api/auth/github/callback"
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      // Here you would typically save/update user in database
      const user = {
        id: profile.id,
        username: profile.username,
        email: profile.emails?.[0]?.value,
        githubToken: accessToken,
        provider: 'github'
      };
      return done(null, user);
    } catch (error) {
      return done(error, false);
    }
  }));
}

class AuthService {
  // Generate JWT token
  generateToken(user) {
    const payload = {
      id: user.id,
      email: user.email,
      role: user.role || 'user'
    };
    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  }

  // Verify JWT token
  verifyToken(token) {
    try {
      return jwt.verify(token, JWT_SECRET);
    } catch (error) {
      throw new Error('Invalid token');
    }
  }

  // Hash password
  async hashPassword(password) {
    const saltRounds = 10;
    return bcrypt.hash(password, saltRounds);
  }

  // Compare passwords
  async comparePasswords(password, hashedPassword) {
    return bcrypt.compare(password, hashedPassword);
  }

  // Create user session
  createSession(user) {
    const token = this.generateToken(user);
    const refreshToken = jwt.sign(
      { id: user.id, type: 'refresh' },
      JWT_SECRET,
      { expiresIn: '30d' }
    );
    
    return {
      accessToken: token,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role
      }
    };
  }

  // Validate API key
  validateApiKey(apiKey) {
    // Here you would check the API key against your database
    // For now, just checking if it exists
    return apiKey && apiKey.length > 20;
  }
}

module.exports = new AuthService();