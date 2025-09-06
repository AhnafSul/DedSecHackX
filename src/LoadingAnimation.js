import React from 'react';

const LoadingAnimation = ({ stage, progress }) => {
  const stages = [
    { id: 'init', label: 'Initializing XAI Engine', icon: '🧠', color: 'text-purple-400' },
    { id: 'income', label: 'Analyzing Income Reports', icon: '📄', color: 'text-green-400' },
    { id: 'credit', label: 'Analyzing Credit Reports', icon: '💳', color: 'text-blue-400' },
    { id: 'loan', label: 'Analyzing Loan Reports', icon: '📈', color: 'text-yellow-400' },
    { id: 'transaction', label: 'Analyzing Transaction Logs', icon: '⚡', color: 'text-red-400' }
  ];

  const currentStageIndex = stages.findIndex(s => s.id === stage);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="text-center space-y-8 p-8">
        {/* Main Loading Circle */}
        <div className="relative">
          <div className="w-32 h-32 border-4 border-purple-200 rounded-full mx-auto animate-spin"></div>
          <div className="absolute inset-0 w-32 h-32 border-4 border-transparent border-t-purple-500 rounded-full mx-auto animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-4xl">🧠</span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-80 mx-auto">
          <div className="bg-gray-700 rounded-full h-2 mb-4">
            <div
              className="bg-gradient-to-r from-purple-500 to-blue-500 h-2 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-gray-300 text-sm">{progress}% Complete</p>
        </div>

        {/* Stage Indicators */}
        <div className="space-y-4">
          {stages.map((stageItem, index) => {
            const isActive = index === currentStageIndex;
            const isCompleted = index < currentStageIndex;
            
            return (
              <div
                key={stageItem.id}
                className={`flex items-center justify-center space-x-3 p-3 rounded-lg transition-all duration-300 ${
                  isActive ? 'bg-white bg-opacity-10 scale-105' : isCompleted ? 'bg-green-500 bg-opacity-20' : 'bg-gray-800 bg-opacity-50'
                }`}
              >
                <span className="text-xl">{stageItem.icon}</span>
                <span className={`text-sm font-medium ${
                  isActive ? 'text-white' : isCompleted ? 'text-green-400' : 'text-gray-400'
                }`}>
                  {stageItem.label}
                  {isActive && <span className="ml-1 animate-pulse">...</span>}
                </span>
                {isCompleted && (
                  <div className="w-2 h-2 bg-green-400 rounded-full" />
                )}
              </div>
            );
          })}
        </div>

        {/* XAI Branding */}
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-2">Loan Decision XAI</h1>
          <p className="text-gray-400 text-sm">Explainable AI for Intelligent Lending</p>
        </div>
      </div>
    </div>
  );
};

export default LoadingAnimation;