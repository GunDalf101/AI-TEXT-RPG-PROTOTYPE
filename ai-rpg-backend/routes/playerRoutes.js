const express = require('express');
const router = express.Router();
const playerController = require('../controllers/playerController');

/**
 * Create or update player profile
 * POST /api/player
 */
router.post('/', playerController.updatePlayerProfile);

/**
 * Get player profile
 * GET /api/player/:playerId
 */
router.get('/:playerId', playerController.getPlayerProfile);

/**
 * Update player preferences
 * PUT /api/player/:playerId/preferences
 */
router.put('/:playerId/preferences', playerController.updatePreferences);

/**
 * Get player achievements
 * GET /api/player/:playerId/achievements
 */
router.get('/:playerId/achievements', playerController.getAchievements);

/**
 * Update player statistics
 * PUT /api/player/:playerId/statistics
 */
router.put('/:playerId/statistics', playerController.updateStatistics);

module.exports = router;