import React, { useState } from 'react';

const CharacterPanel = ({ gameState }) => {
  if (!gameState) return null;

  const [activeTab, setActiveTab] = useState('character');
  
  return (
    <div className="bg-gray-900/30 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/10 overflow-hidden">
      {/* Tabs */}
      <div className="flex bg-gray-900/50 border-b border-white/5">
        <button
          onClick={() => setActiveTab('character')}
          className={`flex-1 py-4 text-sm font-medium transition-all duration-200 ${
            activeTab === 'character'
              ? 'text-purple-400 border-b-2 border-purple-400 bg-white/5'
              : 'text-gray-400 hover:text-white hover:bg-white/5'
          }`}
        >
          Character
        </button>
        <button
          onClick={() => setActiveTab('map')}
          className={`flex-1 py-4 text-sm font-medium transition-all duration-200 ${
            activeTab === 'map'
              ? 'text-purple-400 border-b-2 border-purple-400 bg-white/5'
              : 'text-gray-400 hover:text-white hover:bg-white/5'
          }`}
        >
          Map
        </button>
        <button
          onClick={() => setActiveTab('journal')}
          className={`flex-1 py-4 text-sm font-medium transition-all duration-200 ${
            activeTab === 'journal'
              ? 'text-purple-400 border-b-2 border-purple-400 bg-white/5'
              : 'text-gray-400 hover:text-white hover:bg-white/5'
          }`}
        >
          Journal
        </button>
      </div>
      
      {/* Tab content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'character' && (
          <CharacterTab player={gameState.player} location={gameState.currentLocation} />
        )}
        {activeTab === 'map' && (
          <MapTab 
            currentLocation={gameState.currentLocation} 
            discoveredLocations={gameState.discoveredLocations} 
          />
        )}
        {activeTab === 'journal' && (
          <JournalTab player={gameState.player} />
        )}
      </div>
    </div>
  );
};

const CharacterTab = ({ player, location }) => {
  if (!player || !location) return null;

  return (
    <div className="p-6 h-[calc(100vh-200px)] overflow-y-auto custom-scrollbar space-y-6">
      {/* Current location */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-blue-500/10 rounded-xl"></div>
        <div className="relative bg-gray-800/30 backdrop-blur-sm rounded-xl p-4 border border-white/10">
          <h2 className="text-lg font-bold mb-3 text-purple-300">Current Location</h2>
          <div className="font-medium text-white/90">{location.name}</div>
          <div className="text-sm text-gray-400 mt-2">{location.description}</div>
        </div>
      </div>
      
      {/* Character stats */}
      <div>
        <h2 className="text-lg font-bold mb-3 text-purple-300">Stats</h2>
        <div className="space-y-4">
          <div className="bg-gray-800/30 backdrop-blur-sm rounded-xl p-4 border border-white/10">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-400">Health</span>
              <span className="text-white/90">{player.health}/100</span>
            </div>
            <div className="w-full bg-gray-900/50 rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-red-500 to-red-600 h-2 rounded-full transition-all duration-300" 
                style={{ width: `${player.health}%` }}
              />
            </div>
          </div>
          
          <div className="bg-gray-800/30 backdrop-blur-sm rounded-xl p-4 border border-white/10">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-400">Experience</span>
              <span className="text-white/90">{player.experience || 0}</span>
            </div>
            <div className="w-full bg-gray-900/50 rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-blue-400 to-purple-500 h-2 rounded-full transition-all duration-300" 
                style={{ width: `${(player.experience % 100) || 0}%` }}
              />
            </div>
          </div>
        </div>
      </div>
      
      {/* Inventory */}
      <div>
        <h2 className="text-lg font-bold mb-3 text-purple-300">Inventory</h2>
        <div className="bg-gray-800/30 backdrop-blur-sm rounded-xl p-4 border border-white/10">
          {player.inventory && player.inventory.length > 0 ? (
            <div className="grid grid-cols-2 gap-2">
              {player.inventory.map((item, index) => (
                <div 
                  key={index} 
                  className="flex items-center bg-gray-900/30 rounded-lg p-2 border border-white/5 hover:border-purple-500/30 transition-colors duration-200"
                >
                  <span className="text-purple-400 mr-2">•</span>
                  <span className="text-gray-300">{item}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400">No items</p>
          )}
        </div>
      </div>

      {/* Quests */}
      <div>
        <h2 className="text-lg font-bold mb-3 text-purple-300">Active Quests</h2>
        <div className="bg-gray-800/30 backdrop-blur-sm rounded-xl p-4 border border-white/10">
          {player.quests && player.quests.length > 0 ? (
            <div className="space-y-3">
              {player.quests.map((quest, index) => (
                <div 
                  key={index} 
                  className="bg-gray-900/30 rounded-lg p-3 border border-white/5 hover:border-purple-500/30 transition-colors duration-200"
                >
                  <div className="flex items-center">
                    <span className="text-yellow-400 mr-2">⚡</span>
                    <span className="text-white/90">{typeof quest === 'string' ? quest : quest.title}</span>
                  </div>
                  {typeof quest === 'object' && quest.description && (
                    <p className="text-sm text-gray-400 ml-6 mt-2">{quest.description}</p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400">No active quests</p>
          )}
        </div>
      </div>
    </div>
  );
};

const MapTab = ({ currentLocation, discoveredLocations }) => {
  return (
    <div className="p-6 h-[calc(100vh-200px)] overflow-y-auto custom-scrollbar space-y-6">
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-emerald-500/10 rounded-xl"></div>
        <div className="relative bg-gray-800/30 backdrop-blur-sm rounded-xl p-4 border border-white/10">
          <h2 className="text-lg font-bold mb-3 text-blue-300">Current Location</h2>
          <div className="font-medium text-white/90">{currentLocation.name}</div>
          <div className="text-sm text-gray-400 mt-2">{currentLocation.description}</div>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-bold mb-3 text-blue-300">Discovered Locations</h2>
        <div className="space-y-2">
          {discoveredLocations.map((locationId, index) => (
            <div 
              key={index}
              className={`bg-gray-800/30 backdrop-blur-sm rounded-xl p-4 border transition-colors duration-200 ${
                currentLocation.id === locationId 
                  ? 'border-blue-500/30 bg-blue-900/10' 
                  : 'border-white/10 hover:border-blue-500/30'
              }`}
            >
              <div className="flex items-center">
                <span className="text-blue-400 mr-2">
                  {currentLocation.id === locationId ? '📍' : '🗺️'}
                </span>
                <span className="text-white/90">{locationId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const JournalTab = ({ player }) => {
  return (
    <div className="p-6 h-[calc(100vh-200px)] overflow-y-auto custom-scrollbar space-y-6">
      {/* Active Quests */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/10 to-orange-500/10 rounded-xl"></div>
        <div className="relative bg-gray-800/30 backdrop-blur-sm rounded-xl p-4 border border-white/10">
          <h2 className="text-lg font-bold mb-3 text-yellow-300">Active Quests</h2>
          {player.quests && player.quests.length > 0 ? (
            <div className="space-y-3">
              {player.quests.map((quest, index) => (
                <div 
                  key={index}
                  className="bg-gray-900/30 rounded-lg p-4 border border-white/5 hover:border-yellow-500/30 transition-colors duration-200"
                >
                  <div className="flex items-center">
                    <span className="text-yellow-400 mr-2">📜</span>
                    <span className="text-white/90 font-medium">
                      {typeof quest === 'string' ? quest : quest.title}
                    </span>
                  </div>
                  {typeof quest === 'object' && (
                    <div className="mt-2 space-y-2">
                      {quest.description && (
                        <p className="text-sm text-gray-400">{quest.description}</p>
                      )}
                      {quest.objectives && (
                        <div className="space-y-1">
                          {quest.objectives.map((objective, i) => (
                            <div key={i} className="flex items-center text-sm">
                              <span className="text-yellow-500 mr-2">
                                {objective.completed ? '✓' : '○'}
                              </span>
                              <span className={objective.completed ? 'text-gray-500 line-through' : 'text-gray-300'}>
                                {objective.text}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400">No active quests</p>
          )}
        </div>
      </div>

      {/* Stats & Achievements */}
      <div>
        <h2 className="text-lg font-bold mb-3 text-yellow-300">Character Progress</h2>
        <div className="bg-gray-800/30 backdrop-blur-sm rounded-xl p-4 border border-white/10">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-900/30 rounded-lg p-3 border border-white/5">
              <div className="text-gray-400 text-sm">Level</div>
              <div className="text-2xl font-bold text-white/90">{Math.floor(player.experience / 100) + 1}</div>
            </div>
            <div className="bg-gray-900/30 rounded-lg p-3 border border-white/5">
              <div className="text-gray-400 text-sm">Items Found</div>
              <div className="text-2xl font-bold text-white/90">{player.inventory.length}</div>
            </div>
            <div className="bg-gray-900/30 rounded-lg p-3 border border-white/5">
              <div className="text-gray-400 text-sm">Health</div>
              <div className="text-2xl font-bold text-white/90">{player.health}%</div>
            </div>
            <div className="bg-gray-900/30 rounded-lg p-3 border border-white/5">
              <div className="text-gray-400 text-sm">Active Quests</div>
              <div className="text-2xl font-bold text-white/90">{player.quests.length}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CharacterPanel;