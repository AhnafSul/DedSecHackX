import React, { useState, useEffect } from 'react';
import LoadingAnimation from './LoadingAnimation';
import Dashboard from './Dashboard';
import ApplicantSelector from './ApplicantSelector';
import { getApplicantData } from './data/dataLoader';
import AWSNovaService from './services/AWSNovaService';

function App() {
  const [selectedApplicant, setSelectedApplicant] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [currentStage, setCurrentStage] = useState('init');
  const [progress, setProgress] = useState(0);
  const [applicantData, setApplicantData] = useState(null);
  const [analysisResults, setAnalysisResults] = useState(null);
  const [connectionError, setConnectionError] = useState(false);
  const [novaService] = useState(new AWSNovaService());

  // Handle browser back button
  useEffect(() => {
    const handlePopState = () => {
      setSelectedApplicant(null);
    };
    
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleSelectApplicant = (applicantId) => {
    setSelectedApplicant(applicantId);
    setIsLoading(true);
    setProgress(0);
    setCurrentStage('init');
    setAnalysisResults(null);
    
    // Load the actual applicant data
    const data = getApplicantData(applicantId);
    setApplicantData(data);
    
    // Clear previous analysis
    novaService.clearResults();
    
    // Add to browser history
    window.history.pushState({ applicantId }, '', `#applicant-${applicantId}`);
  };

  useEffect(() => {
    if (!selectedApplicant || !applicantData) return;
    
    const stages = [
      { id: 'init', duration: 1000, progress: 20 },
      { id: 'income', duration: 500, progress: 40 },
      { id: 'credit', duration: 500, progress: 60 },
      { id: 'loan', duration: 500, progress: 80 },
      { id: 'transaction', duration: 500, progress: 100 }
    ];

    let currentIndex = 0;
    
    const processStages = async () => {
      if (currentIndex < stages.length) {
        const stage = stages[currentIndex];
        setCurrentStage(stage.id);
        
        // Start analysis for this stage
        if (stage.id !== 'init') {
          try {
            await novaService.analyzeApplicantData(applicantData, stage.id);
          } catch (error) {
            // Analysis failed, will use local fallback
          }
        }
        
        // Animate progress
        const progressInterval = setInterval(() => {
          setProgress(prev => {
            const increment = (stage.progress - (currentIndex > 0 ? stages[currentIndex - 1].progress : 0)) / 20;
            const newProgress = prev + increment;
            
            if (newProgress >= stage.progress) {
              clearInterval(progressInterval);
              return stage.progress;
            }
            return newProgress;
          });
        }, stage.duration / 20);

        setTimeout(async () => {
          currentIndex++;
          if (currentIndex >= stages.length) {
            // Generate final recommendation
            const finalResults = await novaService.generateFinalRecommendation(applicantData);
            setAnalysisResults(finalResults);
            
            setTimeout(() => {
              setIsLoading(false);
            }, 500);
          } else {
            processStages();
          }
        }, stage.duration);
      }
    };

    processStages();
  }, [selectedApplicant, applicantData, novaService]);

  if (!selectedApplicant) {
    return <ApplicantSelector onSelectApplicant={handleSelectApplicant} />;
  }

  if (isLoading && !connectionError) {
    return (
      <LoadingAnimation 
        stage={currentStage} 
        progress={progress} 
        onConnectionError={() => setConnectionError(true)}
      />
    );
  }
  
  if (connectionError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-900 via-orange-900 to-red-900">
        <div className="text-center space-y-6 p-8 bg-white/10 backdrop-blur-sm rounded-2xl border border-red-400/30 max-w-md">
          <div className="text-6xl">❌</div>
          <h2 className="text-2xl font-bold text-white">AWS Connection Failed</h2>
          <p className="text-red-200">Unable to connect to AWS Nova AI service</p>
          <button 
            onClick={() => {
              setConnectionError(false);
              setSelectedApplicant(null);
            }} 
            className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
          >
            Back to Selection
          </button>
        </div>
      </div>
    );
  }

  const handleBack = () => {
    setSelectedApplicant(null);
    window.history.pushState({}, '', '#');
  };

  return <Dashboard applicantData={applicantData} analysisResults={analysisResults} onBack={handleBack} />;
}

export default App;