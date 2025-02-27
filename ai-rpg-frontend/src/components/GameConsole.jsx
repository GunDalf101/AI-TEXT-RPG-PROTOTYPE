import React, { useState, useEffect, useRef } from 'react';
import PlayerInput from './PlayerInput';
import GameHistory from './GameHistory';
import CharacterPanel from './CharacterPanel';

// In a real implementation, this would come from your API service
import { processPlayerAction } from '../services/api';

const GameConsole = ({ onSaveGame, onLoadGame, initialGameState = null }) => {
  // Game state
  const [gameState, setGameState] = useState(initialGameState || {
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
  });
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);

  // Generate a unique player ID if not already set
  const [playerId] = useState(() => {
    const savedId = localStorage.getItem('playerId');
    if (savedId) return savedId;
    
    const newId = Math.random().toString(36).substring(2, 15);
    localStorage.setItem('playerId', newId);
    return newId;
  });

  // Handle player input submission
  const handlePlayerAction = async (action) => {
    if (!action.trim() || isProcessing) return;

    // Update game history with player action
    const updatedHistory = [
      ...gameState.gameHistory,
      { type: 'action', text: action }
    ];
    
    setGameState(prev => ({
      ...prev,
      gameHistory: updatedHistory
    }));
    
    setIsProcessing(true);
    setError(null);

    try {
      // Call the API to process the player's action
      const response = await processPlayerAction(playerId, action, gameState);

      // Update game state with API response
      setGameState(response.gameState);
      
    } catch (err) {
      console.error('Error processing action:', err);
      setError('Something went wrong. Please try a different action.');
      
      // Add error message to game history
      setGameState(prev => ({
        ...prev,
        gameHistory: [
          ...prev.gameHistory,
          { type: 'system', text: 'The magical forces seem confused. Please try another action.' }
        ]
      }));
    } finally {
      setIsProcessing(false);
    }
  };

  // Save current game state
  const handleSaveGame = () => {
    localStorage.setItem(`gameState_${playerId}`, JSON.stringify(gameState));
    onSaveGame?.();
    
    // Add system message to history
    setGameState(prev => ({
      ...prev,
      gameHistory: [
        ...prev.gameHistory,
        { type: 'system', text: 'Game saved successfully.' }
      ]
    }));
  };

  // Load saved game state
  const handleLoadGame = () => {
    const savedState = localStorage.getItem(`gameState_${playerId}`);
    if (savedState) {
      setGameState(JSON.parse(savedState));
      onLoadGame?.();
    }
  };

  // Start a new game
  const handleNewGame = () => {
    if (window.confirm('Are you sure you want to start a new game? Your current progress will be lost.')) {
      // This would normally call the API to generate a new world
      setGameState({
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
      });
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Main game area */}
      <div className="lg:col-span-2 space-y-6">
        <div className="bg-gray-800/50 backdrop-blur-lg rounded-2xl p-6 shadow-xl border border-gray-700/50">
          <GameHistory 
            history={gameState.gameHistory} 
            className="h-[60vh] overflow-y-auto custom-scrollbar"
          />
          <PlayerInput 
            onSubmit={handlePlayerAction}
            isProcessing={isProcessing}
            className="mt-4"
          />
        </div>
        
        {/* Action buttons */}
        <div className="flex gap-4">
          <button 
            onClick={handleSaveGame}
            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-3 px-6 rounded-lg transition-colors duration-200 shadow-lg"
          >
            Save Game
          </button>
          <button 
            onClick={handleLoadGame}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 px-6 rounded-lg transition-colors duration-200 shadow-lg"
          >
            Load Game
          </button>
        </div>
      </div>

      {/* Character panel */}
      <div className="lg:col-span-1">
        <CharacterPanel gameState={gameState} />
      </div>
    </div>
  );
};

export default GameConsole;