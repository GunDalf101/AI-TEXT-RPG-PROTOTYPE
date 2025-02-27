/**
 * World Generator Service
 * Creates procedurally generated game worlds using LLM
 */

/**
 * Generate a complete game world
 * @param {object} openai - The OpenAI client
 * @param {string} worldType - Optional world type (fantasy, sci-fi, etc.)
 * @returns {Promise<object>} Generated world data
 */
async function generateWorld(openai, worldType = null) {
    try {
      // Build the prompt for world generation
      const prompt = buildWorldPrompt(worldType);
      
      // Call the LLM
      const completion = await openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || "gpt-4-turbo",
        messages: prompt,
        temperature: 0.8,  // Higher temperature for more creative worlds
        max_tokens: 1000,
        top_p: 1,
        frequency_penalty: 0.2,
        presence_penalty: 0.5,
      });
      
      // Parse the response
      const worldData = parseWorldGeneration(completion.choices[0].message.content);
      
      // Add additional content elements to the world
      const enhancedWorld = enhanceWorldData(worldData);
      
      return enhancedWorld;
    } catch (error) {
      console.error('Error generating world:', error);
      // Return fallback world in case of errors
      return getFallbackWorld();
    }
  }
  
  /**
   * Build a prompt for generating a world
   * @param {string} worldType - Optional world type
   * @returns {Array} Prompt messages
   */
  function buildWorldPrompt(worldType = null) {
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
  }
  
  /**
   * Parse the LLM response into a structured world object
   * @param {string} response - Raw LLM response
   * @returns {object} Parsed world data
   */
  function parseWorldGeneration(response) {
    try {
      // Try to extract JSON from the response
      const jsonMatch = response.match(/{[\s\S]*}/);
      if (jsonMatch) {
        const worldData = JSON.parse(jsonMatch[0]);
        return validateWorldData(worldData);
      } else {
        throw new Error('Could not extract valid JSON from world generation response');
      }
    } catch (error) {
      console.error('Error parsing world generation response:', error);
      return getFallbackWorld();
    }
  }
  
  /**
   * Validate and fix world data to ensure all required fields are present
   * @param {object} worldData - The world data to validate
   * @returns {object} Validated world data
   */
  function validateWorldData(worldData) {
    const validated = { ...worldData };
    
    // Ensure required fields are present
    if (!validated.type) validated.type = 'fantasy';
    if (!validated.name) validated.name = 'Unnamed Realm';
    if (!validated.description) validated.description = 'A mysterious world awaiting exploration.';
    
    // Ensure starting location has all required fields
    if (!validated.startingLocation) {
      validated.startingLocation = {
        id: 'starting_point',
        name: 'Starting Point',
        description: 'The beginning of your adventure.'
      };
    } else {
      // Convert location id to lowercase with underscores
      if (validated.startingLocation.id) {
        validated.startingLocation.id = validated.startingLocation.id
          .toLowerCase()
          .replace(/\s+/g, '_');
      } else {
        validated.startingLocation.id = 'starting_point';
      }
      
      if (!validated.startingLocation.name) {
        validated.startingLocation.name = 'Starting Point';
      }
      
      if (!validated.startingLocation.description) {
        validated.startingLocation.description = 'The beginning of your adventure.';
      }
    }
    
    // Ensure intro text is present
    if (!validated.introText) {
      validated.introText = `Welcome to ${validated.name}, a ${validated.type} world waiting to be explored. Your adventure begins at ${validated.startingLocation.name}.`;
    }
    
    // Ensure potential plot hooks are present
    if (!validated.potentialPlotHooks || !Array.isArray(validated.potentialPlotHooks) || validated.potentialPlotHooks.length === 0) {
      validated.potentialPlotHooks = [
        'Strange rumors of disappearances in the area',
        'A mysterious artifact that locals speak of in hushed tones',
        'Political tension between rival factions'
      ];
    }
    
    // Ensure factions are present
    if (!validated.factions || !Array.isArray(validated.factions) || validated.factions.length === 0) {
      validated.factions = [
        {
          name: 'The Guardians',
          description: 'Protectors of the old ways and keepers of ancient knowledge.'
        },
        {
          name: 'The Seekers',
          description: 'A group dedicated to uncovering lost treasures and forgotten magic.'
        }
      ];
    }
    
    // Ensure key items are present
    if (!validated.keyItems || !Array.isArray(validated.keyItems) || validated.keyItems.length === 0) {
      validated.keyItems = [
        {
          name: 'Ancient Map',
          description: 'A weathered map showing locations of mysterious significance.'
        },
        {
          name: 'Strange Amulet',
          description: 'An amulet that seems to pulse with unknown energy.'
        }
      ];
    }
    
    return validated;
  }
  
  /**
   * Enhance world data with additional elements
   * @param {object} worldData - Base world data
   * @returns {object} Enhanced world data
   */
  function enhanceWorldData(worldData) {
    // Generate nearby locations based on the starting location
    const nearbyLocations = generateNearbyLocations(worldData);
    
    // Generate some basic NPCs
    const npcs = generateBasicNPCs(worldData);
    
    // Add weather and time of day
    const environment = generateEnvironment(worldData);
    
    // Return the enhanced world
    return {
      ...worldData,
      nearbyLocations,
      npcs,
      environment
    };
  }
  
  /**
   * Generate nearby locations based on the world type and starting location
   * @param {object} worldData - Base world data
   * @returns {Array} List of nearby locations
   */
  function generateNearbyLocations(worldData) {
    const locationType = worldData.type.toLowerCase();
    
    // Generate different types of locations based on world type
    const locationSets = {
      fantasy: [
        { id: 'village_square', name: 'Village Square', description: 'The bustling center of the nearby settlement, filled with merchants and townsfolk.' },
        { id: 'ancient_ruins', name: 'Ancient Ruins', description: 'Crumbling stone structures covered in vines and moss, hinting at a civilization long gone.' },
        { id: 'dark_forest', name: 'Dark Forest', description: 'A dense forest where sunlight barely penetrates the thick canopy of leaves overhead.' }
      ],
      'sci-fi': [
        { id: 'space_port', name: 'Space Port', description: 'A busy docking area for interstellar vessels, filled with travelers from distant worlds.' },
        { id: 'research_lab', name: 'Research Laboratory', description: 'A sterile facility where scientists conduct experiments with advanced technology.' },
        { id: 'alien_market', name: 'Xenomarket', description: 'A crowded market where traders sell exotic goods from across the galaxy.' }
      ],
      'post-apocalyptic': [
        { id: 'ruined_city', name: 'Ruined City', description: 'The hollow shell of a once-thriving metropolis, now home to scavengers and dangers.' },
        { id: 'survivor_camp', name: 'Survivor Camp', description: 'A fortified encampment where the remaining humans have banded together for safety.' },
        { id: 'toxic_wastes', name: 'Toxic Wastes', description: 'A hazardous area where chemicals have contaminated the landscape, creating mutated flora and fauna.' }
      ],
      steampunk: [
        { id: 'clockwork_district', name: 'Clockwork District', description: 'A section of the city filled with whirring gears and steam-powered machinery.' },
        { id: 'airship_docks', name: 'Airship Docks', description: 'Massive platforms where airships dock, loading and unloading passengers and cargo.' },
        { id: 'inventors_guild', name: 'Inventors\' Guild', description: 'A prestigious building where brilliant minds develop new mechanical wonders.' }
      ],
      cyberpunk: [
        { id: 'neon_market', name: 'Neon Market', description: 'A chaotic marketplace illuminated by colorful holographic advertisements.' },
        { id: 'corporate_sector', name: 'Corporate Sector', description: 'Towering skyscrapers where megacorporations control the fate of millions.' },
        { id: 'underground_club', name: 'Underground Club', description: 'A hidden nightclub where hackers and rebels gather away from prying eyes.' }
      ]
    };
    
    // Get the appropriate location set or use fantasy as default
    const locations = locationSets[locationType] || locationSets.fantasy;
    
    return locations;
  }
  
  /**
   * Generate basic NPCs for the world
   * @param {object} worldData - Base world data
   * @returns {Array} List of NPCs
   */
  function generateBasicNPCs(worldData) {
    // Generate different types of NPCs based on world type
    const worldType = worldData.type.toLowerCase();
    
    const npcSets = {
      fantasy: [
        { id: 'village_elder', name: 'Elder Thorne', description: 'A wise village elder with knowledge of the land.', relationship: 50 },
        { id: 'mysterious_stranger', name: 'The Hooded Figure', description: 'A traveler who speaks little but seems to know much about recent events.', relationship: 30 },
        { id: 'tavern_keeper', name: 'Innkeeper Mira', description: 'The cheerful proprietor of the local tavern, a hub of gossip and information.', relationship: 60 }
      ],
      'sci-fi': [
        { id: 'station_ai', name: 'ARIA', description: 'The artificial intelligence that manages the station systems.', relationship: 50 },
        { id: 'smuggler', name: 'Captain Rax', description: 'A ship captain who transports goods of questionable legality across systems.', relationship: 40 },
        { id: 'scientist', name: 'Dr. Elara Vex', description: 'A brilliant xenobiologist studying alien lifeforms.', relationship: 55 }
      ],
      'post-apocalyptic': [
        { id: 'wasteland_guide', name: 'Scrapper Jones', description: 'A seasoned survivor who knows how to navigate the dangerous wastes.', relationship: 45 },
        { id: 'trade_merchant', name: 'Barter', description: 'A resourceful merchant who deals in salvaged goods and vital supplies.', relationship: 50 },
        { id: 'doctor', name: 'Doc Myers', description: 'One of the few remaining medical professionals, treating injuries and radiation sickness.', relationship: 60 }
      ],
      steampunk: [
        { id: 'inventor', name: 'Professor Cogsworth', description: 'An eccentric inventor always working on the next revolutionary device.', relationship: 55 },
        { id: 'airship_captain', name: 'Captain Victoria Wells', description: 'The stern but fair captain of an airship that travels between major cities.', relationship: 50 },
        { id: 'aristocrat', name: 'Lord Pemberton', description: 'A wealthy nobleman with connections throughout high society.', relationship: 40 }
      ],
      cyberpunk: [
        { id: 'hacker', name: 'Glitch', description: 'A skilled netrunner who can breach almost any security system for the right price.', relationship: 45 },
        { id: 'fixer', name: 'Jax', description: 'A well-connected middleman who arranges jobs and deals in the shadows.', relationship: 50 },
        { id: 'street_doc', name: 'Dr. Circuit', description: 'An underground surgeon specializing in cybernetic implants and modifications.', relationship: 55 }
      ]
    };
    
    // Get the appropriate NPC set or use fantasy as default
    return npcSets[worldType] || npcSets.fantasy;
  }
  
  /**
   * Generate environmental conditions for the world
   * @param {object} worldData - Base world data
   * @returns {object} Environmental conditions
   */
  function generateEnvironment(worldData) {
    // Time of day options
    const timeOptions = ['dawn', 'morning', 'midday', 'afternoon', 'dusk', 'evening', 'night', 'midnight'];
    
    // Weather options based on world type
    const weatherSets = {
      fantasy: ['clear', 'cloudy', 'rainy', 'foggy', 'stormy', 'windy'],
      'sci-fi': ['clear', 'meteor shower', 'solar flare', 'artificial weather', 'atmosphere fluctuation'],
      'post-apocalyptic': ['toxic haze', 'acid rain', 'radiation storm', 'dust storm', 'nuclear winter'],
      steampunk: ['smoggy', 'foggy', 'rainy', 'clear with airship traffic', 'coal dust clouds'],
      cyberpunk: ['acid rain', 'smog', 'neon-lit darkness', 'pollution haze', 'artificial weather']
    };
    
    const worldType = worldData.type.toLowerCase();
    const weatherOptions = weatherSets[worldType] || weatherSets.fantasy;
    
    return {
      time: timeOptions[Math.floor(Math.random() * timeOptions.length)],
      weather: weatherOptions[Math.floor(Math.random() * weatherOptions.length)],
      season: ['spring', 'summer', 'autumn', 'winter'][Math.floor(Math.random() * 4)]
    };
  }
  
  /**
   * Get a fallback world if generation fails
   * @returns {object} Fallback world data
   */
  function getFallbackWorld() {
    return {
      type: 'fantasy',
      name: 'Eldoria',
      description: 'A realm of magic and mystery, where ancient forests hide forgotten secrets and mythical creatures roam the wilderness.',
      startingLocation: {
        id: 'forest_edge',
        name: 'Forest Edge',
        description: 'A dense, misty forest with ancient trees. A narrow path winds its way between massive trunks, disappearing into the shadows. The air is thick with the scent of moss and rain.'
      },
      introText: 'You find yourself standing at the edge of a dense, misty forest. A narrow path winds its way between ancient trees, disappearing into the shadows. The air is thick with the scent of moss and rain. In the distance, you hear the faint sound of flowing water and what might be voices. Your journey in Eldoria begins here, at the threshold of the unknown.',
      potentialPlotHooks: [
        'Strange symbols carved into trees',
        'Rumors of a hidden temple',
        'Villagers disappearing in the night'
      ],
      factions: [
        {
          name: 'The Guardians of the Grove',
          description: 'Protectors of the forest who follow ancient druidic traditions.'
        },
        {
          name: 'The Imperial Order',
          description: 'Representatives of the distant empire, seeking to expand their influence.'
        }
      ],
      keyItems: [
        {
          name: 'Ancient Amulet',
          description: 'A mysterious amulet that glows faintly in the presence of magic.'
        },
        {
          name: 'Forest Map',
          description: 'A weathered map showing hidden paths through the dense woods.'
        }
      ],
      nearbyLocations: [
        { id: 'village_clearing', name: 'Village Clearing', description: 'A small settlement at the edge of the forest where traders and travelers rest.' },
        { id: 'ancient_ruins', name: 'Ancient Ruins', description: 'Crumbling stone structures covered in vines and moss, hinting at a civilization long gone.' },
        { id: 'mystic_grove', name: 'Mystic Grove', description: 'A peaceful clearing where magical flora grows and strange lights float in the air.' }
      ],
      npcs: [
        { id: 'village_elder', name: 'Elder Thorne', description: 'A wise village elder with knowledge of the forest and its secrets.', relationship: 50 },
        { id: 'wandering_merchant', name: 'Trader Lyra', description: 'A traveling merchant who deals in rare and unusual goods.', relationship: 50 },
        { id: 'mysterious_stranger', name: 'The Hooded Figure', description: 'A silent observer who seems to appear and disappear at will.', relationship: 30 }
      ],
      environment: {
        time: 'dusk',
        weather: 'misty',
        season: 'autumn'
      }
    };
  }
  
  module.exports = {
    generateWorld,
    getFallbackWorld
  };