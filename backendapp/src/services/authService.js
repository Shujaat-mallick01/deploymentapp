const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const passport = require('passport');
const crypto = require('crypto');
const { Strategy: JwtStrategy, ExtractJwt } = require('passport-jwt');
const GitHubStrategy = require('passport-github2').Strategy;
const GitLabStrategy = require('passport-gitlab2').Strategy;
const BitbucketStrategy = require('passport-bitbucket-oauth2').Strategy;
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const REFRESH_TOKEN_EXPIRES_IN = process.env.REFRESH_TOKEN_EXPIRES_IN || '30d';

const jwtOptions = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: JWT_SECRET
};

passport.use(new JwtStrategy(jwtOptions, async (jwtPayload, done) => {
  try {
    const user = await User.findById(jwtPayload.id).select('-password');
    if (user) {
      return done(null, user);
    }
    return done(null, false);
  } catch (error) {
    return done(error, false);
  }
}));

if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
  console.log('Configuring GitHub OAuth Strategy:', {
    clientID: process.env.GITHUB_CLIENT_ID,
    callbackURL: process.env.GITHUB_CALLBACK_URL || "https://1xklqtdz-3000.uks1.devtunnels.ms/api/auth/github/callback"
  });
  
  passport.use(new GitHubStrategy({
    clientID: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
    callbackURL: process.env.GITHUB_CALLBACK_URL || "https://1xklqtdz-3000.uks1.devtunnels.ms/api/auth/github/callback",
    passReqToCallback: true
  },
  async (req, accessToken, refreshToken, profile, done) => {
    console.log('GitHub OAuth callback received:', {
      hasAccessToken: !!accessToken,
      hasRefreshToken: !!refreshToken,
      profileId: profile?.id,
      profileUsername: profile?.username
    });
    try {
      let user = await User.findOne({ githubId: profile.id });
      
      if (!user) {
        user = await User.findOne({ email: profile.emails?.[0]?.value });
        
        if (user) {
          user.githubId = profile.id;
          user.oauthTokens.github = {
            accessToken,
            refreshToken,
            expiresAt: new Date(Date.now() + 7200000)
          };
        } else {
          user = new User({
            username: profile.username,
            email: profile.emails?.[0]?.value || `${profile.username}@github.local`,
            githubId: profile.id,
            password: crypto.randomBytes(32).toString('hex'),
            emailVerified: true,
            oauthTokens: {
              github: {
                accessToken,
                refreshToken,
                expiresAt: new Date(Date.now() + 7200000)
              }
            }
          });
        }
        await user.save();
      } else {
        user.oauthTokens.github = {
          accessToken,
          refreshToken,
          expiresAt: new Date(Date.now() + 7200000)
        };
        user.lastLogin = new Date();
        await user.save();
      }
      
      return done(null, user);
    } catch (error) {
      return done(error, false);
    }
  }));
}

if (process.env.GITLAB_CLIENT_ID && process.env.GITLAB_CLIENT_SECRET) {
  passport.use(new GitLabStrategy({
    clientID: process.env.GITLAB_CLIENT_ID,
    clientSecret: process.env.GITLAB_CLIENT_SECRET,
    callbackURL: process.env.GITLAB_CALLBACK_URL || "https://1xklqtdz-3000.uks1.devtunnels.ms/api/auth/gitlab/callback"
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      let user = await User.findOne({ gitlabId: profile.id });
      
      if (!user) {
        user = await User.findOne({ email: profile.emails?.[0]?.value });
        
        if (user) {
          user.gitlabId = profile.id;
          user.oauthTokens.gitlab = {
            accessToken,
            refreshToken,
            expiresAt: new Date(Date.now() + 7200000)
          };
        } else {
          user = new User({
            username: profile.username,
            email: profile.emails?.[0]?.value || `${profile.username}@gitlab.local`,
            gitlabId: profile.id,
            password: crypto.randomBytes(32).toString('hex'),
            emailVerified: true,
            oauthTokens: {
              gitlab: {
                accessToken,
                refreshToken,
                expiresAt: new Date(Date.now() + 7200000)
              }
            }
          });
        }
        await user.save();
      } else {
        user.oauthTokens.gitlab = {
          accessToken,
          refreshToken,
          expiresAt: new Date(Date.now() + 7200000)
        };
        user.lastLogin = new Date();
        await user.save();
      }
      
      return done(null, user);
    } catch (error) {
      return done(error, false);
    }
  }));
}

if (process.env.BITBUCKET_CLIENT_ID && process.env.BITBUCKET_CLIENT_SECRET) {
  passport.use(new BitbucketStrategy({
    clientID: process.env.BITBUCKET_CLIENT_ID,
    clientSecret: process.env.BITBUCKET_CLIENT_SECRET,
    callbackURL: process.env.BITBUCKET_CALLBACK_URL || "https://1xklqtdz-3000.uks1.devtunnels.ms/api/auth/bitbucket/callback"
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      let user = await User.findOne({ bitbucketId: profile.id });
      
      if (!user) {
        user = await User.findOne({ email: profile.emails?.[0]?.value });
        
        if (user) {
          user.bitbucketId = profile.id;
          user.oauthTokens.bitbucket = {
            accessToken,
            refreshToken,
            expiresAt: new Date(Date.now() + 7200000)
          };
        } else {
          user = new User({
            username: profile.username,
            email: profile.emails?.[0]?.value || `${profile.username}@bitbucket.local`,
            bitbucketId: profile.id,
            password: crypto.randomBytes(32).toString('hex'),
            emailVerified: true,
            oauthTokens: {
              bitbucket: {
                accessToken,
                refreshToken,
                expiresAt: new Date(Date.now() + 7200000)
              }
            }
          });
        }
        await user.save();
      } else {
        user.oauthTokens.bitbucket = {
          accessToken,
          refreshToken,
          expiresAt: new Date(Date.now() + 7200000)
        };
        user.lastLogin = new Date();
        await user.save();
      }
      
      return done(null, user);
    } catch (error) {
      return done(error, false);
    }
  }));
}

class AuthService {
  generateToken(user) {
    const payload = {
      id: user._id || user.id,
      email: user.email,
      username: user.username,
      role: user.role || 'user'
    };
    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  }

  generateRefreshToken(user) {
    const payload = {
      id: user._id || user.id,
      type: 'refresh'
    };
    return jwt.sign(payload, JWT_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRES_IN });
  }

  verifyToken(token) {
    try {
      return jwt.verify(token, JWT_SECRET);
    } catch (error) {
      throw new Error('Invalid token');
    }
  }

  async hashPassword(password) {
    const saltRounds = 10;
    return bcrypt.hash(password, saltRounds);
  }

  async comparePasswords(password, hashedPassword) {
    return bcrypt.compare(password, hashedPassword);
  }

  createSession(user) {
    const accessToken = this.generateToken(user);
    const refreshToken = this.generateRefreshToken(user);
    
    return {
      accessToken,
      refreshToken,
      user: {
        id: user._id || user.id,
        email: user.email,
        username: user.username,
        role: user.role,
        plan: user.plan,
        emailVerified: user.emailVerified
      }
    };
  }

  async refreshAccessToken(refreshToken) {
    try {
      const decoded = this.verifyToken(refreshToken);
      if (decoded.type !== 'refresh') {
        throw new Error('Invalid refresh token');
      }
      
      const user = await User.findById(decoded.id).select('-password');
      if (!user) {
        throw new Error('User not found');
      }
      
      return this.generateToken(user);
    } catch (error) {
      throw new Error('Invalid refresh token');
    }
  }

  generateEmailVerificationToken() {
    return crypto.randomBytes(32).toString('hex');
  }

  generatePasswordResetToken() {
    return crypto.randomBytes(32).toString('hex');
  }

  validateApiKey(apiKey) {
    return apiKey && apiKey.length > 20;
  }

  async register(userData) {
    const { username, email, password } = userData;
    
    const existingUser = await User.findOne({
      $or: [{ email }, { username }]
    });
    
    if (existingUser) {
      throw new Error('User already exists');
    }
    
    const user = new User({
      username,
      email,
      password,
      emailVerificationToken: this.generateEmailVerificationToken()
    });
    
    await user.save();
    return this.createSession(user);
  }

  async login(email, password) {
    const user = await User.findOne({ email });
    
    if (!user) {
      throw new Error('Invalid credentials');
    }
    
    const isValidPassword = await user.comparePassword(password);
    if (!isValidPassword) {
      throw new Error('Invalid credentials');
    }
    
    user.lastLogin = new Date();
    await user.save();
    
    return this.createSession(user);
  }

  async verifyEmail(token) {
    const hashedToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');
    
    const user = await User.findOne({
      emailVerificationToken: hashedToken
    });
    
    if (!user) {
      throw new Error('Invalid verification token');
    }
    
    user.emailVerified = true;
    user.emailVerificationToken = undefined;
    await user.save();
    
    return user;
  }

  async forgotPassword(email) {
    const user = await User.findOne({ email });
    
    if (!user) {
      throw new Error('User not found');
    }
    
    const resetToken = user.generateResetToken();
    await user.save();
    
    return resetToken;
  }

  async resetPassword(token, newPassword) {
    const hashedToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');
    
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() }
    });
    
    if (!user) {
      throw new Error('Invalid or expired reset token');
    }
    
    user.password = newPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();
    
    return user;
  }
}

module.exports = new AuthService();