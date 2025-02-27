/**
 * Game Controller
 * Handles all game-related operations in the RPG
 */
const { OpenAI } = require('openai');
const mongoose = require('mongoose');
const worldGenerator = require('../services/worldGenerator');
const promptBuilder = require('../utils/promptBuilder');
const responseParser = require('../utils/responseParser');
const logger = require('../utils/logger');

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Create Game model if it doesn't exist
const gameSchema = new mongoose.Schema({
  playerId: { type: String, required: true, unique: true },
  state: { type: Object, required: true },
  updatedAt: { type: Date, default: Date.now }
});

const Game = mongoose.model('Game', gameSchema);

// Check if MongoDB is connected
const mongoConnected = mongoose.connection.readyState === 1;

// Import models if MongoDB is connected
const Player = mongoConnected ? require('../models/player') : null;

// In-memory storage fallback
const gameStates = new Map();

/**
 * Process a player action through the LLM
 * @param {object} req - Request object
 * @param {object} res - Response object
 */
exports.processAction = async (req, res) => {
  try {
    const { playerId, action, gameState } = req.body;
    
    if (!playerId || !action) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        details: 'Both playerId and action are required'
      });
    }
    
    // Log the action request
    logger.info(`[ACTION] Player ${playerId} performing: "${action}"`);
    
    // Get current state or use provided one
    let currentState = gameState;
    
    if (!currentState) {
      currentState = await loadGameState(playerId);
      
      // If no saved state, initialize a new one
      if (!currentState) {
        currentState = await initializeGameState(playerId);
      }
    }
    
    // Check if game is over
    if (currentState.gameOver) {
      return res.status(400).json({
        error: 'Game over',
        message: 'This adventure has ended. Please start a new game.',
        gameState: currentState
      });
    }
    
    // Start timing for performance metrics
    const startTime = Date.now();
    
    // Build prompt for the LLM
    const prompt = promptBuilder.buildGamePrompt(action, currentState);
    
    // Call the LLM API
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4-turbo",
      messages: prompt,
      temperature: 0.7,
      max_tokens: 800,
      top_p: 1,
      frequency_penalty: 0.3,
      presence_penalty: 0.5,
    });
    
    // Calculate response time
    const responseTime = Date.now() - startTime;
    
    // Parse and validate the LLM response
    const { narrative, stateChanges } = responseParser.parseGameResponse(
      completion.choices[0].message.content,
      currentState
    );
    
    // Log the response details
    logger.info(`[LLM] Response for ${playerId}`, {
      responseTime: `${responseTime}ms`,
      narrativeLength: narrative.length,
      stateChanges: Object.keys(stateChanges)
    });
    
    // Update game state with the changes
    const updatedState = updateGameState(currentState, action, narrative, stateChanges);
    
    // Save the updated state
    await saveGameState(playerId, updatedState);
    
    // Update player statistics
    await updatePlayerStatistics(playerId, 'actionPerformed', {
      location: updatedState.currentLocation.id,
      actionType: getActionType(action)
    });
    
    // Send response
    res.json({
      narrative,
      stateChanges,
      gameState: updatedState,
      metadata: {
        responseTime,
        promptTokens: completion.usage?.prompt_tokens,
        completionTokens: completion.usage?.completion_tokens,
        totalTokens: completion.usage?.total_tokens
      }
    });
  } catch (error) {
    logger.error('Error processing action:', error);
    res.status(500).json({
      error: 'Failed to process game action',
      message: process.env.NODE_ENV === 'production' 
        ? 'An unexpected error occurred processing your action' 
        : error.message
    });
  }
};

/**
 * Save the current game state
 * @param {object} req - Request object 
 * @param {object} res - Response object
 */
exports.saveGame = async (req, res) => {
  try {
    const { playerId, gameState } = req.body;
    
    if (!playerId || !gameState) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Save the game state
    const success = await saveGameState(playerId, gameState);
    
    if (success) {
      res.json({
        success: true,
        message: 'Game saved successfully',
        timestamp: new Date().toISOString()
      });
    } else {
      throw new Error('Failed to save game state');
    }
  } catch (error) {
    logger.error('Error saving game:', error);
    res.status(500).json({
      error: 'Failed to save game',
      message: error.message
    });
  }
};

/**
 * Load a saved game state
 * @param {object} req - Request object
 * @param {object} res - Response object
 */
exports.loadGame = async (req, res) => {
  try {
    const { playerId } = req.params;

    // Check MongoDB connection
    if (mongoose.connection.readyState !== 1) {
      throw new Error('Database connection not available');
    }

    // Try to find existing game state
    const savedGame = await Game.findOne({ playerId });
    
    if (savedGame) {
      res.json({ success: true, gameState: savedGame.state });
    } else {
      // Return initial game state if no saved game found
      res.json({ 
        success: true, 
        gameState: {
          player: {
            health: 100,
            inventory: ['torch', 'map', 'water flask'],
            quests: [],
            experience: 0,
            skills: {}
          },
          world: {
            name: 'Eldoria',
            type: 'fantasy'
          },
          currentLocation: {
            id: 'forest_edge',
            name: 'Forest Edge',
            description: 'A dense, misty forest with ancient trees.'
          },
          gameHistory: [{
            type: 'narrative',
            text: 'You find yourself standing at the edge of a dense, misty forest. A narrow path winds its way between ancient trees, disappearing into the shadows. The air is thick with the scent of moss and rain.'
          }],
          discoveredLocations: ['forest_edge'],
          npcRelationships: {},
          timeElapsed: 0,
          lastAction: null
        }
      });
    }
  } catch (error) {
    console.error('Load game error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to load game' 
    });
  }
};

/**
 * Start a new game
 * @param {object} req - Request object
 * @param {object} res - Response object
 */
exports.newGame = async (req, res) => {
  try {
    const { playerId, worldType, characterName } = req.body;
    
    if (!playerId) {
      return res.status(400).json({ error: 'Missing player ID' });
    }
    
    // Initialize a new game state
    const gameState = await initializeGameState(playerId, worldType, characterName);
    
    // Update player statistics
    await updatePlayerStatistics(playerId, 'gameStarted', { worldType });
    
    res.json({
      gameState,
      message: 'New game created successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error creating new game:', error);
    res.status(500).json({
      error: 'Failed to create new game',
      message: error.message
    });
  }
};

/**
 * Get statistics for the current game
 * @param {object} req - Request object
 * @param {object} res - Response object
 */
exports.getGameStats = async (req, res) => {
  try {
    const { playerId } = req.params;
    
    if (!playerId) {
      return res.status(400).json({ error: 'Missing player ID' });
    }
    
    // Load current game state
    const gameState = await loadGameState(playerId);
    
    if (!gameState) {
      return res.status(404).json({ error: 'No game found for this player' });
    }
    
    // Extract statistics from game state
    const stats = {
      player: {
        health: gameState.player.health,
        level: gameState.player.level || 1,
        experience: gameState.player.experience || 0,
        inventory: {
          size: gameState.player.inventory.length,
          items: gameState.player.inventory
        },
        quests: {
          active: gameState.player.quests.length,
          details: gameState.player.quests
        }
      },
      world: {
        name: gameState.world.name,
        type: gameState.world.type,
        currentLocation: gameState.currentLocation.name,
        discoveredLocations: gameState.discoveredLocations.length,
        npcRelationships: Object.entries(gameState.npcRelationships).map(([name, value]) => ({
          name,
          value
        }))
      },
      game: {
        actionsTaken: gameState.gameHistory.filter(entry => entry.type === 'action').length,
        daysElapsed: Math.floor(gameState.timeElapsed / 24),
        timeElapsed: gameState.timeElapsed,
        gameStarted: gameState.created,
        lastAction: gameState.lastAction
      }
    };
    
    res.json({ stats });
  } catch (error) {
    logger.error('Error getting game stats:', error);
    res.status(500).json({
      error: 'Failed to get game statistics',
      message: error.message
    });
  }
};

/**
 * Generate additional game content (locations, NPCs, items, etc.)
 * @param {object} req - Request object
 * @param {object} res - Response object
 */
exports.generateContent = async (req, res) => {
  try {
    const { playerId, contentType, parameters } = req.body;
    
    if (!playerId || !contentType) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Load game state for context
    const gameState = await loadGameState(playerId);
    
    if (!gameState) {
      return res.status(404).json({ error: 'No game found for this player' });
    }
    
    // Build prompt for content generation
    const prompt = promptBuilder.generateSpecializedPrompt(contentType, {
      ...parameters,
      worldType: gameState.world.type,
      worldName: gameState.world.name,
      currentLocation: gameState.currentLocation.name
    });
    
    // Call the LLM
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4-turbo",
      messages: prompt,
      temperature: 0.8,
      max_tokens: 600,
      top_p: 1
    });
    
    // Parse the response
    let content;
    
    try {
      // Try to parse as JSON
      content = JSON.parse(completion.choices[0].message.content);
    } catch (e) {
      // Fallback to raw text if not valid JSON
      content = { 
        text: completion.choices[0].message.content,
        error: 'Could not parse as JSON'
      };
    }
    
    res.json({
      content,
      contentType,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error generating content:', error);
    res.status(500).json({
      error: 'Failed to generate content',
      message: error.message
    });
  }
};

/**
 * Helper Functions
 */

/**
 * Update game state based on player action and LLM response
 * @param {object} currentState - Current game state
 * @param {string} action - Player action text
 * @param {string} narrative - Narrative response from LLM
 * @param {object} stateChanges - State changes from LLM
 * @returns {object} - Updated game state
 */
function updateGameState(currentState, action, narrative, stateChanges) {
  // Create a deep clone of the current state
  const newState = JSON.parse(JSON.stringify(currentState));
  
  // Add the action and response to history
  newState.gameHistory.push({ type: 'action', text: action });
  newState.gameHistory.push({ type: 'narrative', text: narrative });
  
  // Update last action timestamp
  newState.lastAction = {
    text: action,
    timestamp: new Date().toISOString()
  };
  
  // Apply state changes from LLM
  if (stateChanges) {
    // Update health if provided
    if (stateChanges.health !== undefined) {
      newState.player.health = stateChanges.health;
      
      // Check for player death
      if (newState.player.health <= 0) {
        newState.gameHistory.push({
          type: 'system',
          text: 'You have died. Game over.'
        });
        newState.gameOver = true;
      }
    }
    
    // Add items to inventory
    if (stateChanges.addItems && Array.isArray(stateChanges.addItems)) {
      stateChanges.addItems.forEach(item => {
        // Don't add duplicate items
        if (!newState.player.inventory.includes(item)) {
          newState.player.inventory.push(item);
          
          // Add a subtle notification to history
          newState.gameHistory.push({
            type: 'system',
            text: `Added to inventory: ${item}`
          });
        }
      });
    }
    
    // Remove items from inventory
    if (stateChanges.removeItems && Array.isArray(stateChanges.removeItems)) {
      stateChanges.removeItems.forEach(item => {
        const index = newState.player.inventory.indexOf(item);
        if (index !== -1) {
          newState.player.inventory.splice(index, 1);
          
          // Add a subtle notification to history
          newState.gameHistory.push({
            type: 'system',
            text: `Removed from inventory: ${item}`
          });
        }
      });
    }
    
    // Update location
    if (stateChanges.newLocation) {
      newState.currentLocation = stateChanges.newLocation;
      
      // Add location to discovered locations if not already present
      if (stateChanges.newLocation.id && !newState.discoveredLocations.includes(stateChanges.newLocation.id)) {
        newState.discoveredLocations.push(stateChanges.newLocation.id);
        
        // Add experience for discovering a new location
        newState.player.experience = (newState.player.experience || 0) + 10;
        
        // Add a subtle notification to history
        newState.gameHistory.push({
          type: 'system',
          text: `Discovered new location: ${stateChanges.newLocation.name}`
        });
      }
    }
    
    // Add quests
    if (stateChanges.addQuests && Array.isArray(stateChanges.addQuests)) {
      stateChanges.addQuests.forEach(quest => {
        // Check if the quest is already in the player's quest list
        const existingQuest = typeof quest === 'string'
          ? newState.player.quests.includes(quest)
          : newState.player.quests.some(q => q.title === quest.title);
        
        if (!existingQuest) {
          newState.player.quests.push(quest);
          
          // Add a notification to history
          const questName = typeof quest === 'string' ? quest : quest.title;
          newState.gameHistory.push({
            type: 'system',
            text: `New quest: ${questName}`
          });
          
          // Add experience for accepting a new quest
          newState.player.experience = (newState.player.experience || 0) + 15;
        }
      });
    }
    
    // Update NPC relationships
    if (stateChanges.npcRelationships && typeof stateChanges.npcRelationships === 'object') {
      for (const [npc, value] of Object.entries(stateChanges.npcRelationships)) {
        newState.npcRelationships[npc] = value;
      }
    }
    
    // Handle any special items or status effects
    if (stateChanges.statusEffects && Array.isArray(stateChanges.statusEffects)) {
      if (!newState.player.statusEffects) {
        newState.player.statusEffects = [];
      }
      
      stateChanges.statusEffects.forEach(effect => {
        // Add effect with duration if not already present
        if (!newState.player.statusEffects.some(e => e.name === effect.name)) {
          newState.player.statusEffects.push({
            name: effect.name,
            description: effect.description,
            duration: effect.duration || 5, // Default 5 time units
            effect: effect.effect
          });
          
          // Notify player
          newState.gameHistory.push({
            type: 'system',
            text: `Status effect: ${effect.name} - ${effect.description}`
          });
        }
      });
    }
    
    // Update experience points
    if (stateChanges.experience) {
      const experienceGain = stateChanges.experience;
      newState.player.experience = (newState.player.experience || 0) + experienceGain;
      
      // Notify player
      if (experienceGain > 0) {
        newState.gameHistory.push({
          type: 'system',
          text: `Experience gained: ${experienceGain}`
        });
      }
    }
  }
  
  // Decrement duration of status effects and remove expired ones
  if (newState.player.statusEffects && newState.player.statusEffects.length > 0) {
    newState.player.statusEffects = newState.player.statusEffects
      .map(effect => ({
        ...effect,
        duration: effect.duration - 1
      }))
      .filter(effect => effect.duration > 0);
  }
  
  // Increment time and apply time-based effects
  newState.timeElapsed += 1;
  
  // Every 24 time units (1 day), apply day changes
  if (newState.timeElapsed % 24 === 0) {
    // Recover some health at the start of a new day
    newState.player.health = Math.min(100, newState.player.health + 10);
    
    // Add a day notification to history
    newState.gameHistory.push({
      type: 'system',
      text: `Day ${Math.floor(newState.timeElapsed / 24)} begins. You feel refreshed.`
    });
  }
  
  // Level up if enough experience
  const currentLevel = newState.player.level || 1;
  const experienceThreshold = 100 * currentLevel;
  
  if ((newState.player.experience || 0) >= experienceThreshold) {
    // Increment level
    newState.player.level = currentLevel + 1;
    
    // Reset experience (keep remainder)
    newState.player.experience -= experienceThreshold;
    
    // Heal on level up
    newState.player.health = 100;
    
    // Add level up notification
    newState.gameHistory.push({
      type: 'system',
      text: `Level Up! You are now level ${newState.player.level}.`
    });
  }
  
  // Limit history to last 50 entries to prevent excessive growth
  if (newState.gameHistory.length > 50) {
    newState.gameHistory = newState.gameHistory.slice(-50);
  }
  
  return newState;
}

/**
 * Save game state to database or memory
 * @param {string} playerId - Player ID
 * @param {object} gameState - Game state to save
 */
async function saveGameState(playerId, gameState) {
  try {
    // Check MongoDB connection state
    if (mongoose.connection.readyState !== 1) {
      throw new Error('Database connection not available');
    }

    // Clone state to avoid reference issues
    const stateToSave = JSON.parse(JSON.stringify(gameState));
    
    // Save to MongoDB
    await Game.findOneAndUpdate(
      { playerId },
      { 
        playerId, 
        state: stateToSave,
        updatedAt: new Date()
      },
      { upsert: true, new: true }
    );
    
    return true;
  } catch (error) {
    console.error(`Error saving game state for ${playerId}:`, error);
    throw error;
  }
}

/**
 * Load game state from database or memory
 * @param {string} playerId - Player ID
 * @returns {Promise<object>} - Game state or null if not found
 */
async function loadGameState(playerId) {
  try {
    if (mongoConnected) {
      // Load from MongoDB
      const game = await Game.findOne({ playerId });
      return game ? game.state : null;
    } else {
      // Load from in-memory map
      return gameStates.get(playerId) || null;
    }
  } catch (error) {
    logger.error(`Error loading game state for ${playerId}:`, error);
    return null;
  }
}

/**
 * Initialize a new game state
 * @param {string} playerId - Player ID
 * @param {string} worldType - Optional world type
 * @param {string} characterName - Optional character name
 * @returns {Promise<object>} - New game state
 */
async function initializeGameState(playerId, worldType = null, characterName = 'Adventurer') {
  try {
    // Generate world settings
    const worldSettings = await worldGenerator.generateWorld(openai, worldType);
    
    // Create initial game state
    const newState = {
      player: {
        name: characterName,
        health: 100,
        inventory: ['torch', 'water flask', 'map'],
        quests: [],
        experience: 0,
        level: 1,
        skills: {},
        statusEffects: []
      },
      world: {
        name: worldSettings.name,
        type: worldSettings.type,
        description: worldSettings.description
      },
      currentLocation: worldSettings.startingLocation,
      gameHistory: [{
        type: 'narrative',
        text: worldSettings.introText
      }],
      discoveredLocations: [worldSettings.startingLocation.id],
      npcRelationships: {},
      timeElapsed: 0,
      lastAction: null,
      gameOver: false,
      created: new Date().toISOString(),
      potentialPlotHooks: worldSettings.potentialPlotHooks || [],
      nearbyLocations: worldSettings.nearbyLocations || [],
      availableNpcs: worldSettings.npcs || [],
      environment: worldSettings.environment || { time: 'day', weather: 'clear', season: 'summer' }
    };
    
    // Save the new game state
    await saveGameState(playerId, newState);
    
    return newState;
  } catch (error) {
    logger.error(`Error initializing game state for ${playerId}:`, error);
    throw error;
  }
}

/**
 * Update player statistics
 * @param {string} playerId - Player ID
 * @param {string} statType - Type of statistic to update
 * @param {object} details - Additional details
 */
async function updatePlayerStatistics(playerId, statType, details = {}) {
  try {
    if (!mongoConnected) {
      return; // Skip if no database connection
    }
    
    // Map of stat types to database fields
    const statMapping = {
      gameStarted: 'statistics.gamesStarted',
      actionPerformed: 'statistics.actionsPerformed',
      locationDiscovered: 'statistics.locationsDiscovered',
      itemCollected: 'statistics.itemsCollected',
      questCompleted: 'statistics.questsCompleted',
      death: 'statistics.deaths'
    };
    
    // Get the field to update
    const field = statMapping[statType];
    
    if (!field) {
      return; // Unknown stat type
    }
    
    // Update the statistic
    await Player.findOneAndUpdate(
      { playerId },
      { $inc: { [field]: 1 } },
      { upsert: true }
    );
    
    // If it's a special achievement, add it
    if (statType === 'questCompleted' && details.questName) {
      await checkForAchievements(playerId, 'quest', details);
    } else if (statType === 'locationDiscovered' && details.locationId) {
      await checkForAchievements(playerId, 'exploration', details);
    }
  } catch (error) {
    logger.error(`Error updating player statistics for ${playerId}:`, error);
  }
}

/**
 * Check for and award achievements
 * @param {string} playerId - Player ID
 * @param {string} achievementType - Type of achievement
 * @param {object} details - Achievement details
 */
async function checkForAchievements(playerId, achievementType, details = {}) {
  try {
    if (!mongoConnected) {
      return; // Skip if no database connection
    }
    
    // Get player document with current achievements
    const player = await Player.findOne({ playerId });
    
    if (!player) {
      return; // Player not found
    }
    
    // Get current stats
    const stats = player.statistics;
    
    // Define potential achievements
    const achievements = [
      {
        id: 'first_quest',
        type: 'quest',
        name: 'Adventurer Begins',
        description: 'Complete your first quest',
        condition: () => stats.questsCompleted >= 1,
        alreadyHas: () => hasAchievement(player, 'first_quest')
      },
      {
        id: 'explorer',
        type: 'exploration',
        name: 'Explorer',
        description: 'Discover 10 different locations',
        condition: () => stats.locationsDiscovered >= 10,
        alreadyHas: () => hasAchievement(player, 'explorer')
      },
      {
        id: 'collector',
        type: 'item',
        name: 'Collector',
        description: 'Collect 20 unique items',
        condition: () => stats.itemsCollected >= 20,
        alreadyHas: () => hasAchievement(player, 'collector')
      },
      {
        id: 'survivor',
        type: 'survival',
        name: 'Survivor',
        description: 'Play for 30 days in game time',
        condition: () => {
          const gameState = gameStates.get(playerId); // Check in-memory for this one
          return gameState && Math.floor(gameState.timeElapsed / 24) >= 30;
        },
        alreadyHas: () => hasAchievement(player, 'survivor')
      }
    ];
    
    // Filter by achievement type
    const typeAchievements = achievements.filter(a => a.type === achievementType);
    
    // Check each achievement
    for (const achievement of typeAchievements) {
      // Skip if player already has this achievement
      if (achievement.alreadyHas()) continue;
      
      // Check if condition is met
      if (achievement.condition()) {
        // Award the achievement
        player.achievements.push({
          id: achievement.id,
          name: achievement.name,
          description: achievement.description,
          unlockedAt: new Date()
        });
        
        // Save player document
        await player.save();
        
        logger.info(`Achievement unlocked for ${playerId}: ${achievement.name}`);
      }
    }
  } catch (error) {
    logger.error(`Error checking achievements for ${playerId}:`, error);
  }
}

/**
 * Helper to check if player has an achievement
 * @param {object} player - Player document
 * @param {string} achievementId - Achievement ID
 * @returns {boolean} - Whether player has the achievement
 */
function hasAchievement(player, achievementId) {
  return player.achievements.some(a => a.id === achievementId);
}

/**
 * Determine action type from action text
 * @param {string} action - Action text
 * @returns {string} - Action type
 */
function getActionType(action) {
  action = action.toLowerCase();
  
  if (action.includes('attack') || action.includes('fight') || action.includes('kill')) {
    return 'combat';
  } else if (action.includes('talk') || action.includes('speak') || action.includes('ask')) {
    return 'dialogue';
  } else if (action.includes('take') || action.includes('grab') || action.includes('pick up')) {
    return 'item';
  } else if (action.includes('go') || action.includes('move') || action.includes('walk')) {
    return 'movement';
  } else if (action.includes('look') || action.includes('examine') || action.includes('inspect')) {
    return 'observation';
  } else if (action.includes('use') || action.includes('activate') || action.includes('open')) {
    return 'interaction';
  }
  
  return 'other';
}