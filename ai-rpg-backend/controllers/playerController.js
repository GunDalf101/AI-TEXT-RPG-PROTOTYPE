/**
 * Player Controller
 * Handles player profile management, preferences, and statistics
 */
const mongoose = require('mongoose');
const logger = require('../utils/logger');

// Check if MongoDB is connected
const mongoConnected = mongoose.connection.readyState === 1;

// Import models if MongoDB is connected
const Player = mongoConnected ? require('../models/player') : null;

// In-memory storage fallback
const playerProfiles = new Map();

/**
 * Create or update player profile
 * @param {object} req - Request object
 * @param {object} res - Response object
 */
exports.updatePlayerProfile = async (req, res) => {
  try {
    const { playerId, name, email, preferences } = req.body;
    
    if (!playerId) {
      return res.status(400).json({ 
        error: 'Missing player ID',
        message: 'A valid player ID is required'
      });
    }
    
    // Create player data object
    const playerData = {
      playerId,
      name: name || 'Adventurer',
      lastActive: new Date().toISOString()
    };
    
    // Add email if provided
    if (email) {
      playerData.email = email;
    }
    
    // Add preferences if provided
    if (preferences && typeof preferences === 'object') {
      playerData.preferences = preferences;
    }
    
    let player;
    
    if (mongoConnected) {
      // Save to MongoDB
      const result = await Player.findOneAndUpdate(
        { playerId },
        playerData,
        { upsert: true, new: true }
      );
      
      // Convert to API format
      player = result.toAPI ? result.toAPI() : result.toObject();
    } else {
      // Save to in-memory map
      const existingProfile = playerProfiles.get(playerId) || {};
      player = {
        ...existingProfile,
        ...playerData,
        createdAt: existingProfile.createdAt || new Date().toISOString()
      };
      playerProfiles.set(playerId, player);
    }
    
    res.json({
      success: true,
      message: 'Player profile updated',
      player
    });
  } catch (error) {
    logger.error('Error updating player profile:', error);
    res.status(500).json({
      error: 'Failed to update player profile',
      message: error.message
    });
  }
};

/**
 * Get player profile
 * @param {object} req - Request object
 * @param {object} res - Response object
 */
exports.getPlayerProfile = async (req, res) => {
  try {
    const { playerId } = req.params;
    
    if (!playerId) {
      return res.status(400).json({ error: 'Missing player ID' });
    }
    
    let player;
    
    if (mongoConnected) {
      // Get from MongoDB
      const result = await Player.findOne({ playerId });
      
      if (!result) {
        return res.status(404).json({ 
          error: 'Player not found',
          message: 'No player found with this ID'
        });
      }
      
      // Convert to API format
      player = result.toAPI ? result.toAPI() : result.toObject();
    } else {
      // Get from in-memory map
      player = playerProfiles.get(playerId);
      
      if (!player) {
        return res.status(404).json({ 
          error: 'Player not found',
          message: 'No player found with this ID'
        });
      }
    }
    
    res.json({ player });
  } catch (error) {
    logger.error('Error getting player profile:', error);
    res.status(500).json({
      error: 'Failed to get player profile',
      message: error.message
    });
  }
};

/**
 * Update player preferences
 * @param {object} req - Request object
 * @param {object} res - Response object
 */
exports.updatePreferences = async (req, res) => {
  try {
    const { playerId } = req.params;
    const { preferences } = req.body;
    
    if (!playerId) {
      return res.status(400).json({ error: 'Missing player ID' });
    }
    
    if (!preferences || typeof preferences !== 'object') {
      return res.status(400).json({ 
        error: 'Invalid preferences',
        message: 'Preferences must be a valid object'
      });
    }
    
    let player;
    
    if (mongoConnected) {
      // Update in MongoDB
      const result = await Player.findOneAndUpdate(
        { playerId },
        { preferences, lastActive: new Date() },
        { new: true }
      );
      
      if (!result) {
        return res.status(404).json({ error: 'Player not found' });
      }
      
      // Convert to API format
      player = result.toAPI ? result.toAPI() : result.toObject();
    } else {
      // Update in-memory map
      const existingProfile = playerProfiles.get(playerId);
      
      if (!existingProfile) {
        return res.status(404).json({ error: 'Player not found' });
      }
      
      player = {
        ...existingProfile,
        preferences,
        lastActive: new Date().toISOString()
      };
      
      playerProfiles.set(playerId, player);
    }
    
    res.json({
      success: true,
      message: 'Preferences updated',
      preferences: player.preferences
    });
  } catch (error) {
    logger.error('Error updating preferences:', error);
    res.status(500).json({
      error: 'Failed to update preferences',
      message: error.message
    });
  }
};

/**
 * Get player achievements
 * @param {object} req - Request object
 * @param {object} res - Response object
 */
exports.getAchievements = async (req, res) => {
  try {
    const { playerId } = req.params;
    
    if (!playerId) {
      return res.status(400).json({ error: 'Missing player ID' });
    }
    
    let achievements = [];
    
    if (mongoConnected) {
      // Get from MongoDB
      const player = await Player.findOne({ playerId });
      
      if (!player) {
        return res.status(404).json({ error: 'Player not found' });
      }
      
      achievements = player.achievements || [];
    } else {
      // Get from in-memory map
      const player = playerProfiles.get(playerId);
      
      if (!player) {
        return res.status(404).json({ error: 'Player not found' });
      }
      
      achievements = player.achievements || [];
    }
    
    res.json({
      playerId,
      achievements,
      totalAchievements: achievements.length
    });
  } catch (error) {
    logger.error('Error getting achievements:', error);
    res.status(500).json({
      error: 'Failed to get achievements',
      message: error.message
    });
  }
};

/**
 * Update player statistics
 * @param {object} req - Request object
 * @param {object} res - Response object
 */
exports.updateStatistics = async (req, res) => {
  try {
    const { playerId } = req.params;
    const { statistics } = req.body;
    
    if (!playerId) {
      return res.status(400).json({ error: 'Missing player ID' });
    }
    
    if (!statistics || typeof statistics !== 'object') {
      return res.status(400).json({ 
        error: 'Invalid statistics',
        message: 'Statistics must be a valid object'
      });
    }
    
    // Validate statistics values (ensure they're numbers)
    for (const [key, value] of Object.entries(statistics)) {
      if (typeof value !== 'number') {
        return res.status(400).json({
          error: 'Invalid statistics',
          message: `Value for ${key} must be a number`
        });
      }
    }
    
    let player;
    let updatedStats;
    
    if (mongoConnected) {
      // First get current statistics
      const existingPlayer = await Player.findOne({ playerId });
      
      if (!existingPlayer) {
        return res.status(404).json({ error: 'Player not found' });
      }
      
      // Merge existing and new statistics
      const currentStats = existingPlayer.statistics || {};
      const newStats = {};
      
      // For each statistic, increment the current value
      for (const [key, value] of Object.entries(statistics)) {
        const currentValue = currentStats[key] || 0;
        newStats[`statistics.${key}`] = currentValue + value;
      }
      
      // Update in MongoDB
      const result = await Player.findOneAndUpdate(
        { playerId },
        { $set: newStats, lastActive: new Date() },
        { new: true }
      );
      
      // Convert to API format
      player = result.toAPI ? result.toAPI() : result.toObject();
      updatedStats = player.statistics;
      
      // Check for achievements
      await checkForStatisticAchievements(playerId, updatedStats);
    } else {
      // Update in-memory map
      const existingProfile = playerProfiles.get(playerId);
      
      if (!existingProfile) {
        return res.status(404).json({ error: 'Player not found' });
      }
      
      const currentStats = existingProfile.statistics || {};
      const newStats = { ...currentStats };
      
      // For each statistic, increment the current value
      for (const [key, value] of Object.entries(statistics)) {
        newStats[key] = (newStats[key] || 0) + value;
      }
      
      player = {
        ...existingProfile,
        statistics: newStats,
        lastActive: new Date().toISOString()
      };
      
      playerProfiles.set(playerId, player);
      updatedStats = newStats;
    }
    
    res.json({
      success: true,
      message: 'Statistics updated',
      statistics: updatedStats
    });
  } catch (error) {
    logger.error('Error updating statistics:', error);
    res.status(500).json({
      error: 'Failed to update statistics',
      message: error.message
    });
  }
};

/**
 * Check for achievements based on player statistics
 * @param {string} playerId - Player ID
 * @param {object} statistics - Updated player statistics
 */
async function checkForStatisticAchievements(playerId, statistics) {
  // Skip if not using MongoDB or statistics not provided
  if (!mongoConnected || !statistics) {
    return;
  }
  
  try {
    const player = await Player.findOne({ playerId });
    
    if (!player) {
      return;
    }
    
    // Define achievement thresholds
    const achievementDefinitions = [
      {
        id: 'prolific_adventurer',
        name: 'Prolific Adventurer',
        description: 'Performed 100 game actions',
        condition: () => statistics.actionsPerformed >= 100,
        alreadyHas: () => player.achievements.some(a => a.id === 'prolific_adventurer')
      },
      {
        id: 'master_explorer',
        name: 'Master Explorer',
        description: 'Discovered 25 unique locations',
        condition: () => statistics.locationsDiscovered >= 25,
        alreadyHas: () => player.achievements.some(a => a.id === 'master_explorer')
      },
      {
        id: 'quest_master',
        name: 'Quest Master',
        description: 'Completed 10 quests',
        condition: () => statistics.questsCompleted >= 10,
        alreadyHas: () => player.achievements.some(a => a.id === 'quest_master')
      },
      {
        id: 'treasure_hunter',
        name: 'Treasure Hunter',
        description: 'Collected 50 items',
        condition: () => statistics.itemsCollected >= 50,
        alreadyHas: () => player.achievements.some(a => a.id === 'treasure_hunter')
      },
      {
        id: 'seasoned_adventurer',
        name: 'Seasoned Adventurer',
        description: 'Started 5 different games',
        condition: () => statistics.gamesStarted >= 5,
        alreadyHas: () => player.achievements.some(a => a.id === 'seasoned_adventurer')
      }
    ];
    
    // Check each achievement
    for (const achievement of achievementDefinitions) {
      // Skip if player already has this achievement
      if (achievement.alreadyHas()) {
        continue;
      }
      
      // Check if condition is met
      if (achievement.condition()) {
        // Add the achievement
        player.achievements.push({
          id: achievement.id,
          name: achievement.name,
          description: achievement.description,
          unlockedAt: new Date()
        });
        
        logger.info(`Achievement unlocked for ${playerId}: ${achievement.name}`);
      }
    }
    
    // Save if any achievements were added
    if (player.isModified('achievements')) {
      await player.save();
    }
  } catch (error) {
    logger.error(`Error checking achievements for ${playerId}:`, error);
  }
}