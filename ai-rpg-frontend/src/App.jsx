import React, { useState } from 'react';
import { GameStateProvider } from './contexts/GameStateContext';
import GameConsole from './components/GameConsole';
import TitleScreen from './components/TitleScreen';
import './App.css';

function App() {
  const [gameStarted, setGameStarted] = useState(false);
  
  return (
    <div className="min-h-screen bg-gray-900 text-gray-200">
      <GameStateProvider>
        {!gameStarted ? (
          <TitleScreen onStartGame={() => setGameStarted(true)} />
        ) : (
          <>
            <header className="bg-gray-800 p-4 border-b border-gray-700">
              <div className="container mx-auto flex items-center justify-between">
                <h1 className="text-2xl font-bold text-purple-400">Realms of Imagination</h1>
                <button 
                  onClick={() => setGameStarted(false)}
                  className="text-sm text-gray-400 hover:text-white"
                >
                  Return to Menu
                </button>
              </div>
            </header>
            
            <main className="container mx-auto p-4 h-[calc(100vh-4rem)]">
              <GameConsole />
            </main>
          </>
        )}
      </GameStateProvider>
    </div>
  );
}

export default App;