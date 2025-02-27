import { useState } from 'react';
import { useGameState } from '../contexts/GameStateContext';

/**
 * Custom hook for game actions and state management
 * Provides a simplified interface for components to interact with game state
 */
const useGameActions = () => {
  const { gameState, isLoading, error, actions } = useGameState();
  const [inputValue, setInputValue] = useState('');
  
  // Process player input
  const handleSubmitAction = async (e) => {
    e?.preventDefault();
    
    if (!inputValue.trim() || isLoading) return;
    
    const action = inputValue.trim();
    setInputValue(''); // Clear input field
    
    await actions.processAction(action);
  };
  
  // Handle certain keyboard shortcuts
  const handleKeyDown = (e) => {
    // Implementation for command history, auto-complete, etc. could go here
  };
  
  // Start a new game
  const startNewGame = async (worldType) => {
    if (window.confirm('Are you sure you want to start a new game? Your current progress will be lost.')) {
      await actions.newGame(worldType);
    }
  };
  
  // Save game
  const saveGame = async () => {
    const success = await actions.saveGame();
    return success;
  };
  
  // Load game
  const loadGame = async () => {
    if (window.confirm('Are you sure you want to load your saved game? Unsaved progress will be lost.')) {
      const success = await actions.loadGame();
      return success;
    }
    return false;
  };
  
  // Helper function to get the current location name
  const getCurrentLocationName = () => {
    return gameState.currentLocation?.name || 'Unknown';
  };
  
  // Helper function to get days elapsed in game
  const getDaysElapsed = () => {
    return Math.floor(gameState.timeElapsed / 24) + 1;
  };
  
  // Helper function to check if player has a specific item
  const hasItem = (itemName) => {
    return gameState.player.inventory.some(item => 
      item.toLowerCase() === itemName.toLowerCase()
    );
  };
  
  return {
    // State
    gameState,
    isLoading,
    error,
    inputValue,
    
    // Input handlers
    setInputValue,
    handleSubmitAction,
    handleKeyDown,
    
    // Game actions
    startNewGame,
    saveGame,
    loadGame,
    
    // Helper functions
    getCurrentLocationName,
    getDaysElapsed,
    hasItem
  };
};

export default useGameActions;