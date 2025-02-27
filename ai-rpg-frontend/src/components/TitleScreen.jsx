import React, { useState } from 'react';
import { useGameState } from '../contexts/GameStateContext';

const TitleScreen = ({ onStartGame }) => {
  const { actions } = useGameState();
  const [selectedWorld, setSelectedWorld] = useState(null);
  const [isStarting, setIsStarting] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  
  // Available world types to choose from
  const worldTypes = [
    { id: 'fantasy', name: 'Fantasy', description: 'A world of magic, mythical creatures, and ancient prophecies.' },
    { id: 'sci-fi', name: 'Sci-Fi', description: 'Advanced technology, space exploration, and alien civilizations.' },
    { id: 'post-apocalyptic', name: 'Post-Apocalyptic', description: 'A ruined world where survivors struggle to rebuild society.' },
    { id: 'steampunk', name: 'Steampunk', description: 'Victorian aesthetics with advanced steam-powered technology.' },
    { id: 'cyberpunk', name: 'Cyberpunk', description: 'High tech and low life in a corporate-dominated dystopian future.' },
    { id: 'random', name: 'Surprise Me', description: 'Let fate decide your adventure.' }
  ];
  
  const handleStartGame = async () => {
    setIsStarting(true);
    
    try {
      // Use random if "Surprise Me" is selected, otherwise use the selected world type
      const worldType = selectedWorld === 'random' ? null : selectedWorld;
      await actions.newGame(worldType);
      onStartGame();
    } catch (error) {
      console.error('Failed to start new game:', error);
      setIsStarting(false);
    }
  };
  
  const handleLoadGame = async () => {
    setIsStarting(true);
    
    try {
      const success = await actions.loadGame();
      if (success) {
        onStartGame();
      } else {
        setIsStarting(false);
      }
    } catch (error) {
      console.error('Failed to load game:', error);
      setIsStarting(false);
    }
  };
  
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white p-4">
      {/* Title */}
      <div className="text-center mb-8">
        <h1 className="text-5xl font-bold mb-2 text-purple-400">Realms of Imagination</h1>
        <p className="text-xl text-gray-400">An AI-powered text adventure</p>
      </div>
      
      {/* Main menu */}
      <div className="bg-gray-800 p-6 rounded-lg shadow-lg w-full max-w-md">
        {!showOptions ? (
          <div className="space-y-4">
            <button
              onClick={() => setShowOptions(true)}
              className="w-full bg-purple-700 hover:bg-purple-600 text-white py-3 px-4 rounded-lg text-lg font-medium transition-colors"
            >
              New Adventure
            </button>
            
            <button
              onClick={handleLoadGame}
              disabled={isStarting}
              className="w-full bg-gray-700 hover:bg-gray-600 text-white py-3 px-4 rounded-lg text-lg font-medium transition-colors disabled:opacity-50"
            >
              {isStarting ? 'Loading...' : 'Continue Adventure'}
            </button>
            
            <div className="border-t border-gray-700 pt-4 mt-4">
              <p className="text-gray-400 text-center text-sm">
                Embark on a journey where your words shape the world.
                <br />Type commands, explore, and uncover the secrets that await.
              </p>
            </div>
          </div>
        ) : (
          <div>
            <h2 className="text-xl font-bold mb-4 text-center">Choose Your World</h2>
            
            <div className="space-y-3 mb-6">
              {worldTypes.map((world) => (
                <div
                  key={world.id}
                  onClick={() => setSelectedWorld(world.id)}
                  className={`p-3 rounded-lg cursor-pointer transition-colors ${
                    selectedWorld === world.id
                      ? 'bg-purple-900 border-2 border-purple-500'
                      : 'bg-gray-700 hover:bg-gray-600 border-2 border-transparent'
                  }`}
                >
                  <div className="font-medium">{world.name}</div>
                  <div className="text-sm text-gray-400">{world.description}</div>
                </div>
              ))}
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={() => setShowOptions(false)}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded-lg transition-colors"
              >
                Back
              </button>
              
              <button
                onClick={handleStartGame}
                disabled={!selectedWorld || isStarting}
                className="flex-1 bg-purple-700 hover:bg-purple-600 text-white py-2 px-4 rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                {isStarting ? 'Creating World...' : 'Begin Journey'}
              </button>
            </div>
          </div>
        )}
      </div>
      
      {/* Footer */}
      <div className="mt-8 text-center text-sm text-gray-500">
        <p>Created with React, Node.js, and OpenAI</p>
        <p className="mt-1">© 2025 GunDalf</p>
      </div>
    </div>
  );
};

export default TitleScreen;