import React, { useRef, useEffect } from 'react';

const GameHistory = ({ history, className }) => {
  const historyEndRef = useRef(null);
  
  // Auto-scroll to bottom when history updates
  useEffect(() => {
    historyEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  return (
    <div className={`space-y-4 ${className}`}>
      {history.map((entry, index) => (
        <div 
          key={index} 
          className={`p-4 rounded-lg animate-fade-in ${
            entry.type === 'action' 
              ? 'bg-violet-900/30 border border-violet-700/50' 
              : entry.type === 'system'
              ? 'bg-blue-900/30 border border-blue-700/50'
              : 'bg-gray-900/30 border border-gray-700/50'
          }`}
        >
          <p className="text-lg leading-relaxed">{entry.text}</p>
        </div>
      ))}
      <div ref={historyEndRef} />
    </div>
  );
};

// Renders different entry types with appropriate styling
const HistoryEntry = ({ entry }) => {
  const { type, text } = entry;

  // Define classes based on entry type
  let containerClasses = "p-3 rounded ";
  
  switch (type) {
    case 'action':
      containerClasses += "bg-blue-900/30 border-l-4 border-blue-500";
      break;
    case 'system':
      containerClasses += "bg-red-900/30 border-l-4 border-red-500";
      break;
    case 'narrative':
    default:
      containerClasses += "bg-gray-800/70";
  }

  // Animation could be added with Framer Motion or CSS classes
  
  return (
    <div className={containerClasses}>
      {type === 'action' && <span className="text-blue-400">{'> '}</span>}
      <span className="whitespace-pre-wrap">{text}</span>
    </div>
  );
};

export default GameHistory;