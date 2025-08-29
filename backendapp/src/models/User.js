const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 30
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please use a valid email address']
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  githubId: {
    type: String,
    sparse: true
  },
  gitlabId: {
    type: String,
    sparse: true
  },
  bitbucketId: {
    type: String,
    sparse: true
  },
  oauthTokens: {
    github: {
      accessToken: String,
      refreshToken: String,
      expiresAt: Date
    },
    gitlab: {
      accessToken: String,
      refreshToken: String,
      expiresAt: Date
    },
    bitbucket: {
      accessToken: String,
      refreshToken: String,
      expiresAt: Date
    }
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  plan: {
    type: String,
    enum: ['free', 'pro', 'enterprise'],
    default: 'free'
  },
  usage: {
    builds: {
      count: { type: Number, default: 0 },
      lastReset: { type: Date, default: Date.now }
    },
    bandwidth: {
      amount: { type: Number, default: 0 },
      lastReset: { type: Date, default: Date.now }
    },
    storage: {
      amount: { type: Number, default: 0 }
    }
  },
  emailVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationToken: String,
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  lastLogin: Date,
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.generateResetToken = function() {
  const token = require('crypto').randomBytes(32).toString('hex');
  this.resetPasswordToken = require('crypto')
    .createHash('sha256')
    .update(token)
    .digest('hex');
  this.resetPasswordExpires = Date.now() + 3600000;
  return token;
};

const User = mongoose.model('User', userSchema);

module.exports = User;