const { exec } = require('child_process');
const path = require('path');
const fs = require('fs').promises;
const crypto = require('crypto');
const Bull = require('bull');

class BuildService {
  constructor() {
    this.buildQueue = new Bull('build-queue', {
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379
      }
    });
    
    this.buildsDir = process.env.BUILDS_DIR || path.join(__dirname, '../../builds');
    this.setupQueueProcessors();
  }

  // Setup queue processors
  setupQueueProcessors() {
    this.buildQueue.process(async (job) => {
      const { projectPath, projectType, buildId } = job.data;
      return this.executeBuild(projectPath, projectType, buildId);
    });
    
    this.buildQueue.on('completed', (job, result) => {
      console.log(`Build ${job.data.buildId} completed successfully`);
    });
    
    this.buildQueue.on('failed', (job, err) => {
      console.error(`Build ${job.data.buildId} failed:`, err);
    });
  }

  // Queue a new build
  async queueBuild(projectPath, projectType, metadata = {}) {
    const buildId = crypto.randomBytes(16).toString('hex');
    const buildDir = path.join(this.buildsDir, buildId);
    
    await fs.mkdir(buildDir, { recursive: true });
    
    const job = await this.buildQueue.add({
      buildId,
      projectPath,
      projectType,
      buildDir,
      metadata,
      timestamp: new Date().toISOString()
    });
    
    return {
      buildId,
      jobId: job.id,
      status: 'queued',
      projectType,
      metadata
    };
  }

  // Execute build based on project type
  async executeBuild(projectPath, projectType, buildId) {
    const buildDir = path.join(this.buildsDir, buildId);
    const logFile = path.join(buildDir, 'build.log');
    
    try {
      // Copy source files to build directory
      await this.copyDirectory(projectPath, buildDir);
      
      let buildCommand;
      let outputDir;
      
      // Determine build command based on project type
      switch (projectType.type) {
        case 'nodejs':
          if (projectType.framework === 'react') {
            buildCommand = this.getReactBuildCommand(projectType.buildTool);
            outputDir = 'build';
          } else if (projectType.framework === 'nextjs') {
            buildCommand = this.getNextBuildCommand(projectType.buildTool);
            outputDir = '.next';
          } else if (projectType.framework === 'vue') {
            buildCommand = this.getVueBuildCommand(projectType.buildTool);
            outputDir = 'dist';
          } else {
            buildCommand = `${projectType.buildTool} install && ${projectType.buildTool} run build`;
            outputDir = 'dist';
          }
          break;
        
        case 'python':
          buildCommand = this.getPythonBuildCommand(projectType.buildTool);
          outputDir = 'dist';
          break;
        
        case 'static':
          // No build needed for static sites
          buildCommand = null;
          outputDir = '.';
          break;
        
        default:
          throw new Error(`Unsupported project type: ${projectType.type}`);
      }
      
      // Execute build command if needed
      if (buildCommand) {
        await this.runCommand(buildCommand, buildDir, logFile);
      }
      
      // Create build artifact
      const artifactPath = path.join(buildDir, 'artifact.tar.gz');
      await this.createArtifact(path.join(buildDir, outputDir), artifactPath);
      
      return {
        success: true,
        buildId,
        artifactPath,
        outputDir,
        buildLog: await fs.readFile(logFile, 'utf-8'),
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      await fs.writeFile(logFile, error.message, 'utf-8');
      
      return {
        success: false,
        buildId,
        error: error.message,
        buildLog: await fs.readFile(logFile, 'utf-8'),
        timestamp: new Date().toISOString()
      };
    }
  }

  // Get React build command
  getReactBuildCommand(buildTool) {
    const commands = {
      npm: 'npm ci && npm run build',
      yarn: 'yarn install --frozen-lockfile && yarn build',
      pnpm: 'pnpm install --frozen-lockfile && pnpm build'
    };
    return commands[buildTool] || commands.npm;
  }

  // Get Next.js build command
  getNextBuildCommand(buildTool) {
    const commands = {
      npm: 'npm ci && npm run build',
      yarn: 'yarn install --frozen-lockfile && yarn build',
      pnpm: 'pnpm install --frozen-lockfile && pnpm build'
    };
    return commands[buildTool] || commands.npm;
  }

  // Get Vue build command
  getVueBuildCommand(buildTool) {
    const commands = {
      npm: 'npm ci && npm run build',
      yarn: 'yarn install --frozen-lockfile && yarn build',
      pnpm: 'pnpm install --frozen-lockfile && pnpm build'
    };
    return commands[buildTool] || commands.npm;
  }

  // Get Python build command
  getPythonBuildCommand(buildTool) {
    const commands = {
      pip: 'pip install -r requirements.txt',
      pipenv: 'pipenv install',
      poetry: 'poetry install'
    };
    return commands[buildTool] || commands.pip;
  }

  // Run command in sandboxed environment
  runCommand(command, cwd, logFile) {
    return new Promise((resolve, reject) => {
      const process = exec(command, {
        cwd,
        env: {
          ...process.env,
          NODE_ENV: 'production',
          CI: 'true'
        },
        timeout: 600000, // 10 minutes timeout
        maxBuffer: 10 * 1024 * 1024 // 10MB buffer
      }, async (error, stdout, stderr) => {
        const log = `Command: ${command}\n\nSTDOUT:\n${stdout}\n\nSTDERR:\n${stderr}`;
        await fs.writeFile(logFile, log, 'utf-8');
        
        if (error) {
          reject(error);
        } else {
          resolve({ stdout, stderr });
        }
      });
    });
  }

  // Copy directory recursively
  async copyDirectory(src, dest) {
    await fs.mkdir(dest, { recursive: true });
    const entries = await fs.readdir(src, { withFileTypes: true });
    
    for (const entry of entries) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);
      
      if (entry.isDirectory()) {
        if (entry.name !== 'node_modules' && entry.name !== '.git') {
          await this.copyDirectory(srcPath, destPath);
        }
      } else {
        await fs.copyFile(srcPath, destPath);
      }
    }
  }

  // Create build artifact
  async createArtifact(sourceDir, outputPath) {
    return new Promise((resolve, reject) => {
      exec(`tar -czf ${outputPath} -C ${sourceDir} .`, (error) => {
        if (error) {
          reject(error);
        } else {
          resolve(outputPath);
        }
      });
    });
  }

  // Get build status
  async getBuildStatus(buildId) {
    const jobs = await this.buildQueue.getJobs(['waiting', 'active', 'completed', 'failed']);
    const job = jobs.find(j => j.data.buildId === buildId);
    
    if (!job) {
      return null;
    }
    
    return {
      buildId,
      status: await job.getState(),
      progress: job.progress(),
      data: job.data,
      result: job.returnvalue,
      failedReason: job.failedReason
    };
  }

  // Get build logs
  async getBuildLogs(buildId) {
    const logFile = path.join(this.buildsDir, buildId, 'build.log');
    
    try {
      const logs = await fs.readFile(logFile, 'utf-8');
      return {
        buildId,
        logs,
        exists: true
      };
    } catch (error) {
      return {
        buildId,
        logs: '',
        exists: false,
        error: error.message
      };
    }
  }
}

module.exports = new BuildService();