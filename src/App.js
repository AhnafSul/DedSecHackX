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
      { id: 'income', duration: 2500, progress: 40 },
      { id: 'credit', duration: 2000, progress: 60 },
      { id: 'loan', duration: 2000, progress: 80 },
      { id: 'transaction', duration: 1500, progress: 100 }
    ];

    let currentIndex = 0;
    
    const processStages = async () => {
      if (currentIndex < stages.length) {
        const stage = stages[currentIndex];
        setCurrentStage(stage.id);
        
        // Start analysis for this stage
        if (stage.id !== 'init') {
          console.log(`Starting ${stage.id} analysis...`);
          try {
            const analysisResult = await novaService.analyzeApplicantData(applicantData, stage.id);
            console.log(`${stage.id} analysis result:`, analysisResult);
          } catch (error) {
            console.log(`${stage.id} analysis error:`, error);
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
            const finalResults = novaService.generateFinalRecommendation(applicantData);
            setAnalysisResults(finalResults);
            console.log('Final analysis results:', finalResults);
            
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

  if (isLoading) {
    return <LoadingAnimation stage={currentStage} progress={progress} />;
  }

  const handleBack = () => {
    setSelectedApplicant(null);
    window.history.pushState({}, '', '#');
  };

  return <Dashboard applicantData={applicantData} analysisResults={analysisResults} onBack={handleBack} />;
}

export default App;