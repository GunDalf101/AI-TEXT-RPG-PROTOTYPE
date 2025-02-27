const mongoose = require('mongoose');

const playerSchema = new mongoose.Schema({
  playerId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  name: {
    type: String,
    default: 'Adventurer'
  },
  email: {
    type: String,
    sparse: true,  // Allow null values while maintaining uniqueness
    trim: true,
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, 'Please use a valid email address.']
  },
  preferences: {
    worldType: String,
    difficulty: {
      type: String,
      enum: ['easy', 'medium', 'hard'],
      default: 'medium'
    },
    theme: {
      type: String,
      default: 'dark'
    },
    notifications: {
      type: Boolean,
      default: true
    },
    fontSize: {
      type: Number,
      default: 16,
      min: 12,
      max: 24
    }
  },
  statistics: {
    gamesStarted: {
      type: Number,
      default: 0
    },
    actionsPerformed: {
      type: Number,
      default: 0
    },
    locationsDiscovered: {
      type: Number,
      default: 0
    },
    itemsCollected: {
      type: Number,
      default: 0
    },
    questsCompleted: {
      type: Number,
      default: 0
    },
    deaths: {
      type: Number,
      default: 0
    },
    totalPlayTime: {
      type: Number,  // in minutes
      default: 0
    }
  },
  achievements: [{
    id: String,
    name: String,
    description: String,
    unlockedAt: Date
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastActive: {
    type: Date,
    default: Date.now
  }
});

// Add method to get a sanitized version of the player (for API responses)
playerSchema.methods.toAPI = function() {
  // Create a copy without sensitive information
  const player = {
    playerId: this.playerId,
    name: this.name,
    preferences: this.preferences,
    statistics: this.statistics,
    achievements: this.achievements,
    createdAt: this.createdAt,
    lastActive: this.lastActive
  };
  
  return player;
};

// Add pre-save middleware to update timestamps
playerSchema.pre('save', function(next) {
  this.lastActive = new Date();
  next();
});

// Create the model
const Player = mongoose.model('Player', playerSchema);

module.exports = Player;