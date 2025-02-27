import React, { createContext, useContext, useState, useEffect } from 'react';
import { saveGame, loadGame, startNewGame, processPlayerAction, mockProcessPlayerAction } from '../services/api';

// Create the context
const GameStateContext = createContext();

// Custom hook to use the game state context
export const useGameState = () => {
  const context = useContext(GameStateContext);
  if (!context) {
    throw new Error('useGameState must be used within a GameStateProvider');
  }
  return context;
};

// Initial game state
const initialState = {
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
};

// Provider component
export const GameStateProvider = ({ children }) => {
  // Game state
  const [gameState, setGameState] = useState(initialState);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [playerId, setPlayerId] = useState(() => {
    // Generate or retrieve player ID
    const savedId = localStorage.getItem('playerId');
    if (savedId) return savedId;
    
    const newId = Math.random().toString(36).substring(2, 15);
    localStorage.setItem('playerId', newId);
    return newId;
  });
  
  // Check for saved game on initial load
  useEffect(() => {
    const checkSavedGame = async () => {
      try {
        // Try to load from localStorage first for offline capability
        const localSave = localStorage.getItem(`gameState_${playerId}`);
        if (localSave) {
          setGameState(JSON.parse(localSave));
          return;
        }
        
        // If no local save, try to load from the backend
        setIsLoading(true);
        const response = await loadGame(playerId);
        if (response && response.gameState) {
          setGameState(response.gameState);
        }
      } catch (err) {
        console.log('No saved game found, starting new game');
        // No saved game, continue with initial state
      } finally {
        setIsLoading(false);
      }
    };
    
    checkSavedGame();
  }, [playerId]);
  
  // Process a player action
  const processAction = async (action) => {
    if (!action.trim() || isLoading) return;
    
    // Update UI immediately with the action
    setGameState(prev => ({
      ...prev,
      gameHistory: [...prev.gameHistory, { type: 'action', text: action }]
    }));
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Use mock API for local development if needed
      const useMockApi = process.env.REACT_APP_USE_MOCK_API === 'true';
      const response = useMockApi
        ? await mockProcessPlayerAction(action, gameState)
        : await processPlayerAction(playerId, action, gameState);
        
      // Update game state with response
      setGameState(response.gameState);
      
    } catch (err) {
      console.error('Error processing action:', err);
      setError('Something went wrong processing your action');
      
      // Add error message to game history
      setGameState(prev => ({
        ...prev,
        gameHistory: [
          ...prev.gameHistory,
          { type: 'system', text: 'The magical forces seem confused. Please try another action.' }
        ]
      }));
    } finally {
      setIsLoading(false);
    }
  };
  
  // Start a new game
  const newGame = async (worldType = null) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await startNewGame(playerId, worldType);
      setGameState(response.gameState);
    } catch (err) {
      console.error('Error starting new game:', err);
      setError('Failed to start new game');
      
      // Fallback to initial state if API fails
      setGameState(initialState);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Save current game
  const saveCurrentGame = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Save to backend first
      await saveGame(playerId, gameState);
      
      // Only save to localStorage if backend save was successful
      try {
        localStorage.setItem(`gameState_${playerId}`, JSON.stringify(gameState));
      } catch (localError) {
        console.warn('Failed to save to localStorage:', localError);
        // Continue execution even if localStorage fails
      }
      
      // Add system message to history
      setGameState(prev => ({
        ...prev,
        gameHistory: [
          ...prev.gameHistory,
          { type: 'system', text: 'Game saved successfully.' }
        ]
      }));
      
      return true;
    } catch (err) {
      console.error('Error saving game:', err);
      setError('Failed to save game');
      return false;
    } finally {
      setIsLoading(false);
    }
  };
  
  // Load saved game
  const loadSavedGame = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Try to load from localStorage first
      const localSave = localStorage.getItem(`gameState_${playerId}`);
      if (localSave) {
        setGameState(JSON.parse(localSave));
        return true;
      }
      
      // If no local save, load from backend
      const response = await loadGame(playerId);
      if (response && response.gameState) {
        setGameState(response.gameState);
        return true;
      }
      
      setError('No saved game found');
      return false;
    } catch (err) {
      console.error('Error loading game:', err);
      setError('Failed to load game');
      return false;
    } finally {
      setIsLoading(false);
    }
  };
  
  // Provide the context value
  const value = {
    gameState,
    isLoading,
    error,
    playerId,
    actions: {
      processAction,
      newGame,
      saveGame: saveCurrentGame,
      loadGame: loadSavedGame
    }
  };
  
  return (
    <GameStateContext.Provider value={value}>
      {children}
    </GameStateContext.Provider>
  );
};