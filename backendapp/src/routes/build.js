const express = require('express');
const buildService = require('../services/buildService');

const router = express.Router();

// Trigger manual build
router.post('/trigger', async (req, res, next) => {
  try {
    const { projectPath, projectType } = req.body;
    
    if (!projectPath || !projectType) {
      return res.status(400).json({ error: 'Project path and type are required' });
    }
    
    const buildJob = await buildService.queueBuild(projectPath, projectType);
    
    res.json({
      message: 'Build queued successfully',
      build: buildJob
    });
  } catch (error) {
    next(error);
  }
});

// Get build status
router.get('/:buildId/status', async (req, res, next) => {
  try {
    const { buildId } = req.params;
    const status = await buildService.getBuildStatus(buildId);
    
    if (!status) {
      return res.status(404).json({ error: 'Build not found' });
    }
    
    res.json(status);
  } catch (error) {
    next(error);
  }
});

// Get build logs
router.get('/:buildId/logs', async (req, res, next) => {
  try {
    const { buildId } = req.params;
    const logs = await buildService.getBuildLogs(buildId);
    
    if (!logs.exists) {
      return res.status(404).json({ error: 'Build logs not found' });
    }
    
    res.json(logs);
  } catch (error) {
    next(error);
  }
});

// List builds
router.get('/', async (req, res, next) => {
  try {
    const { status, limit = 20, offset = 0 } = req.query;
    
    // In production, fetch from database
    const builds = [
      {
        buildId: '123',
        projectType: { type: 'nodejs', framework: 'react' },
        status: 'completed',
        createdAt: new Date().toISOString()
      }
    ];
    
    res.json({
      builds,
      total: builds.length,
      limit: Number(limit),
      offset: Number(offset)
    });
  } catch (error) {
    next(error);
  }
});

// Cancel build
router.post('/:buildId/cancel', async (req, res, next) => {
  try {
    const { buildId } = req.params;
    
    // In production, cancel the build job
    res.json({
      message: 'Build cancelled successfully',
      buildId
    });
  } catch (error) {
    next(error);
  }
});

// Rebuild
router.post('/:buildId/rebuild', async (req, res, next) => {
  try {
    const { buildId } = req.params;
    
    // Get original build details
    const originalBuild = await buildService.getBuildStatus(buildId);
    
    if (!originalBuild) {
      return res.status(404).json({ error: 'Original build not found' });
    }
    
    // Queue new build with same parameters
    const newBuild = await buildService.queueBuild(
      originalBuild.data.projectPath,
      originalBuild.data.projectType,
      {
        ...originalBuild.data.metadata,
        rebuildFrom: buildId
      }
    );
    
    res.json({
      message: 'Rebuild queued successfully',
      originalBuildId: buildId,
      newBuild
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;