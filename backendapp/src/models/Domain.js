const mongoose = require('mongoose');

const domainSchema = new mongoose.Schema({
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  domain: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  type: {
    type: String,
    enum: ['custom', 'subdomain'],
    default: 'subdomain'
  },
  status: {
    type: String,
    enum: ['pending', 'verifying', 'active', 'failed', 'expired'],
    default: 'pending'
  },
  verificationMethod: {
    type: String,
    enum: ['dns-txt', 'dns-cname', 'http', 'https'],
    default: 'dns-txt'
  },
  verificationRecord: {
    type: String,
    value: String,
    verified: { type: Boolean, default: false },
    verifiedAt: Date
  },
  dnsRecords: [{
    type: { type: String, enum: ['A', 'AAAA', 'CNAME', 'TXT', 'MX'] },
    name: String,
    value: String,
    ttl: Number,
    priority: Number,
    createdAt: Date
  }],
  ssl: {
    enabled: { type: Boolean, default: false },
    provider: { type: String, enum: ['letsencrypt', 'custom'], default: 'letsencrypt' },
    certificate: String,
    privateKey: String,
    chain: String,
    issuedAt: Date,
    expiresAt: Date,
    autoRenew: { type: Boolean, default: true },
    lastRenewalAttempt: Date,
    renewalStatus: String
  },
  cloudflare: {
    zoneId: String,
    recordId: String,
    proxied: { type: Boolean, default: true }
  },
  redirects: [{
    from: String,
    to: String,
    type: { type: Number, enum: [301, 302, 307, 308], default: 301 },
    enabled: { type: Boolean, default: true }
  }],
  analytics: {
    enabled: { type: Boolean, default: true },
    views: { type: Number, default: 0 },
    uniqueVisitors: { type: Number, default: 0 },
    bandwidth: { type: Number, default: 0 },
    lastUpdated: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

domainSchema.index({ projectId: 1 });
domainSchema.index({ userId: 1 });
domainSchema.index({ domain: 1 });
domainSchema.index({ status: 1 });

const Domain = mongoose.model('Domain', domainSchema);

module.exports = Domain;