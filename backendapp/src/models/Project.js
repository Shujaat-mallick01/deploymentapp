const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  gitProvider: {
    type: String,
    enum: ['github', 'gitlab', 'bitbucket'],
    required: true
  },
  repositoryUrl: {
    type: String,
    required: true
  },
  repositoryName: {
    type: String,
    required: true
  },
  repositoryOwner: {
    type: String,
    required: true
  },
  branch: {
    type: String,
    default: 'main'
  },
  projectType: {
    type: String,
    enum: ['static', 'react', 'vue', 'angular', 'nextjs', 'nodejs', 'python', 'django', 'flask', 'ruby', 'php', 'java', 'other'],
    required: true
  },
  buildCommand: {
    type: String,
    default: 'npm run build'
  },
  installCommand: {
    type: String,
    default: 'npm install'
  },
  outputDirectory: {
    type: String,
    default: 'dist'
  },
  environmentVariables: [{
    key: String,
    value: String,
    encrypted: { type: Boolean, default: true }
  }],
  domains: [{
    domain: String,
    type: { type: String, enum: ['custom', 'subdomain'], default: 'subdomain' },
    verified: { type: Boolean, default: false },
    sslEnabled: { type: Boolean, default: false },
    sslCertificate: String,
    createdAt: { type: Date, default: Date.now }
  }],
  webhookSecret: {
    type: String,
    required: true
  },
  autoDeploy: {
    type: Boolean,
    default: true
  },
  deploymentSettings: {
    nodeVersion: { type: String, default: '18' },
    pythonVersion: { type: String, default: '3.9' },
    rubyVersion: { type: String, default: '3.0' },
    phpVersion: { type: String, default: '8.0' },
    javaVersion: { type: String, default: '11' }
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended', 'building', 'error'],
    default: 'inactive'
  },
  lastDeployment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Deployment'
  },
  statistics: {
    totalDeployments: { type: Number, default: 0 },
    successfulDeployments: { type: Number, default: 0 },
    failedDeployments: { type: Number, default: 0 },
    averageBuildTime: { type: Number, default: 0 }
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

projectSchema.index({ userId: 1, name: 1 });
projectSchema.index({ repositoryUrl: 1 });

const Project = mongoose.model('Project', projectSchema);

module.exports = Project;