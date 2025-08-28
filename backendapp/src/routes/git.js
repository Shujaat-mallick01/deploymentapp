const express = require('express');
const gitService = require('../services/gitService');

const router = express.Router();

// Connect repository
router.post('/connect', async (req, res, next) => {
  try {
    const { repoUrl, token } = req.body;
    
    if (!repoUrl) {
      return res.status(400).json({ error: 'Repository URL is required' });
    }
    
    // Get repository info
    const repoInfo = await gitService.getRepositoryInfo(repoUrl, token);
    
    // Setup webhook
    const webhook = await gitService.setupWebhook(repoUrl, token);
    
    res.json({
      message: 'Repository connected successfully',
      repository: repoInfo,
      webhook
    });
  } catch (error) {
    next(error);
  }
});

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