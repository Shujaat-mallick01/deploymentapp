const express = require('express');
const passport = require('passport');
const gitService = require('../services/gitService');
const User = require('../models/User');

const router = express.Router();

// Connect repository (requires authentication)
router.post('/connect', 
  passport.authenticate('jwt', { session: false }),
  async (req, res, next) => {
    try {
      const { repoUrl } = req.body;
      const userId = req.user.id || req.user._id;
      
      if (!repoUrl) {
        return res.status(400).json({ error: 'Repository URL is required' });
      }
      
      // Detect provider from URL
      const provider = gitService.detectProvider(repoUrl);
      if (!provider) {
        return res.status(400).json({ error: 'Unsupported repository provider' });
      }
      
      // Get user with OAuth tokens
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      // Get the appropriate OAuth token based on provider
      let token = null;
      if (provider === 'github' && user.oauthTokens?.github?.accessToken) {
        token = user.oauthTokens.github.accessToken;
      } else if (provider === 'gitlab' && user.oauthTokens?.gitlab?.accessToken) {
        token = user.oauthTokens.gitlab.accessToken;
      } else if (provider === 'bitbucket' && user.oauthTokens?.bitbucket?.accessToken) {
        token = user.oauthTokens.bitbucket.accessToken;
      }
      
      if (!token) {
        return res.status(401).json({ 
          error: `No ${provider} authentication found. Please login with ${provider} first.`,
          provider,
          requiresAuth: true
        });
      }
      
      // Get repository info
      const repoInfo = await gitService.getRepositoryInfo(repoUrl, token);
      
      // Try to setup webhook (optional - don't fail if webhook setup fails)
      let webhook = null;
      try {
        webhook = await gitService.setupWebhook(repoUrl, token);
      } catch (webhookError) {
        console.warn('Webhook setup failed (non-critical):', webhookError.message);
        webhook = {
          error: webhookError.message,
          skipped: true,
          instructions: 'Webhook setup failed. You can still use the repository, but automatic deployments won\'t work.'
        };
      }
      
      res.json({
        message: 'Repository connected successfully',
        repository: repoInfo,
        webhook
      });
    } catch (error) {
      console.error('Repository connection error:', error);
      next(error);
    }
  }
);

// Webhook endpoint
router.post('/webhook', async (req, res, next) => {
  try {
    const signature = req.headers['x-hub-signature-256'] || req.headers['x-gitlab-token'];
    
    // Verify webhook signature
    if (signature && !gitService.verifyWebhookSignature(req.body, signature)) {
      return res.status(401).json({ error: 'Invalid webhook signature' });
    }
    
    // Parse webhook event
    const event = gitService.parseWebhookEvent(req.headers, req.body);
    
    if (!event) {
      return res.status(400).json({ error: 'Unsupported webhook event' });
    }
    
    // Clone repository and trigger build
    const cloneResult = await gitService.cloneRepository(event.url, event.branch, event.commit);
    
    if (cloneResult.success) {
      // Detect project type
      const projectType = await gitService.detectProjectType(cloneResult.path);
      
      // Queue build
      const buildService = require('../services/buildService');
      const buildJob = await buildService.queueBuild(cloneResult.path, projectType, {
        repository: event.repository,
        branch: event.branch,
        commit: event.commit,
        author: event.author
      });
      
      res.json({
        message: 'Build triggered successfully',
        event,
        build: buildJob
      });
    } else {
      res.status(500).json({
        error: 'Failed to clone repository',
        details: cloneResult.error
      });
    }
  } catch (error) {
    next(error);
  }
});

// List connected repositories
router.get('/repositories', async (req, res, next) => {
  try {
    // In production, fetch from database
    const repositories = [
      {
        id: '1',
        name: 'example-repo',
        fullName: 'user/example-repo',
        url: 'https://github.com/user/example-repo',
        defaultBranch: 'main',
        connected: true
      }
    ];
    
    res.json({ repositories });
  } catch (error) {
    next(error);
  }
});

// Disconnect repository
router.delete('/disconnect/:repoId', async (req, res, next) => {
  try {
    const { repoId } = req.params;
    
    // In production, remove webhook and database entry
    res.json({
      message: 'Repository disconnected successfully',
      repositoryId: repoId
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;