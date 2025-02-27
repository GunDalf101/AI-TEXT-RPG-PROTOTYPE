/**
 * Response Parser Utility
 * Parses and validates LLM responses for game actions and world generation
 */
const logger = require('./logger');

/**
 * Parse and validate the LLM response for game actions
 * @param {string} rawResponse - Raw text response from the LLM
 * @param {object} currentGameState - Current game state for validation
 * @return {object} - Parsed and validated narrative and state changes
 */
exports.parseGameResponse = (rawResponse, currentGameState) => {
  try {
    // Extract narrative section
    const narrativeMatch = rawResponse.match(/NARRATIVE:(.*?)(?=STATE_CHANGES:|$)/s);
    let narrative = '';
    if (narrativeMatch && narrativeMatch[1]) {
      narrative = narrativeMatch[1].trim();
    } else {
      // Fallback if format isn't followed
      narrative = rawResponse;
    }
    
    // Extract state changes section
    const stateChangesMatch = rawResponse.match(/STATE_CHANGES:(.*)/s);
    let stateChanges = {};
    
    if (stateChangesMatch && stateChangesMatch[1]) {
      try {
        // Try to parse as JSON
        const jsonString = stateChangesMatch[1].trim();
        // Remove any trailing comma that might cause JSON parse errors
        const cleanedJsonString = jsonString.replace(/,\s*}/g, '}').replace(/,\s*]/g, ']');
        stateChanges = JSON.parse(cleanedJsonString);
      } catch (e) {
        logger.warn('Failed to parse state changes as JSON:', e);
        
        // Try to extract and fix the JSON if it's malformed
        stateChanges = extractAndFixStateChanges(stateChangesMatch[1]);
      }
    }
    
    // Validate and sanitize the state changes
    const validatedChanges = validateStateChanges(stateChanges, currentGameState);
    
    return { 
      narrative: sanitizeNarrative(narrative), 
      stateChanges: validatedChanges 
    };
  } catch (error) {
    logger.error('Error parsing LLM response:', error);
    return { 
      narrative: 'The magical forces seem confused. Please try another action.', 
      stateChanges: {} 
    };
  }
};

/**
 * Parse world generation response from the LLM
 * @param {string} rawResponse - Raw text response from the LLM
 * @return {object} - Parsed world data
 */
exports.parseWorldGeneration = (rawResponse) => {
  try {
    // Try to extract JSON from the response
    const jsonMatch = rawResponse.match(/{[\s\S]*}/);
    if (jsonMatch) {
      const worldData = JSON.parse(jsonMatch[0]);
      
      // Validate required fields
      if (!worldData.type || !worldData.name || !worldData.startingLocation || !worldData.introText) {
        throw new Error('Missing required fields in world generation response');
      }
      
      // Ensure starting location has all required fields
      if (!worldData.startingLocation.id || !worldData.startingLocation.name || !worldData.startingLocation.description) {
        throw new Error('Missing required fields in starting location');
      }
      
      return worldData;
    } else {
      throw new Error('Could not extract valid JSON from world generation response');
    }
  } catch (error) {
    logger.error('Error parsing world generation response:', error);
    
    // Return fallback world data
    return {
      type: 'fantasy',
      name: 'Eldoria',
      description: 'A realm of magic and mystery, where ancient forests hide forgotten secrets.',
      startingLocation: {
        id: 'forest_edge',
        name: 'Forest Edge',
        description: 'A dense, misty forest with ancient trees.'
      },
      introText: 'You find yourself standing at the edge of a dense, misty forest. A narrow path winds its way between ancient trees, disappearing into the shadows. The air is thick with the scent of moss and rain.',
      potentialPlotHooks: [
        'Strange symbols carved into trees',
        'Rumors of a hidden temple',
        'Villagers disappearing in the night'
      ]
    };
  }
};

/**
 * Sanitize narrative text
 * @param {string} narrative - Raw narrative text
 * @return {string} - Sanitized narrative
 */
function sanitizeNarrative(narrative) {
  // Remove any markdown formatting that might have been added
  let sanitized = narrative.replace(/^#+\s+/gm, '');
  
  // Remove any JSON or code blocks
  sanitized = sanitized.replace(/```[^`]*```/g, '');
  
  // Remove any remaining NARRATIVE: or STATE_CHANGES: markers
  sanitized = sanitized.replace(/NARRATIVE:/gi, '');
  sanitized = sanitized.replace(/STATE_CHANGES:/gi, '');
  
  return sanitized.trim();
}

/**
 * Validate and sanitize state changes
 * @param {object} changes - Parsed state changes
 * @param {object} currentState - Current game state
 * @return {object} - Validated state changes
 */
function validateStateChanges(changes, currentState) {
  const validated = {};
  
  // Validate health (must be a number between 0-100)
  if (changes.health !== undefined) {
    const health = Number(changes.health);
    if (!isNaN(health)) {
      validated.health = Math.max(0, Math.min(100, health));
    }
  }
  
  // Validate items to add (must be an array of strings)
  if (changes.addItems) {
    if (Array.isArray(changes.addItems)) {
      validated.addItems = changes.addItems
        .filter(item => typeof item === 'string')
        .map(item => item.trim());
    } else if (typeof changes.addItems === 'string') {
      // Handle case where it's a single string
      validated.addItems = [changes.addItems.trim()];
    }
  }
  
  // Validate items to remove (must be an array of strings that exist in inventory)
  if (changes.removeItems) {
    if (Array.isArray(changes.removeItems)) {
      validated.removeItems = changes.removeItems
        .filter(item => typeof item === 'string')
        .map(item => item.trim())
        .filter(item => currentState.player.inventory.includes(item));
    } else if (typeof changes.removeItems === 'string') {
      // Handle case where it's a single string
      const item = changes.removeItems.trim();
      if (currentState.player.inventory.includes(item)) {
        validated.removeItems = [item];
      }
    }
  }
  
  // Validate new location
  if (changes.newLocation) {
    const location = changes.newLocation;
    
    // Must have id, name, and description
    if (location.id && location.name && location.description) {
      validated.newLocation = {
        id: String(location.id).toLowerCase().replace(/\s+/g, '_'),
        name: String(location.name).trim(),
        description: String(location.description).trim()
      };
    }
  }
  
  // Validate quests to add
  if (changes.addQuests) {
    if (Array.isArray(changes.addQuests)) {
      validated.addQuests = changes.addQuests
        .filter(quest => typeof quest === 'string' || (typeof quest === 'object' && quest.title))
        .map(quest => {
          if (typeof quest === 'string') {
            return quest.trim();
          } else {
            return {
              title: String(quest.title).trim(),
              description: quest.description ? String(quest.description).trim() : '',
              objectives: Array.isArray(quest.objectives) ? quest.objectives : []
            };
          }
        });
    } else if (typeof changes.addQuests === 'string') {
      // Handle case where it's a single string
      validated.addQuests = [changes.addQuests.trim()];
    } else if (changes.addQuests && typeof changes.addQuests === 'object' && changes.addQuests.title) {
      // Handle case where it's a single quest object
      validated.addQuests = [{
        title: String(changes.addQuests.title).trim(),
        description: changes.addQuests.description ? String(changes.addQuests.description).trim() : '',
        objectives: Array.isArray(changes.addQuests.objectives) ? changes.addQuests.objectives : []
      }];
    }
  }
  
  // Validate NPC relationships
  if (changes.npcRelationships && typeof changes.npcRelationships === 'object') {
    validated.npcRelationships = {};
    
    for (const [npc, value] of Object.entries(changes.npcRelationships)) {
      const npcName = String(npc).trim();
      
      if (typeof value === 'number') {
        // Ensure relationship value is between 0-100
        validated.npcRelationships[npcName] = Math.max(0, Math.min(100, value));
      } else if (typeof value === 'string') {
        // Allow text description of relationship
        validated.npcRelationships[npcName] = String(value).trim();
      }
    }
  }
  
  // Validate experience
  if (changes.experience !== undefined) {
    const exp = Number(changes.experience);
    if (!isNaN(exp)) {
      validated.experience = Math.max(0, exp);
    }
  }
  
  // Validate status effects
  if (changes.statusEffects && Array.isArray(changes.statusEffects)) {
    validated.statusEffects = changes.statusEffects
      .filter(effect => effect && typeof effect === 'object' && effect.name)
      .map(effect => ({
        name: String(effect.name).trim(),
        description: effect.description ? String(effect.description).trim() : '',
        duration: Number(effect.duration) || 5,
        effect: effect.effect || {}
      }));
  }
  
  return validated;
}

/**
 * Extract and fix malformed JSON in state changes
 * @param {string} stateChangesText - Raw state changes text
 * @return {object} - Fixed state changes object
 */
function extractAndFixStateChanges(stateChangesText) {
  const changes = {};
  
  try {
    // Try to extract health
    const healthMatch = stateChangesText.match(/"health":\s*(\d+)/);
    if (healthMatch && healthMatch[1]) {
      changes.health = parseInt(healthMatch[1], 10);
    }
    
    // Try to extract addItems
    const addItemsMatch = stateChangesText.match(/"addItems":\s*\[(.*?)\]/s);
    if (addItemsMatch && addItemsMatch[1]) {
      changes.addItems = addItemsMatch[1]
        .split(',')
        .map(item => item.trim().replace(/"/g, ''))
        .filter(item => item.length > 0);
    }
    
    // Try to extract removeItems
    const removeItemsMatch = stateChangesText.match(/"removeItems":\s*\[(.*?)\]/s);
    if (removeItemsMatch && removeItemsMatch[1]) {
      changes.removeItems = removeItemsMatch[1]
        .split(',')
        .map(item => item.trim().replace(/"/g, ''))
        .filter(item => item.length > 0);
    }
    
    // Try to extract newLocation
    const newLocationMatch = stateChangesText.match(/"newLocation":\s*\{(.*?)\}/s);
    if (newLocationMatch && newLocationMatch[1]) {
      const locationText = newLocationMatch[1];
      
      const idMatch = locationText.match(/"id":\s*"([^"]*)"/);
      const nameMatch = locationText.match(/"name":\s*"([^"]*)"/);
      const descMatch = locationText.match(/"description":\s*"([^"]*)"/);
      
      if (idMatch && nameMatch && descMatch) {
        changes.newLocation = {
          id: idMatch[1],
          name: nameMatch[1],
          description: descMatch[1]
        };
      }
    }
    
    // Try to extract addQuests
    const addQuestsMatch = stateChangesText.match(/"addQuests":\s*\[(.*?)\]/s);
    if (addQuestsMatch && addQuestsMatch[1]) {
      // This is complex to parse reliably, so we'll just extract string quests
      changes.addQuests = addQuestsMatch[1]
        .split(',')
        .map(item => item.trim().replace(/"/g, ''))
        .filter(item => item.length > 0);
    }
    
    // Try to extract npcRelationships
    const npcMatch = stateChangesText.match(/"npcRelationships":\s*\{(.*?)\}/s);
    if (npcMatch && npcMatch[1]) {
      changes.npcRelationships = {};
      
      // Extract key-value pairs
      const pairs = npcMatch[1].match(/"([^"]*)":\s*([^,}]*)/g);
      if (pairs) {
        pairs.forEach(pair => {
          const keyMatch = pair.match(/"([^"]*)"/);
          const valueMatch = pair.match(/:\s*([^,}]*)/);
          
          if (keyMatch && valueMatch) {
            const key = keyMatch[1];
            const value = valueMatch[1].trim();
            
            // Try to convert to number if possible
            const numValue = Number(value);
            changes.npcRelationships[key] = isNaN(numValue) ? value.replace(/"/g, '') : numValue;
          }
        });
      }
    }
    
    // Try to extract experience
    const experienceMatch = stateChangesText.match(/"experience":\s*(\d+)/);
    if (experienceMatch && experienceMatch[1]) {
      changes.experience = parseInt(experienceMatch[1], 10);
    }
    
    return changes;
  } catch (error) {
    logger.error('Error fixing state changes:', error);
    return {};
  }
}