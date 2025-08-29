const { exec, spawn } = require('child_process');
const path = require('path');
const fs = require('fs').promises;
const crypto = require('crypto');
const Bull = require('bull');
const Docker = require('dockerode');
const { v4: uuidv4 } = require('uuid');
const Build = require('../models/Build');
const Deployment = require('../models/Deployment');
const Project = require('../models/Project');

class BuildService {
  constructor() {
    this.docker = new Docker();
    this.buildQueue = new Bull('build-queue', {
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379
      }
    });
    
    this.buildsDir = process.env.BUILDS_DIR || path.join(__dirname, '../../builds');
    this.artifactsDir = process.env.ARTIFACTS_DIR || path.join(__dirname, '../../artifacts');
    this.cacheDir = process.env.CACHE_DIR || path.join(__dirname, '../../cache');
    
    this.setupQueueProcessors();
    this.initializeDirectories();
  }

  async initializeDirectories() {
    await fs.mkdir(this.buildsDir, { recursive: true });
    await fs.mkdir(this.artifactsDir, { recursive: true });
    await fs.mkdir(this.cacheDir, { recursive: true });
  }

  setupQueueProcessors() {
    this.buildQueue.process(5, async (job) => {
      const { deploymentId, projectId, buildConfig } = job.data;
      
      try {
        await this.updateBuildStatus(job.data.buildId, 'running');
        const result = await this.executeBuildInDocker(deploymentId, projectId, buildConfig, job);
        await this.updateBuildStatus(job.data.buildId, 'success', result);
        return result;
      } catch (error) {
        await this.updateBuildStatus(job.data.buildId, 'failed', null, error.message);
        throw error;
      }
    });
    
    this.buildQueue.on('completed', async (job, result) => {
      console.log(`Build ${job.data.buildId} completed successfully`);
      await this.handleBuildCompletion(job.data.deploymentId, result);
    });
    
    this.buildQueue.on('failed', async (job, err) => {
      console.error(`Build ${job.data.buildId} failed:`, err);
      await this.handleBuildFailure(job.data.deploymentId, err);
    });
    
    this.buildQueue.on('progress', (job, progress) => {
      console.log(`Build ${job.data.buildId} progress: ${progress}%`);
    });
  }

  async queueBuild(deploymentId, projectId, buildConfig) {
    const buildId = uuidv4();
    const buildRecord = new Build({
      buildId,
      deploymentId,
      projectId,
      status: 'pending',
      buildContext: {
        repository: buildConfig.repository,
        branch: buildConfig.branch,
        commit: buildConfig.commit
      }
    });
    
    await buildRecord.save();
    
    const job = await this.buildQueue.add({
      buildId,
      deploymentId,
      projectId,
      buildConfig,
      timestamp: new Date().toISOString()
    }, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000
      },
      removeOnComplete: false,
      removeOnFail: false
    });
    
    return {
      buildId,
      jobId: job.id,
      status: 'queued'
    };
  }

  async executeBuildInDocker(deploymentId, projectId, buildConfig, job) {
    const buildId = job.data.buildId;
    const buildDir = path.join(this.buildsDir, buildId);
    const project = await Project.findById(projectId);
    
    if (!project) {
      throw new Error('Project not found');
    }
    
    await fs.mkdir(buildDir, { recursive: true });
    
    const dockerImage = this.getDockerImage(buildConfig.projectType);
    const buildScript = await this.generateBuildScript(buildConfig, project);
    
    await fs.writeFile(path.join(buildDir, 'build.sh'), buildScript, 'utf-8');
    
    const container = await this.docker.createContainer({
      Image: dockerImage,
      Cmd: ['/bin/bash', '/workspace/build.sh'],
      WorkingDir: '/workspace',
      Env: this.getBuildEnvironment(project),
      HostConfig: {
        Binds: [`${buildDir}:/workspace`],
        Memory: 2 * 1024 * 1024 * 1024,
        CpuShares: 512,
        NetworkMode: buildConfig.projectType.includes('backend') ? 'bridge' : 'none',
        ReadonlyRootfs: false,
        SecurityOpt: ['no-new-privileges'],
        CapDrop: ['ALL'],
        CapAdd: ['CHOWN', 'DAC_OVERRIDE', 'SETGID', 'SETUID']
      },
      AttachStdout: true,
      AttachStderr: true
    });
    
    const stream = await container.attach({ stream: true, stdout: true, stderr: true });
    const logs = [];
    
    stream.on('data', (chunk) => {
      const log = chunk.toString('utf8');
      logs.push(log);
      job.progress(this.calculateProgress(log));
    });
    
    await container.start();
    
    const result = await container.wait();
    await container.remove();
    
    if (result.StatusCode !== 0) {
      throw new Error(`Build failed with exit code ${result.StatusCode}`);
    }
    
    const artifactPath = await this.createArtifact(buildDir, buildId, project.outputDirectory);
    
    await Build.findOneAndUpdate(
      { buildId },
      {
        status: 'success',
        completedAt: new Date(),
        duration: Date.now() - new Date(job.data.timestamp).getTime(),
        artifacts: [{
          name: 'build-output',
          path: artifactPath,
          size: (await fs.stat(artifactPath)).size,
          type: 'tar.gz',
          uploadedAt: new Date()
        }],
        stages: [{
          name: 'docker-build',
          status: 'success',
          startTime: new Date(job.data.timestamp),
          endTime: new Date(),
          logs: logs
        }]
      }
    );
    
    return {
      success: true,
      buildId,
      artifactPath,
      logs: logs.join('\n'),
      duration: Date.now() - new Date(job.data.timestamp).getTime()
    };
  }

  getDockerImage(projectType) {
    const images = {
      'react': 'node:18-alpine',
      'vue': 'node:18-alpine',
      'angular': 'node:18-alpine',
      'nextjs': 'node:18-alpine',
      'nodejs': 'node:18-alpine',
      'python': 'python:3.9-slim',
      'django': 'python:3.9-slim',
      'flask': 'python:3.9-slim',
      'ruby': 'ruby:3.0-slim',
      'php': 'php:8.0-cli',
      'java': 'openjdk:11-slim',
      'go': 'golang:1.19-alpine',
      'rust': 'rust:1.65-slim',
      'static': 'nginx:alpine'
    };
    
    return images[projectType] || 'node:18-alpine';
  }

  async generateBuildScript(buildConfig, project) {
    const { projectType, buildTool } = buildConfig;
    let script = '#!/bin/bash\nset -e\n\n';
    
    script += `echo "Starting build for ${projectType} project..."\n\n`;
    
    script += `git clone --depth 1 --branch ${buildConfig.branch} ${buildConfig.repository} /workspace/source\n`;
    script += `cd /workspace/source\n\n`;
    
    if (buildConfig.commit) {
      script += `git checkout ${buildConfig.commit}\n\n`;
    }
    
    script += this.getCacheRestoreScript(projectType, buildTool);
    
    switch (projectType) {
      case 'react':
      case 'vue':
      case 'angular':
      case 'nextjs':
        script += this.getNodeBuildScript(buildTool, project);
        break;
      
      case 'nodejs':
        script += this.getNodeBackendBuildScript(buildTool, project);
        break;
      
      case 'python':
      case 'django':
      case 'flask':
        script += this.getPythonBuildScript(buildTool, project);
        break;
      
      case 'static':
        script += 'echo "No build required for static site"\n';
        script += 'cp -r . /workspace/output\n';
        break;
      
      default:
        script += `${project.installCommand || 'echo "No install command"'}\n`;
        script += `${project.buildCommand || 'echo "No build command"'}\n`;
        script += `cp -r ${project.outputDirectory || '.'} /workspace/output\n`;
    }
    
    script += this.getCacheSaveScript(projectType, buildTool);
    script += '\necho "Build completed successfully!"';
    
    return script;
  }

  getNodeBuildScript(buildTool, project) {
    let script = '';
    
    switch (buildTool) {
      case 'yarn':
        script += 'yarn install --frozen-lockfile --network-timeout 100000\n';
        script += `${project.buildCommand || 'yarn build'}\n`;
        break;
      
      case 'pnpm':
        script += 'npm install -g pnpm\n';
        script += 'pnpm install --frozen-lockfile\n';
        script += `${project.buildCommand || 'pnpm build'}\n`;
        break;
      
      default:
        script += 'npm ci --network-timeout 100000\n';
        script += `${project.buildCommand || 'npm run build'}\n`;
    }
    
    script += `cp -r ${project.outputDirectory || 'build'} /workspace/output\n`;
    return script;
  }

  getNodeBackendBuildScript(buildTool, project) {
    let script = '';
    
    switch (buildTool) {
      case 'yarn':
        script += 'yarn install --frozen-lockfile --production\n';
        break;
      
      case 'pnpm':
        script += 'npm install -g pnpm\n';
        script += 'pnpm install --frozen-lockfile --prod\n';
        break;
      
      default:
        script += 'npm ci --production\n';
    }
    
    script += 'cp -r . /workspace/output\n';
    script += 'echo "FROM node:18-alpine" > /workspace/output/Dockerfile\n';
    script += 'echo "WORKDIR /app" >> /workspace/output/Dockerfile\n';
    script += 'echo "COPY . ." >> /workspace/output/Dockerfile\n';
    script += `echo "CMD [\\"node\\", \\"${project.startCommand || 'index.js'}\\"]" >> /workspace/output/Dockerfile\n`;
    
    return script;
  }

  getPythonBuildScript(buildTool, project) {
    let script = '';
    
    switch (buildTool) {
      case 'pipenv':
        script += 'pip install pipenv\n';
        script += 'pipenv install --deploy\n';
        break;
      
      case 'poetry':
        script += 'pip install poetry\n';
        script += 'poetry install --no-dev\n';
        break;
      
      default:
        script += 'pip install -r requirements.txt\n';
    }
    
    if (project.projectType === 'django') {
      script += 'python manage.py collectstatic --noinput\n';
    }
    
    script += 'cp -r . /workspace/output\n';
    script += 'echo "FROM python:3.9-slim" > /workspace/output/Dockerfile\n';
    script += 'echo "WORKDIR /app" >> /workspace/output/Dockerfile\n';
    script += 'echo "COPY . ." >> /workspace/output/Dockerfile\n';
    
    if (project.projectType === 'django') {
      script += 'echo "CMD [\\"gunicorn\\", \\"wsgi:application\\"]" >> /workspace/output/Dockerfile\n';
    } else if (project.projectType === 'flask') {
      script += 'echo "CMD [\\"gunicorn\\", \\"app:app\\"]" >> /workspace/output/Dockerfile\n';
    } else {
      script += `echo "CMD [\\"python\\", \\"${project.startCommand || 'app.py'}\\"]" >> /workspace/output/Dockerfile\n`;
    }
    
    return script;
  }

  getCacheRestoreScript(projectType, buildTool) {
    let script = 'echo "Restoring cache..."\n';
    
    if (projectType.includes('node') || ['react', 'vue', 'angular', 'nextjs'].includes(projectType)) {
      script += 'if [ -f /cache/node_modules.tar.gz ]; then\n';
      script += '  tar -xzf /cache/node_modules.tar.gz\n';
      script += 'fi\n\n';
    }
    
    if (projectType.includes('python')) {
      script += 'if [ -f /cache/pip-cache.tar.gz ]; then\n';
      script += '  tar -xzf /cache/pip-cache.tar.gz -C ~/.cache/pip\n';
      script += 'fi\n\n';
    }
    
    return script;
  }

  getCacheSaveScript(projectType, buildTool) {
    let script = '\necho "Saving cache..."\n';
    
    if (projectType.includes('node') || ['react', 'vue', 'angular', 'nextjs'].includes(projectType)) {
      script += 'tar -czf /cache/node_modules.tar.gz node_modules || true\n';
    }
    
    if (projectType.includes('python')) {
      script += 'tar -czf /cache/pip-cache.tar.gz -C ~/.cache pip || true\n';
    }
    
    return script;
  }

  getBuildEnvironment(project) {
    const env = [
      'NODE_ENV=production',
      'CI=true'
    ];
    
    if (project.environmentVariables) {
      project.environmentVariables.forEach(variable => {
        if (!variable.encrypted || variable.key.startsWith('REACT_APP_') || variable.key.startsWith('NEXT_PUBLIC_')) {
          env.push(`${variable.key}=${variable.value}`);
        }
      });
    }
    
    return env;
  }

  calculateProgress(log) {
    const progressIndicators = [
      { pattern: /Cloning/, progress: 10 },
      { pattern: /Installing dependencies/, progress: 30 },
      { pattern: /Building/, progress: 60 },
      { pattern: /Creating optimized production build/, progress: 70 },
      { pattern: /Compiled successfully/, progress: 90 },
      { pattern: /Build completed/, progress: 100 }
    ];
    
    for (const indicator of progressIndicators) {
      if (indicator.pattern.test(log)) {
        return indicator.progress;
      }
    }
    
    return null;
  }

  async createArtifact(buildDir, buildId, outputDir = 'output') {
    const artifactPath = path.join(this.artifactsDir, `${buildId}.tar.gz`);
    const sourceDir = path.join(buildDir, outputDir);
    
    await new Promise((resolve, reject) => {
      exec(`tar -czf ${artifactPath} -C ${sourceDir} .`, (error) => {
        if (error) reject(error);
        else resolve();
      });
    });
    
    return artifactPath;
  }

  async updateBuildStatus(buildId, status, result = null, error = null) {
    const update = {
      status,
      updatedAt: new Date()
    };
    
    if (status === 'running') {
      update.startedAt = new Date();
    }
    
    if (status === 'success' || status === 'failed') {
      update.completedAt = new Date();
    }
    
    if (result) {
      update.artifacts = result.artifacts;
      update.duration = result.duration;
    }
    
    if (error) {
      update['error.message'] = error;
    }
    
    await Build.findOneAndUpdate({ buildId }, update);
  }

  async handleBuildCompletion(deploymentId, result) {
    await Deployment.findByIdAndUpdate(deploymentId, {
      status: 'deploying',
      buildEndTime: new Date(),
      'artifacts.buildPath': result.artifactPath,
      'artifacts.size': (await fs.stat(result.artifactPath)).size
    });
  }

  async handleBuildFailure(deploymentId, error) {
    await Deployment.findByIdAndUpdate(deploymentId, {
      status: 'failed',
      buildEndTime: new Date(),
      'error.message': error.message,
      'error.stack': error.stack
    });
  }

  async getBuildStatus(buildId) {
    const build = await Build.findOne({ buildId });
    
    if (!build) {
      return null;
    }
    
    const jobs = await this.buildQueue.getJobs(['waiting', 'active', 'completed', 'failed']);
    const job = jobs.find(j => j.data.buildId === buildId);
    
    return {
      buildId,
      status: build.status,
      progress: job ? job.progress() : 0,
      startedAt: build.startedAt,
      completedAt: build.completedAt,
      duration: build.duration,
      artifacts: build.artifacts,
      error: build.error
    };
  }

  async getBuildLogs(buildId) {
    const build = await Build.findOne({ buildId });
    
    if (!build || !build.stages || build.stages.length === 0) {
      return {
        buildId,
        logs: '',
        exists: false
      };
    }
    
    const logs = build.stages.flatMap(stage => stage.logs || []).join('\n');
    
    return {
      buildId,
      logs,
      exists: true
    };
  }

  async cleanupOldBuilds() {
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    
    const oldBuilds = await Build.find({
      createdAt: { $lt: oneWeekAgo },
      status: { $in: ['success', 'failed'] }
    });
    
    for (const build of oldBuilds) {
      const buildDir = path.join(this.buildsDir, build.buildId);
      
      try {
        await fs.rm(buildDir, { recursive: true, force: true });
        
        if (build.artifacts) {
          for (const artifact of build.artifacts) {
            try {
              await fs.unlink(artifact.path);
            } catch (error) {}
          }
        }
      } catch (error) {
        console.error(`Error cleaning up build ${build.buildId}:`, error);
      }
    }
    
    await Build.deleteMany({
      createdAt: { $lt: oneWeekAgo },
      status: { $in: ['success', 'failed'] }
    });
  }
}

module.exports = new BuildService();