const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const dotenv = require('dotenv');
const winston = require('winston');
const path = require('path');

// Load environment variables
dotenv.config();

// Import routes
const authRoutes = require('./routes/auth');
const gitRoutes = require('./routes/git');
const buildRoutes = require('./routes/build');
const deploymentRoutes = require('./routes/deployment');
const domainRoutes = require('./routes/domain');
const monitoringRoutes = require('./routes/monitoring');

// Import middleware
const { authenticate } = require('./middleware/auth');
const errorHandler = require('./middleware/errorHandler');

// Configure logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

// Create Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/git', authenticate, gitRoutes);
app.use('/api/build', authenticate, buildRoutes);
app.use('/api/deployment', authenticate, deploymentRoutes);
app.use('/api/domain', authenticate, domainRoutes);
app.use('/api/monitoring', authenticate, monitoringRoutes);

// Error handling middleware
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
  console.log(`Web Deployment Platform API running on http://localhost:${PORT}`);
});

module.exports = app;