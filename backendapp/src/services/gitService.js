const crypto = require('crypto');
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs').promises;
const axios = require('axios');
const Project = require('../models/Project');
const Deployment = require('../models/Deployment');
const Build = require('../models/Build');
const { v4: uuidv4 } = require('uuid');

class GitService {
  constructor() {
    this.webhookSecret = process.env.WEBHOOK_SECRET || 'your-webhook-secret';
    this.reposDir = process.env.REPOS_DIR || path.join(__dirname, '../../repos');
    this.githubApiUrl = 'https://api.github.com';
    this.gitlabApiUrl = 'https://gitlab.com/api/v4';
    this.bitbucketApiUrl = 'https://api.bitbucket.org/2.0';
  }

  verifyWebhookSignature(provider, payload, signature, secret) {
    switch (provider) {
      case 'github':
        const githubHmac = crypto.createHmac('sha256', secret);
        const githubDigest = 'sha256=' + githubHmac.update(JSON.stringify(payload)).digest('hex');
        return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(githubDigest));
      
      case 'gitlab':
        return signature === secret;
      
      case 'bitbucket':
        const bitbucketHmac = crypto.createHmac('sha256', secret);
        const bitbucketDigest = bitbucketHmac.update(JSON.stringify(payload)).digest('hex');
        return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(bitbucketDigest));
      
      default:
        return false;
    }
  }

  parseWebhookEvent(provider, headers, payload) {
    switch (provider) {
      case 'github':
        return this.parseGitHubWebhook(headers, payload);
      case 'gitlab':
        return this.parseGitLabWebhook(headers, payload);
      case 'bitbucket':
        return this.parseBitbucketWebhook(headers, payload);
      default:
        return null;
    }
  }

  parseGitHubWebhook(headers, payload) {
    const event = headers['x-github-event'];
    
    if (event === 'push') {
      return {
        type: 'push',
        provider: 'github',
        repository: payload.repository.full_name,
        repositoryId: payload.repository.id,
        branch: payload.ref.replace('refs/heads/', ''),
        commit: payload.head_commit.id,
        author: payload.head_commit.author.name,
        authorEmail: payload.head_commit.author.email,
        message: payload.head_commit.message,
        url: payload.repository.clone_url,
        timestamp: payload.head_commit.timestamp
      };
    }
    
    if (event === 'pull_request') {
      return {
        type: 'pull_request',
        provider: 'github',
        action: payload.action,
        repository: payload.repository.full_name,
        repositoryId: payload.repository.id,
        branch: payload.pull_request.head.ref,
        targetBranch: payload.pull_request.base.ref,
        number: payload.pull_request.number,
        title: payload.pull_request.title,
        author: payload.pull_request.user.login,
        url: payload.pull_request.head.repo.clone_url,
        timestamp: payload.pull_request.updated_at
      };
    }
    
    return null;
  }

  parseGitLabWebhook(headers, payload) {
    const event = headers['x-gitlab-event'];
    
    if (event === 'Push Hook') {
      const lastCommit = payload.commits[payload.commits.length - 1];
      return {
        type: 'push',
        provider: 'gitlab',
        repository: payload.project.path_with_namespace,
        repositoryId: payload.project_id,
        branch: payload.ref.replace('refs/heads/', ''),
        commit: lastCommit.id,
        author: lastCommit.author.name,
        authorEmail: lastCommit.author.email,
        message: lastCommit.message,
        url: payload.project.git_http_url,
        timestamp: lastCommit.timestamp
      };
    }
    
    if (event === 'Merge Request Hook') {
      return {
        type: 'merge_request',
        provider: 'gitlab',
        action: payload.object_attributes.action,
        repository: payload.project.path_with_namespace,
        repositoryId: payload.project.id,
        branch: payload.object_attributes.source_branch,
        targetBranch: payload.object_attributes.target_branch,
        number: payload.object_attributes.iid,
        title: payload.object_attributes.title,
        author: payload.user.name,
        url: payload.project.git_http_url,
        timestamp: payload.object_attributes.updated_at
      };
    }
    
    return null;
  }

  parseBitbucketWebhook(headers, payload) {
    const event = headers['x-event-key'];
    
    if (event === 'repo:push') {
      const change = payload.push.changes[0];
      return {
        type: 'push',
        provider: 'bitbucket',
        repository: payload.repository.full_name,
        repositoryId: payload.repository.uuid,
        branch: change.new.name,
        commit: change.new.target.hash,
        author: change.new.target.author.raw,
        message: change.new.target.message,
        url: payload.repository.links.clone.find(l => l.name === 'https').href,
        timestamp: change.new.target.date
      };
    }
    
    if (event === 'pullrequest:created' || event === 'pullrequest:updated') {
      return {
        type: 'pull_request',
        provider: 'bitbucket',
        action: event.split(':')[1],
        repository: payload.repository.full_name,
        repositoryId: payload.repository.uuid,
        branch: payload.pullrequest.source.branch.name,
        targetBranch: payload.pullrequest.destination.branch.name,
        number: payload.pullrequest.id,
        title: payload.pullrequest.title,
        author: payload.pullrequest.author.display_name,
        url: payload.repository.links.clone.find(l => l.name === 'https').href,
        timestamp: payload.pullrequest.updated_on
      };
    }
    
    return null;
  }

  async cloneRepository(repoUrl, branch, commitHash, token) {
    const repoName = repoUrl.split('/').pop().replace('.git', '');
    const timestamp = Date.now();
    const cloneDir = path.join(this.reposDir, `${repoName}-${branch}-${timestamp}`);
    
    try {
      await fs.mkdir(this.reposDir, { recursive: true });
      
      let authUrl = repoUrl;
      if (token) {
        const urlParts = new URL(repoUrl);
        urlParts.username = 'oauth2';
        urlParts.password = token;
        authUrl = urlParts.toString();
      }
      
      execSync(`git clone --depth 1 --branch ${branch} ${authUrl} ${cloneDir}`, {
        stdio: 'pipe',
        timeout: 300000,
        env: { ...process.env, GIT_TERMINAL_PROMPT: '0' }
      });
      
      if (commitHash) {
        execSync(`cd ${cloneDir} && git fetch --depth 1 origin ${commitHash} && git checkout ${commitHash}`, {
          stdio: 'pipe',
          timeout: 60000
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
      { file: 'composer.json', type: 'php', buildTool: 'composer' },
      { file: 'Dockerfile', type: 'docker', buildTool: 'docker' }
    ];
    
    for (const check of checks) {
      try {
        await fs.access(path.join(projectPath, check.file));
        
        if (check.type === 'nodejs') {
          const packageJson = JSON.parse(
            await fs.readFile(path.join(projectPath, 'package.json'), 'utf-8')
          );
          
          const deps = {
            ...packageJson.dependencies,
            ...packageJson.devDependencies
          };
          
          if (deps.react || deps['react-dom']) return { ...check, framework: 'react', projectType: 'react' };
          if (deps.vue) return { ...check, framework: 'vue', projectType: 'vue' };
          if (deps['@angular/core']) return { ...check, framework: 'angular', projectType: 'angular' };
          if (deps.next) return { ...check, framework: 'nextjs', projectType: 'nextjs' };
          if (deps.nuxt) return { ...check, framework: 'nuxt', projectType: 'vue' };
          if (deps.svelte) return { ...check, framework: 'svelte', projectType: 'static' };
          if (deps.express || deps.fastify || deps.koa) return { ...check, framework: 'backend', projectType: 'nodejs' };
          
          return { ...check, framework: 'vanilla', projectType: 'static' };
        }
        
        if (check.type === 'python') {
          try {
            const requirements = await fs.readFile(path.join(projectPath, 'requirements.txt'), 'utf-8');
            if (requirements.includes('django')) return { ...check, framework: 'django', projectType: 'django' };
            if (requirements.includes('flask')) return { ...check, framework: 'flask', projectType: 'flask' };
            if (requirements.includes('fastapi')) return { ...check, framework: 'fastapi', projectType: 'python' };
          } catch (error) {}
          
          return { ...check, framework: 'python', projectType: 'python' };
        }
        
        return { ...check, projectType: check.type };
      } catch (error) {}
    }
    
    return { type: 'static', buildTool: 'none', projectType: 'static' };
  }

  async getGitHubRepositoryInfo(owner, repo, token) {
    try {
      const response = await axios.get(
        `${this.githubApiUrl}/repos/${owner}/${repo}`,
        {
          headers: {
            Authorization: `token ${token}`,
            Accept: 'application/vnd.github.v3+json'
          }
        }
      );
      
      return {
        provider: 'github',
        owner: response.data.owner.login,
        name: response.data.name,
        fullName: response.data.full_name,
        defaultBranch: response.data.default_branch,
        private: response.data.private,
        language: response.data.language,
        size: response.data.size,
        url: response.data.clone_url,
        description: response.data.description,
        topics: response.data.topics
      };
    } catch (error) {
      throw new Error(`Failed to fetch GitHub repository info: ${error.message}`);
    }
  }

  async getGitLabRepositoryInfo(projectId, token) {
    try {
      const response = await axios.get(
        `${this.gitlabApiUrl}/projects/${encodeURIComponent(projectId)}`,
        {
          headers: {
            'PRIVATE-TOKEN': token
          }
        }
      );
      
      return {
        provider: 'gitlab',
        owner: response.data.namespace.name,
        name: response.data.name,
        fullName: response.data.path_with_namespace,
        defaultBranch: response.data.default_branch,
        private: response.data.visibility !== 'public',
        language: null,
        size: response.data.statistics?.repository_size,
        url: response.data.http_url_to_repo,
        description: response.data.description,
        topics: response.data.topics
      };
    } catch (error) {
      throw new Error(`Failed to fetch GitLab repository info: ${error.message}`);
    }
  }

  async getBitbucketRepositoryInfo(workspace, repoSlug, token) {
    try {
      const response = await axios.get(
        `${this.bitbucketApiUrl}/repositories/${workspace}/${repoSlug}`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      
      return {
        provider: 'bitbucket',
        owner: response.data.workspace.slug,
        name: response.data.name,
        fullName: response.data.full_name,
        defaultBranch: response.data.mainbranch?.name || 'main',
        private: response.data.is_private,
        language: response.data.language,
        size: response.data.size,
        url: response.data.links.clone.find(l => l.name === 'https').href,
        description: response.data.description,
        topics: []
      };
    } catch (error) {
      throw new Error(`Failed to fetch Bitbucket repository info: ${error.message}`);
    }
  }

  async setupGitHubWebhook(owner, repo, token, webhookUrl, secret) {
    try {
      const response = await axios.post(
        `${this.githubApiUrl}/repos/${owner}/${repo}/hooks`,
        {
          name: 'web',
          active: true,
          events: ['push', 'pull_request'],
          config: {
            url: webhookUrl,
            content_type: 'json',
            secret: secret,
            insecure_ssl: '0'
          }
        },
        {
          headers: {
            Authorization: `token ${token}`,
            Accept: 'application/vnd.github.v3+json'
          }
        }
      );
      
      return {
        id: response.data.id,
        url: response.data.config.url,
        active: response.data.active,
        events: response.data.events,
        createdAt: response.data.created_at
      };
    } catch (error) {
      throw new Error(`Failed to setup GitHub webhook: ${error.message}`);
    }
  }

  async setupGitLabWebhook(projectId, token, webhookUrl, secret) {
    try {
      const response = await axios.post(
        `${this.gitlabApiUrl}/projects/${encodeURIComponent(projectId)}/hooks`,
        {
          url: webhookUrl,
          token: secret,
          push_events: true,
          merge_requests_events: true,
          enable_ssl_verification: true
        },
        {
          headers: {
            'PRIVATE-TOKEN': token
          }
        }
      );
      
      return {
        id: response.data.id,
        url: response.data.url,
        active: true,
        events: ['push', 'merge_request'],
        createdAt: response.data.created_at
      };
    } catch (error) {
      throw new Error(`Failed to setup GitLab webhook: ${error.message}`);
    }
  }

  async setupBitbucketWebhook(workspace, repoSlug, token, webhookUrl, secret) {
    try {
      const response = await axios.post(
        `${this.bitbucketApiUrl}/repositories/${workspace}/${repoSlug}/hooks`,
        {
          description: 'Deployment Platform Webhook',
          url: webhookUrl,
          active: true,
          events: [
            'repo:push',
            'pullrequest:created',
            'pullrequest:updated'
          ],
          secret: secret
        },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      
      return {
        id: response.data.uuid,
        url: response.data.url,
        active: response.data.active,
        events: response.data.events,
        createdAt: response.data.created_on
      };
    } catch (error) {
      throw new Error(`Failed to setup Bitbucket webhook: ${error.message}`);
    }
  }

  async handleWebhookEvent(event) {
    try {
      const project = await Project.findOne({
        repositoryUrl: { $regex: event.repository, $options: 'i' },
        branch: event.branch
      });
      
      if (!project || !project.autoDeploy) {
        return { success: false, message: 'Project not found or auto-deploy disabled' };
      }
      
      const deploymentId = uuidv4();
      const deployment = new Deployment({
        projectId: project._id,
        userId: project.userId,
        deploymentId: deploymentId,
        commitHash: event.commit,
        commitMessage: event.message,
        commitAuthor: event.author,
        branch: event.branch,
        trigger: 'webhook',
        status: 'queued',
        environment: event.branch === project.branch ? 'production' : 'preview',
        metadata: {
          buildCommand: project.buildCommand,
          installCommand: project.installCommand,
          outputDirectory: project.outputDirectory
        }
      });
      
      await deployment.save();
      
      project.lastDeployment = deployment._id;
      project.statistics.totalDeployments++;
      await project.save();
      
      return {
        success: true,
        deploymentId: deploymentId,
        message: 'Deployment queued successfully'
      };
    } catch (error) {
      console.error('Error handling webhook event:', error);
      return {
        success: false,
        message: error.message
      };
    }
  }

  async cleanupOldRepositories() {
    try {
      const repos = await fs.readdir(this.reposDir);
      const now = Date.now();
      const maxAge = 24 * 60 * 60 * 1000;
      
      for (const repo of repos) {
        const repoPath = path.join(this.reposDir, repo);
        const stats = await fs.stat(repoPath);
        
        if (now - stats.mtimeMs > maxAge) {
          await fs.rm(repoPath, { recursive: true, force: true });
        }
      }
    } catch (error) {
      console.error('Error cleaning up old repositories:', error);
    }
  }
}

module.exports = new GitService();