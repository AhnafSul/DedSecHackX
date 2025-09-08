import React, { useState, useEffect } from 'react';

const LoadingAnimation = ({ stage, progress, onConnectionError }) => {
  const [awsConnected, setAwsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState(null);
  
  // Check AWS connection
  useEffect(() => {
    const checkAWSConnection = async () => {
      try {
        const response = await fetch('https://bedrock-runtime.us-east-1.amazonaws.com/model/amazon.nova-pro-v1:0/invoke', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.REACT_APP_AWS_NOVA_KEY}`
          },
          body: JSON.stringify({
            messages: [{ role: 'user', content: [{ text: 'test' }] }],
            inferenceConfig: { maxTokens: 1 }
          })
        });
        
        if (response.status === 200 || response.status === 400) {
          setAwsConnected(true);
        } else {
          throw new Error('AWS connection failed');
        }
      } catch (error) {
        setConnectionError('AWS Nova AI connection failed');
        if (onConnectionError) onConnectionError(error);
      }
    };
    
    if (stage === 'init') {
      checkAWSConnection();
    }
  }, [stage]);
  
  const stages = [
    { 
      id: 'init', 
      label: 'Connecting to AWS Nova AI', 
      icon: awsConnected ? '✅' : connectionError ? '❌' : '🔄', 
      color: awsConnected ? 'text-green-400' : connectionError ? 'text-red-400' : 'text-purple-400',
      status: awsConnected ? 'Connected' : connectionError ? 'Failed' : 'Connecting...'
    },
    { id: 'income', label: 'Analyzing Income Reports', icon: '📄', color: 'text-green-400' },
    { id: 'credit', label: 'Analyzing Credit Reports', icon: '💳', color: 'text-blue-400' },
    { id: 'loan', label: 'Analyzing Loan Reports', icon: '📈', color: 'text-yellow-400' },
    { id: 'transaction', label: 'Analyzing Transaction Logs', icon: '⚡', color: 'text-red-400' }
  ];

  const currentStageIndex = stages.findIndex(s => s.id === stage);
  
  // Show error if AWS connection failed
  if (connectionError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-900 via-orange-900 to-red-900">
        <div className="text-center space-y-6 p-8 bg-white/10 backdrop-blur-sm rounded-2xl border border-red-400/30 max-w-md">
          <div className="text-6xl">❌</div>
          <h2 className="text-2xl font-bold text-white">AWS Connection Failed</h2>
          <p className="text-red-200">Unable to connect to AWS Nova AI service</p>
          <div className="space-y-2 text-sm text-red-300">
            <p>• Check your API key configuration</p>
            <p>• Verify internet connection</p>
            <p>• Ensure AWS service is available</p>
          </div>
          <button 
            onClick={() => window.location.reload()} 
            className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

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
                  {isActive && stageItem.status && <span className="ml-2 text-xs">({stageItem.status})</span>}
                  {isActive && !stageItem.status && <span className="ml-1 animate-pulse">...</span>}
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