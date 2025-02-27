import React, { useState, useRef, useEffect } from 'react';

const PlayerInput = ({ onSubmit, isProcessing, className }) => {
  const [input, setInput] = useState('');
  const inputRef = useRef(null);
  
  // Focus input on component mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Focus input after processing completes
  useEffect(() => {
    if (!isProcessing) {
      inputRef.current?.focus();
    }
  }, [isProcessing]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!input.trim() || isProcessing) return;
    
    onSubmit(input);
    setInput('');
  };

  // Command history functionality could be added here
  
  return (
    <div>
      <form onSubmit={handleSubmit} className={`relative ${className}`}>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={isProcessing}
          placeholder="What would you like to do?"
          className="w-full bg-gray-900/50 border border-gray-700/50 rounded-lg py-3 px-4 pr-24 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500"
        />
        <button
          type="submit"
          disabled={isProcessing}
          className="absolute right-2 top-1/2 -translate-y-1/2 bg-violet-600 hover:bg-violet-700 text-white py-1.5 px-4 rounded-md transition-colors duration-200 disabled:opacity-50"
        >
          {isProcessing ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Processing
            </span>
          ) : (
            'Send'
          )}
        </button>
      </form>
      
      {/* Command suggestions could go here */}
      <div className="hidden absolute bottom-full left-0 right-0 bg-gray-800 border border-gray-700 rounded-lg mt-1 p-2">
        <div className="text-xs text-gray-400 mb-1">Suggested actions:</div>
        <div className="grid grid-cols-2 gap-1">
          <button className="text-left text-sm p-1 hover:bg-gray-700 rounded">Explore the forest</button>
          <button className="text-left text-sm p-1 hover:bg-gray-700 rounded">Check inventory</button>
          <button className="text-left text-sm p-1 hover:bg-gray-700 rounded">Look around</button>
          <button className="text-left text-sm p-1 hover:bg-gray-700 rounded">Talk to the stranger</button>
        </div>
      </div>
    </div>
  );
};

export default PlayerInput;