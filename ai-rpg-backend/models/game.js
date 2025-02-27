const mongoose = require('mongoose');

const gameSchema = new mongoose.Schema({
  playerId: {
    type: String,
    required: true,
    index: true
  },
  state: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Add index for efficient queries
gameSchema.index({ playerId: 1, updatedAt: -1 });

// Add method to get a sanitized version of the game (for API responses)
gameSchema.methods.toAPI = function() {
  return {
    playerId: this.playerId,
    state: this.state,
    lastSaved: this.updatedAt
  };
};

// Add pre-save middleware to update timestamps
gameSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Create the model
const Game = mongoose.model('Game', gameSchema);

module.exports = Game;