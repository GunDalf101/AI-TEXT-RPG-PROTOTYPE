const express = require('express');
const router = express.Router();
const gameController = require('../controllers/gameController');

/**
 * Process a player action
 * POST /api/game/process-action
 */
router.post('/process-action', gameController.processAction);

/**
 * Save game state
 * POST /api/game/save-game
 */
router.post('/save-game', gameController.saveGame);

/**
 * Load a saved game
 * GET /api/game/load-game/:playerId
 */
router.get('/load-game/:playerId', gameController.loadGame);

/**
 * Start a new game
 * POST /api/game/new-game
 */
router.post('/new-game', gameController.newGame);

/**
 * Get game statistics
 * GET /api/game/stats/:playerId
 */
router.get('/stats/:playerId', gameController.getGameStats);

/**
 * Generate location or NPC details
 * POST /api/game/generate
 */
router.post('/generate', gameController.generateContent);

module.exports = router;