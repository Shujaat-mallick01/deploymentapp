const mongoose = require('mongoose');

const deploymentSchema = new mongoose.Schema({
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
  deploymentId: {
    type: String,
    required: true,
    unique: true
  },
  commitHash: {
    type: String,
    required: true
  },
  commitMessage: String,
  commitAuthor: String,
  branch: {
    type: String,
    required: true
  },
  trigger: {
    type: String,
    enum: ['manual', 'webhook', 'api', 'schedule'],
    default: 'webhook'
  },
  status: {
    type: String,
    enum: ['queued', 'building', 'deploying', 'success', 'failed', 'cancelled'],
    default: 'queued'
  },
  buildLogs: [{
    timestamp: Date,
    level: { type: String, enum: ['info', 'warning', 'error'] },
    message: String
  }],
  buildStartTime: Date,
  buildEndTime: Date,
  deployStartTime: Date,
  deployEndTime: Date,
  duration: Number,
  artifacts: {
    buildPath: String,
    size: Number,
    files: Number
  },
  deploymentUrl: String,
  previewUrl: String,
  productionUrl: String,
  environment: {
    type: String,
    enum: ['development', 'staging', 'production', 'preview'],
    default: 'preview'
  },
  metadata: {
    buildCommand: String,
    installCommand: String,
    outputDirectory: String,
    nodeVersion: String,
    pythonVersion: String,
    rubyVersion: String,
    phpVersion: String,
    javaVersion: String
  },
  error: {
    code: String,
    message: String,
    stack: String
  },
  resources: {
    cpu: Number,
    memory: Number,
    buildTime: Number
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

deploymentSchema.index({ projectId: 1, createdAt: -1 });
deploymentSchema.index({ userId: 1, createdAt: -1 });
deploymentSchema.index({ deploymentId: 1 });
deploymentSchema.index({ status: 1 });

const Deployment = mongoose.model('Deployment', deploymentSchema);

module.exports = Deployment;