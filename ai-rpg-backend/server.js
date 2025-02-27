/**
 * AI RPG Backend Server
 * Main entry point for the application
 */
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');

// Load environment variables
dotenv.config();

// Import logger
const logger = require('./utils/logger');

// Import route handlers
const gameRoutes = require('./routes/gameRoutes');
const playerRoutes = require('./routes/playerRoutes');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3001;

// Set up security headers
app.use(helmet());

// Configure CORS
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.CORS_ORIGIN || true
    : true
}));

// Configure rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// Apply rate limiter to all requests
app.use(limiter);

// Parse JSON bodies
app.use(express.json({ limit: '1mb' }));

// Setup request logging
// Create a logging middleware that times requests
app.use((req, res, next) => {
  const start = Date.now();
  
  // Once the request is finished
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.apiRequest(req, res, duration);
  });
  
  next();
});

// Setup Morgan logging for development
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

// Connect to MongoDB if configured
if (process.env.MONGODB_URI) {
  mongoose.connect(process.env.MONGODB_URI)
    .then(() => {
      console.log('✅ MongoDB Connected Successfully');
      // Log the database name
      console.log(`📚 Connected to database: ${mongoose.connection.name}`);
    })
    .catch((error) => {
      console.error('❌ MongoDB Connection Error:', error.message);
      // Log more detailed error information
      if (error.code === 'ENOTFOUND') {
        console.error('🔍 Database host not found. Check your connection string.');
      } else if (error.code === 'ETIMEDOUT') {
        console.error('⏱️ Database connection timed out. Check your network connection.');
      } else if (error.name === 'MongoServerSelectionError') {
        console.error('🔒 Authentication failed. Check your username and password.');
      }
      process.exit(1); // Exit if cannot connect to database
    });
}

// Monitor the connection
mongoose.connection.on('connected', () => {
  console.log('🔄 Mongoose connected to MongoDB');
});

mongoose.connection.on('error', (err) => {
  console.error('🚨 MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('❗ MongoDB disconnected');
});

// Handle application termination
process.on('SIGINT', async () => {
  await mongoose.connection.close();
  console.log('MongoDB connection closed through app termination');
  process.exit(0);
});

// Health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    // Check if database is connected
    if (mongoose.connection.readyState === 1) {
      res.json({ 
        status: 'ok',
        database: 'connected',
        databaseName: mongoose.connection.name
      });
    } else {
      res.status(503).json({ 
        status: 'error',
        database: 'disconnected',
        readyState: mongoose.connection.readyState
      });
    }
  } catch (error) {
    res.status(500).json({ 
      status: 'error',
      message: error.message 
    });
  }
});

// API routes
app.use('/api', gameRoutes);
app.use('/api/player', playerRoutes);

// Handle 404s
app.use((req, res, next) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.originalUrl} not found`
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err);
  
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'production' 
      ? 'An unexpected error occurred' 
      : err.message
  });
});

// Start the server
app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`OpenAI Model: ${process.env.OPENAI_MODEL || 'gpt-4-turbo'}`);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  
  // Exit with error code
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  
  // Exit with error code
  process.exit(1);
});