/**
 * Prompt Builder Utility
 * Creates well-structured prompts for the LLM
 */

/**
 * Build a prompt for the LLM based on the game state and player action
 * @param {string} action - The player's action text
 * @param {object} gameState - The current game state
 * @return {Array} - Array of message objects for the LLM API
 */
exports.buildGamePrompt = (action, gameState) => {
  const { player, world, currentLocation, gameHistory, discoveredLocations, npcRelationships } = gameState;
  
  // Get recent history (last 15 entries or fewer)
  const recentHistory = gameHistory.slice(-15);
  const historyText = recentHistory.map(entry => 
    entry.type === 'action' ? `Player: ${entry.text}` : `Game: ${entry.text}`
  ).join('\n');
  
  // Format inventory items
  const inventoryText = player.inventory.length > 0 
    ? player.inventory.join(', ')
    : "No items";
  
  // Format known locations
  const locationsText = discoveredLocations.length > 0
    ? discoveredLocations.map(loc => loc.split('_').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
      ).join(' ')).join(', ')
    : "Starting location only";
  
  // Format active quests
  const questsText = player.quests && player.quests.length > 0
    ? player.quests.map(q => typeof q === 'string' ? q : q.title).join(', ')
    : "No active quests";
  
  // Format NPC relationships if any exist
  const npcText = Object.keys(npcRelationships).length > 0
    ? Object.entries(npcRelationships).map(([npc, value]) => 
        `${npc}: ${typeof value === 'number' ? `${value}/100` : value}`
      ).join(', ')
    : "No NPC relationships established";
  
  // System instructions
  const systemInstructions = {
    role: "system",
    content: `You are the AI game master for an interactive text-based RPG set in ${world.name}, a ${world.type} world.

GAME CONTEXT:
- The player is currently at ${currentLocation.name}.
- Location description: ${currentLocation.description}
- Player health: ${player.health}/100
- Player inventory: ${inventoryText}
- Discovered locations: ${locationsText}
- Active quests: ${questsText}
- NPC relationships: ${npcText}
- Day in game: ${Math.floor(gameState.timeElapsed / 24) + 1}

YOUR ROLE:
As the game master, respond to the player's actions with rich, immersive descriptions. Create an engaging experience with:
1. Vivid sensory details (sights, sounds, smells, tactile sensations)
2. Dynamic NPCs with distinct personalities and motivations
3. Meaningful consequences to player choices
4. Occasional surprises, discoveries, or plot developments
5. Consistent world-building that makes sense within the ${world.type} setting

RESPONSE FORMAT:
Your response must follow this exact format:

NARRATIVE: [Your narrative response to the player's action. Keep this engaging but concise (100-150 words). Make the world feel alive and responsive to the player's choices.]

STATE_CHANGES: {
  "health": [optional: new health value],
  "addItems": [optional: array of new items to add to inventory],
  "removeItems": [optional: array of items to remove from inventory],
  "newLocation": {
    "id": [optional: location_id_with_underscores],
    "name": [optional: Location Name],
    "description": [optional: Brief location description]
  },
  "addQuests": [optional: array of quest objects or strings],
  "npcRelationships": {
    [optional: "npc_name": relationship_value]
  },
  "experience": [optional: experience points to award]
}

Remember, you are not just describing what happens but actively creating a world for the player to explore. Respond directly to their actions but also advance the story in interesting ways.`
  };
  
  // Sample responses for consistent formatting (few-shot learning)
  const fewShotExamples = {
    role: "assistant",
    content: `Here are example responses:

Example 1 - Player explores:
NARRATIVE: You venture deeper into the forest, pushing aside hanging vines and stepping carefully over gnarled roots. The canopy thickens overhead, dappling the ground with small patches of light. Suddenly, you hear a rustling sound. A small clearing opens before you, where a crystal-clear spring bubbles up from beneath mossy stones. Beside it sits an elderly man in tattered clothing, carving something from a piece of wood.

STATE_CHANGES: {
  "newLocation": {
    "id": "forest_spring",
    "name": "Forest Spring",
    "description": "A small clearing with a bubbling spring and mossy stones."
  },
  "experience": 5
}

Example 2 - Player interacts with NPC:
NARRATIVE: "Greetings, traveler," the old man says without looking up from his carving. "Few wander this deep into Whisperwood." He introduces himself as Thorne, once a royal guard, now a hermit seeking peace among the trees. When you mention the strange symbols you saw earlier, his hands go still. "The Awakening signs," he mutters. "They've returned." He offers you a freshly carved amulet. "You'll need protection."

STATE_CHANGES: {
  "addItems": ["Wooden Protection Amulet"],
  "npcRelationships": {
    "Thorne": 60
  },
  "addQuests": [{
    "title": "Investigate the Awakening Signs",
    "description": "Find more of the strange symbols Thorne mentioned"
  }],
  "experience": 10
}

Example 3 - Player faces danger:
NARRATIVE: You attempt to cross the rickety bridge spanning the ravine. Halfway across, the worn ropes groan under your weight. Suddenly, several planks splinter beneath your feet! You lunge forward, scrambling for safety as the bridge collapses behind you. You make it to the other side, but not without injury. Your heart pounds as you look back at the now-impassable chasm.

STATE_CHANGES: {
  "health": 85,
  "newLocation": {
    "id": "ravine_overlook",
    "name": "Ravine Overlook",
    "description": "A cliff edge overlooking a deep ravine, the bridge now collapsed."
  },
  "experience": 15
}`
  };
  
  // User's recent history and current action
  const userMessage = {
    role: "user",
    content: `${historyText}\n\nPlayer: ${action}`
  };
  
  return [systemInstructions, fewShotExamples, userMessage];
};

/**
 * Generate system prompt for creating a new game world
 * @param {string} worldType - Optional world type preference (fantasy, sci-fi, etc.)
 * @return {Array} - Array of message objects for the LLM API
 */
exports.buildWorldGenerationPrompt = (worldType = null) => {
  const worldTypeText = worldType ? `a ${worldType} setting` : 'any unique and interesting setting';
  
  const systemPrompt = {
    role: "system",
    content: `You are a world-building AI for a text-based RPG game. Create ${worldTypeText} with rich lore and an immersive starting location. The world should be engaging, unique, and have potential for adventure.

Your response must be in the following JSON format:

{
  "type": "[world type: fantasy, sci-fi, post-apocalyptic, steampunk, etc.]",
  "name": "[name of the world]",
  "description": "[brief description of the world's history and current state]",
  "startingLocation": {
    "id": "[location_id_with_underscores]",
    "name": "[Name of Location]",
    "description": "[Detailed sensory description of the location]"
  },
  "introText": "[The opening narrative text that introduces the player to the world, 100-150 words]",
  "potentialPlotHooks": [
    "[brief description of potential adventure hooks]",
    "[another potential plot element]"
  ],
  "factions": [
    {
      "name": "[Faction name]",
      "description": "[Brief faction description]"
    }
  ],
  "keyItems": [
    {
      "name": "[Item name]",
      "description": "[Item description]"
    }
  ]
}

Make the world feel alive, mysterious, and full of adventure potential. Be creative and original.`
  };
  
  const userPrompt = {
    role: "user",
    content: `Create a new game world${worldType ? ` with a ${worldType} setting` : ''}. Make it unique and interesting with detailed lore, factions, and geography!`
  };
  
  return [systemPrompt, userPrompt];
};

/**
 * Generate smaller, targeted prompts for specific game needs
 * @param {string} promptType - Type of prompt to generate ("npc", "location", "item", etc.)
 * @param {object} parameters - Additional parameters specific to the prompt type
 * @return {Array} - Array of message objects for the LLM API
 */
exports.generateSpecializedPrompt = (promptType, parameters = {}) => {
  switch (promptType) {
    case "npc":
      return generateNPCPrompt(parameters);
    case "location":
      return generateLocationPrompt(parameters);
    case "item":
      return generateItemPrompt(parameters);
    case "quest":
      return generateQuestPrompt(parameters);
    default:
      return [{
        role: "system", 
        content: "Generate content for an RPG game."
      }, {
        role: "user",
        content: `Generate ${promptType} content with these parameters: ${JSON.stringify(parameters)}`
      }];
  }
};

// Helper functions for specialized prompts
function generateNPCPrompt({ worldType, currentLocation, importance = "minor" }) {
  return [
    {
      role: "system",
      content: `Generate a unique NPC for a ${worldType} setting. The NPC should fit in the location: ${currentLocation}. This is a ${importance} character.`
    },
    {
      role: "user",
      content: `Create an NPC that would be found in ${currentLocation}. Include name, appearance, personality, background, and possible interactions with the player. Return in JSON format.`
    }
  ];
}

function generateLocationPrompt({ worldType, currentLocation, locationType = "any" }) {
  return [
    {
      role: "system",
      content: `Generate a unique location for a ${worldType} setting. This location is connected to or part of: ${currentLocation}. It should be a ${locationType} location.`
    },
    {
      role: "user",
      content: `Create a detailed location that would be found near or in ${currentLocation}. Include name, description, notable features, potential encounters, and any items/secrets that might be found there. Return in JSON format.`
    }
  ];
}

function generateItemPrompt({ worldType, rarity = "common", itemType = "any" }) {
  return [
    {
      role: "system",
      content: `Generate a unique ${rarity} ${itemType} item for a ${worldType} setting.`
    },
    {
      role: "user",
      content: `Create a ${rarity} ${itemType} that would exist in a ${worldType} world. Include name, description, properties, and any special abilities or lore. Return in JSON format.`
    }
  ];
}

function generateQuestPrompt({ worldType, currentLocation, difficulty = "medium", questType = "any" }) {
  return [
    {
      role: "system",
      content: `Generate a unique ${difficulty} ${questType} quest for a ${worldType} setting. The quest should start in or relate to: ${currentLocation}.`
    },
    {
      role: "user",
      content: `Create a ${questType} quest that would begin in ${currentLocation}. Include title, description, objectives, potential rewards, and any NPCs involved. The difficulty should be ${difficulty}. Return in JSON format.`
    }
  ];
}