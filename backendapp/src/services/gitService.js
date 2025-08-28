const crypto = require('crypto');
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs').promises;

class GitService {
  constructor() {
    this.webhookSecret = process.env.WEBHOOK_SECRET || 'your-webhook-secret';
    this.reposDir = process.env.REPOS_DIR || path.join(__dirname, '../../repos');
  }

  // Verify GitHub webhook signature
  verifyWebhookSignature(payload, signature) {
    const hmac = crypto.createHmac('sha256', this.webhookSecret);
    const digest = 'sha256=' + hmac.update(JSON.stringify(payload)).digest('hex');
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest));
  }

  // Parse webhook event
  parseWebhookEvent(headers, payload) {
    const event = headers['x-github-event'] || headers['x-gitlab-event'];
    
    if (event === 'push') {
      return {
        type: 'push',
        repository: payload.repository.full_name,
        branch: payload.ref.replace('refs/heads/', ''),
        commit: payload.head_commit.id,
        author: payload.head_commit.author.name,
        message: payload.head_commit.message,
        url: payload.repository.clone_url
      };
    }
    
    if (event === 'pull_request') {
      return {
        type: 'pull_request',
        action: payload.action,
        repository: payload.repository.full_name,
        branch: payload.pull_request.head.ref,
        targetBranch: payload.pull_request.base.ref,
        number: payload.pull_request.number,
        title: payload.pull_request.title,
        url: payload.pull_request.head.repo.clone_url
      };
    }
    
    return null;
  }

  // Clone repository
  async cloneRepository(repoUrl, branch, commitHash) {
    const repoName = repoUrl.split('/').pop().replace('.git', '');
    const timestamp = Date.now();
    const cloneDir = path.join(this.reposDir, `${repoName}-${branch}-${timestamp}`);
    
    try {
      // Ensure repos directory exists
      await fs.mkdir(this.reposDir, { recursive: true });
      
      // Clone the repository
      execSync(`git clone --depth 1 --branch ${branch} ${repoUrl} ${cloneDir}`, {
        stdio: 'pipe',
        timeout: 60000 // 1 minute timeout
      });
      
      // Checkout specific commit if provided
      if (commitHash) {
        execSync(`cd ${cloneDir} && git checkout ${commitHash}`, {
          stdio: 'pipe'
        });
      }
      
      return {
        success: true,
        path: cloneDir,
        repository: repoName,
        branch,
        commit: commitHash
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        repository: repoName,
        branch
      };
    }
  }

  // Detect project type
  async detectProjectType(projectPath) {
    const checks = [
      { file: 'package.json', type: 'nodejs', buildTool: 'npm' },
      { file: 'yarn.lock', type: 'nodejs', buildTool: 'yarn' },
      { file: 'pnpm-lock.yaml', type: 'nodejs', buildTool: 'pnpm' },
      { file: 'requirements.txt', type: 'python', buildTool: 'pip' },
      { file: 'Pipfile', type: 'python', buildTool: 'pipenv' },
      { file: 'poetry.lock', type: 'python', buildTool: 'poetry' },
      { file: 'Gemfile', type: 'ruby', buildTool: 'bundler' },
      { file: 'go.mod', type: 'go', buildTool: 'go' },
      { file: 'Cargo.toml', type: 'rust', buildTool: 'cargo' },
      { file: 'pom.xml', type: 'java', buildTool: 'maven' },
      { file: 'build.gradle', type: 'java', buildTool: 'gradle' },
      { file: 'composer.json', type: 'php', buildTool: 'composer' }
    ];
    
    for (const check of checks) {
      try {
        await fs.access(path.join(projectPath, check.file));
        
        // For Node.js projects, check if it's a frontend framework
        if (check.type === 'nodejs') {
          const packageJson = JSON.parse(
            await fs.readFile(path.join(projectPath, 'package.json'), 'utf-8')
          );
          
          const deps = {
            ...packageJson.dependencies,
            ...packageJson.devDependencies
          };
          
          if (deps.react) return { ...check, framework: 'react' };
          if (deps.vue) return { ...check, framework: 'vue' };
          if (deps['@angular/core']) return { ...check, framework: 'angular' };
          if (deps.next) return { ...check, framework: 'nextjs' };
          if (deps.nuxt) return { ...check, framework: 'nuxt' };
          if (deps.svelte) return { ...check, framework: 'svelte' };
          if (deps.express || deps.fastify || deps.koa) return { ...check, framework: 'backend' };
        }
        
        return check;
      } catch (error) {
        // File doesn't exist, continue checking
      }
    }
    
    // Default to static site if no framework detected
    return { type: 'static', buildTool: 'none' };
  }

  // Get repository info
  async getRepositoryInfo(repoUrl, token) {
    // Parse repository URL
    const match = repoUrl.match(/github\.com[:/]([^/]+)\/([^.]+)/);
    if (!match) {
      throw new Error('Invalid GitHub repository URL');
    }
    
    const [, owner, repo] = match;
    
    // Here you would make API calls to GitHub to get repo info
    // For now, returning mock data
    return {
      owner,
      name: repo.replace('.git', ''),
      fullName: `${owner}/${repo}`,
      defaultBranch: 'main',
      private: false,
      language: 'JavaScript',
      size: 1024,
      url: repoUrl
    };
  }

  // Setup webhook for repository
  async setupWebhook(repoUrl, token) {
    const webhookUrl = process.env.WEBHOOK_URL || 'https://your-domain.com/api/git/webhook';
    
    // Here you would make API calls to GitHub to create webhook
    // For now, returning mock data
    return {
      id: crypto.randomBytes(16).toString('hex'),
      url: webhookUrl,
      active: true,
      events: ['push', 'pull_request'],
      createdAt: new Date().toISOString()
    };
  }
}

module.exports = new GitService();