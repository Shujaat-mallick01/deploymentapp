
const mongoose = require('mongoose');

const buildSchema = new mongoose.Schema({
  deploymentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Deployment',
    required: true
  },
  projectId: {
    type: mongoose.Schema.Types.ObjectId,


    
    ref: 'Project',
    required: true
  },
  buildId: {
    type: String,
    required: true,
    unique: true
  },
  status: {
    type: String,
    enum: ['pending', 'running', 'success', 'failed', 'cancelled'],
    default: 'pending'
  },
  dockerImage: String,
  containerId: String,
  buildContext: {
    repository: String,
    branch: String,
    commit: String
  },
  stages: [{
    name: String,
    status: { type: String, enum: ['pending', 'running', 'success', 'failed', 'skipped'] },
    startTime: Date,
    endTime: Date,
    duration: Number,
    logs: [String]
  }],
  cache: {
    enabled: { type: Boolean, default: true },
    key: String,
    size: Number,
    hits: Number,
    misses: Number
  },
  artifacts: [{
    name: String,
    path: String,
    size: Number,
    type: String,
    uploadedAt: Date
  }],
  metrics: {
    cpuUsage: Number,
    memoryUsage: Number,
    diskUsage: Number,
    networkIn: Number,
    networkOut: Number
  },
  startedAt: Date,
  completedAt: Date,
  duration: Number,
  retryCount: {
    type: Number,
    default: 0
  },
  maxRetries: {
    type: Number,
    default: 3
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

buildSchema.index({ deploymentId: 1 });
buildSchema.index({ projectId: 1, createdAt: -1 });
buildSchema.index({ buildId: 1 });
buildSchema.index({ status: 1 });

const Build = mongoose.model('Build', buildSchema);

module.exports = Build;