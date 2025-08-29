const mongoose = require('mongoose');

const monitoringSchema = new mongoose.Schema({
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true
  },
  deploymentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Deployment'
  },
  type: {
    type: String,
    enum: ['performance', 'error', 'uptime', 'usage', 'security'],
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now,
    required: true
  },
  metrics: {
    performance: {
      responseTime: Number,
      throughput: Number,
      errorRate: Number,
      apdex: Number,
      cpu: Number,
      memory: Number,
      disk: Number,
      network: {
        in: Number,
        out: Number
      }
    },
    uptime: {
      status: { type: String, enum: ['up', 'down', 'degraded'] },
      statusCode: Number,
      responseTime: Number,
      lastCheck: Date,
      downtime: Number,
      availability: Number
    },
    usage: {
      requests: Number,
      bandwidth: Number,
      storage: Number,
      builds: Number,
      deployments: Number,
      activeUsers: Number
    },
    errors: [{
      timestamp: Date,
      type: String,
      message: String,
      stack: String,
      url: String,
      userAgent: String,
      ip: String,
      count: Number
    }],
    security: {
      threats: Number,
      blockedIps: [String],
      suspiciousActivity: [{
        type: String,
        description: String,
        severity: { type: String, enum: ['low', 'medium', 'high', 'critical'] },
        timestamp: Date
      }]
    }
  },
  alerts: [{
    type: String,
    severity: { type: String, enum: ['info', 'warning', 'error', 'critical'] },
    message: String,
    triggered: Boolean,
    triggeredAt: Date,
    resolved: Boolean,
    resolvedAt: Date,
    notificationSent: Boolean
  }],
  aggregated: {
    hourly: {
      timestamp: Date,
      data: mongoose.Schema.Types.Mixed
    },
    daily: {
      timestamp: Date,
      data: mongoose.Schema.Types.Mixed
    },
    weekly: {
      timestamp: Date,
      data: mongoose.Schema.Types.Mixed
    },
    monthly: {
      timestamp: Date,
      data: mongoose.Schema.Types.Mixed
    }
  },
  retention: {
    raw: { type: Number, default: 7 },
    hourly: { type: Number, default: 30 },
    daily: { type: Number, default: 90 },
    weekly: { type: Number, default: 365 },
    monthly: { type: Number, default: 730 }
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

monitoringSchema.index({ projectId: 1, timestamp: -1 });
monitoringSchema.index({ deploymentId: 1, timestamp: -1 });
monitoringSchema.index({ type: 1, timestamp: -1 });
monitoringSchema.index({ 'alerts.triggered': 1 });
monitoringSchema.index({ timestamp: 1 }, { expireAfterSeconds: 604800 });

const Monitoring = mongoose.model('Monitoring', monitoringSchema);

module.exports = Monitoring;