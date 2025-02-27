// API service for communicating with the backend

// Base API URL - would come from environment variables in production
const API_BASE_URL = 'http://localhost:3001/api';

/**
 * Process a player action through the backend LLM integration
 * @param {string} playerId - Unique identifier for the player
 * @param {string} action - The action text input by the player
 * @param {object} gameState - Current game state
 * @returns {Promise<object>} - Updated game state and narrative
 */
export const processPlayerAction = async (playerId, action, gameState) => {
  try {
    const response = await fetch(`${API_BASE_URL}/process-action`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        playerId,
        action,
        gameState
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to process action');
    }

    return await response.json();
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
};

/**
 * Save the current game state to the backend
 * @param {string} playerId - Unique identifier for the player
 * @param {object} gameState - Current game state to save
 * @returns {Promise<object>} - Success message
 */
export const saveGame = async (playerId, gameState) => {
  try {
    const response = await fetch(`${API_BASE_URL}/save-game`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        playerId,
        gameState
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to save game');
    }

    return await response.json();
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
};

/**
 * Load a saved game state from the backend
 * @param {string} playerId - Unique identifier for the player
 * @returns {Promise<object>} - Saved game state
 */
export const loadGame = async (playerId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/load-game/${playerId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Not Found');
    }

    return await response.json();
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
};

/**
 * Initialize a new game on the backend
 * @param {string} playerId - Unique identifier for the player
 * @param {string} worldType - Optional world type (fantasy, sci-fi, etc.)
 * @returns {Promise<object>} - New game state
 */
export const startNewGame = async (playerId, worldType = null) => {
  try {
    const response = await fetch(`${API_BASE_URL}/new-game`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        playerId,
        worldType
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to start new game');
    }

    return await response.json();
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
};

// For local development/testing without a backend
// This allows the front-end to work in isolation
export const mockProcessPlayerAction = async (action, gameState) => {
  console.log('MOCK API: Processing action', action);
  
  // Wait to simulate network delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Simple response generation based on action keywords
  let response = {
    narrative: `You ${action}.`,
    stateChanges: {}
  };
  
  const actionLower = action.toLowerCase();
  
  if (actionLower.includes('look') || actionLower.includes('examine')) {
    response.narrative = `You carefully examine your surroundings. The forest path continues ahead, winding between ancient trees. You notice some unusual mushrooms growing near a fallen log, and the distant sound of running water.`;
  } 
  else if (actionLower.includes('go') || actionLower.includes('walk') || actionLower.includes('move')) {
    response.narrative = `You continue along the forest path. The trees grow denser, and the light dims as the canopy thickens overhead. After a while, you come upon a small clearing with a bubbling stream.`;
    response.stateChanges = {
      newLocation: {
        id: 'forest_clearing',
        name: 'Forest Clearing',
        description: 'A small clearing with a bubbling stream.'
      }
    };
  }
  else if (actionLower.includes('take') || actionLower.includes('pick up') || actionLower.includes('grab')) {
    if (actionLower.includes('mushroom')) {
      response.narrative = `You carefully pick some of the unusual glowing mushrooms. They emit a faint blue light and might be useful.`;
      response.stateChanges = {
        addItems: ['glowing mushrooms']
      };
    } else {
      response.narrative = `You look around for something to take, but don't see anything worth picking up right now.`;
    }
  }
  else if (actionLower.includes('inventory') || actionLower.includes('check items')) {
    const items = gameState.player.inventory.join(', ');
    response.narrative = `You check your belongings. You're carrying: ${items}.`;
  }
  
  return {
    narrative: response.narrative,
    stateChanges: response.stateChanges,
    gameState: updateMockGameState(gameState, action, response)
  };
};

// Helper function for mock API
function updateMockGameState(currentState, action, response) {
  const newState = JSON.parse(JSON.stringify(currentState));
  
  // Add the action and response to history
  newState.gameHistory.push({ type: 'action', text: action });
  newState.gameHistory.push({ type: 'narrative', text: response.narrative });
  
  // Update last action
  newState.lastAction = action;
  
  // Apply state changes
  if (response.stateChanges) {
    // Add items to inventory
    if (response.stateChanges.addItems && Array.isArray(response.stateChanges.addItems)) {
      newState.player.inventory.push(...response.stateChanges.addItems);
    }
    
    // Update location
    if (response.stateChanges.newLocation) {
      newState.currentLocation = response.stateChanges.newLocation;
      if (response.stateChanges.newLocation.id) {
        newState.discoveredLocations.push(response.stateChanges.newLocation.id);
      }
    }
  }
  
  // Increment time
  newState.timeElapsed += 1;
  
  return newState;
}