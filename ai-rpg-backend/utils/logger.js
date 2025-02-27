/**
 * Logger Utility
 * Provides consistent logging throughout the application
 */
const winston = require('winston');
const fs = require('fs');
const path = require('path');

// Create logs directory if it doesn't exist
const logDir = 'logs';
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}

// Define custom log format
const customFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// Create console format with colors
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({
    format: 'HH:mm:ss'
  }),
  winston.format.printf(({ level, message, timestamp, ...meta }) => {
    const metaStr = Object.keys(meta).length 
      ? `\n${JSON.stringify(meta, null, 2)}` 
      : '';
      
    return `${timestamp} ${level}: ${message}${metaStr}`;
  })
);

// Create the logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: customFormat,
  defaultMeta: { service: 'ai-rpg-backend' },
  transports: [
    // Write logs with level 'error' and below to error.log
    new winston.transports.File({ 
      filename: path.join(logDir, 'error.log'), 
      level: 'error' 
    }),
    
    // Write all logs to combined.log
    new winston.transports.File({ 
      filename: path.join(logDir, 'combined.log')
    }),
    
    // Write game-specific events to game-events.log
    new winston.transports.File({ 
      filename: path.join(logDir, 'game-events.log'),
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      )
    })
  ]
});

// If we're not in production, also log to the console
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: consoleFormat
  }));
}

// Additional helper methods
logger.gameEvent = (playerId, eventType, details) => {
  logger.info(`[GAME_EVENT] ${eventType}`, {
    playerId,
    eventType,
    ...details,
  });
};

logger.apiRequest = (req, res, duration) => {
  const { method, url, body, params, query } = req;
  const { statusCode } = res;
  
  logger.debug(`API ${method} ${url} [${statusCode}] ${duration}ms`, {
    method,
    url,
    statusCode,
    duration,
    body: process.env.LOG_FULL_BODY === 'true' ? body : undefined,
    params,
    query
  });
};

logger.tokenUsage = (playerId, prompt_tokens, completion_tokens, total_tokens) => {
  logger.info(`Token usage for ${playerId}`, {
    playerId,
    prompt_tokens,
    completion_tokens, 
    total_tokens
  });
};

logger.promptError = (playerId, error) => {
  logger.error(`Prompt error for ${playerId}`, {
    playerId,
    error: error.message,
    stack: error.stack
  });
};

// Export the logger
module.exports = logger;