import React, { useState } from 'react';
import AWSNovaService from '../services/AWSNovaService';
import SHAPExplainer from '../services/SHAPExplainer';

const ExplainabilityPanel = ({ applicantData, analysisResults, isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState('factors');
  const [simulationResults, setSimulationResults] = useState(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationParams, setSimulationParams] = useState({
    creditScore: applicantData?.credit?.credit_score?.score || 520,
    monthlyIncome: applicantData?.income?.income_statement?.salary_slips?.monthly_income || 50000,
    monthlyEMI: (applicantData?.loan?.loan_repayment_history?.active_loans || []).reduce((sum, loan) => sum + (loan.emi_amount || 0), 0) || 15000,
    paymentHistory: applicantData?.credit?.payment_history?.on_time_payment_ratio || 0.85
  });
  const novaService = new AWSNovaService();
  const shapExplainer = new SHAPExplainer();

  const handleSimulation = async () => {
    setIsSimulating(true);
    try {
      const modifiedData = JSON.parse(JSON.stringify(applicantData));
      modifiedData.credit.credit_score.score = simulationParams.creditScore;
      modifiedData.income.income_statement.salary_slips.monthly_income = simulationParams.monthlyIncome;
      modifiedData.credit.payment_history.on_time_payment_ratio = simulationParams.paymentHistory;
      
      // Auto-adjust credit utilization based on credit score
      const autoUtilization = simulationParams.creditScore >= 750 ? 0.2 : // Excellent: 20%
                              simulationParams.creditScore >= 700 ? 0.35 : // Good: 35%
                              simulationParams.creditScore >= 650 ? 0.5 :  // Fair: 50%
                              simulationParams.creditScore >= 600 ? 0.65 : // Poor: 65%
                              0.8; // Very Poor: 80%
      
      if (modifiedData.credit?.credit_cards) {
        modifiedData.credit.credit_cards.forEach(card => {
          card.utilization_ratio = autoUtilization;
        });
      }
      
      // Clear and rebuild analysis results with new EMI data
      novaService.analysisResults = {};
      
      // Adjust EMI in loan data
      if (modifiedData.loan?.loan_repayment_history?.active_loans?.length > 0) {
        const totalOriginalEMI = modifiedData.loan.loan_repayment_history.active_loans.reduce((sum, loan) => sum + (loan.emi_amount || 0), 0);
        const ratio = totalOriginalEMI > 0 ? simulationParams.monthlyEMI / totalOriginalEMI : 1;
        modifiedData.loan.loan_repayment_history.active_loans.forEach(loan => {
          loan.emi_amount = Math.round((loan.emi_amount || 0) * ratio);
        });
      }
      
      // Perform fresh loan analysis with modified data
      await novaService.analyzeLoanLocal(modifiedData.loan);
      
      const result = await novaService.generateFinalRecommendation(modifiedData);
      
      // Add SHAP explanations
      const shapAnalysis = shapExplainer.calculateSHAPValues(modifiedData);
      result.shapExplanation = shapAnalysis;
      result.shapCounterfactuals = shapExplainer.generateCounterfactuals(modifiedData);
      
      setSimulationResults(result);
    } catch (error) {
      console.error('Simulation failed:', error);
    } finally {
      setIsSimulating(false);
    }
  };

  if (!isOpen) return null;

  const explainability = analysisResults?.explainability || {};
  const primaryFactors = explainability.primaryFactors || [];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">🔍 Explainable AI Analysis</h2>
              <p className="text-gray-600">Transparent loan decision breakdown</p>
            </div>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-2xl">×</button>
          </div>

          {/* Tabs */}
          <div className="flex space-x-1 mb-6 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setActiveTab('factors')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'factors' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              📊 Decision Factors
            </button>
            <button
              onClick={() => setActiveTab('scenarios')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'scenarios' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              🎯 What-If Scenarios
            </button>
            <button
              onClick={() => setActiveTab('timeline')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'timeline' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              📈 Improvement Timeline
            </button>
          </div>

          {/* Decision Factors Tab */}
          {activeTab === 'factors' && (
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">🎯 Primary Decision Factors</h3>
                <div className="space-y-4">
                  {primaryFactors.map((factor, index) => (
                    <div key={index} className="bg-white rounded-lg p-4 border border-gray-200">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-3">
                          <div className={`w-3 h-3 rounded-full ${
                            factor.impact === 'POSITIVE' ? 'bg-green-500' : 'bg-red-500'
                          }`}></div>
                          <h4 className="font-semibold text-gray-900">{factor.factor}</h4>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            factor.impact === 'POSITIVE' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {factor.impact === 'POSITIVE' ? '✅ Positive' : '❌ Negative'}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-medium text-gray-600">{factor.weight}% weight</span>
                        </div>
                      </div>
                      <p className="text-sm text-gray-700">{factor.description}</p>
                      <div className="mt-2">
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${
                              factor.impact === 'POSITIVE' ? 'bg-green-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${factor.weight}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Decision Logic Explanation */}
              <div className="bg-gray-50 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">🧠 Decision Logic</h3>
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 font-bold">1</span>
                    </div>
                    <p className="text-gray-700">Credit score contributes 40% to the final risk assessment</p>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 font-bold">2</span>
                    </div>
                    <p className="text-gray-700">Debt-to-income ratio accounts for 30% of the decision weight</p>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 font-bold">3</span>
                    </div>
                    <p className="text-gray-700">Payment history and employment stability complete the assessment</p>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                      <span className="text-green-600 font-bold">✓</span>
                    </div>
                    <p className="text-gray-700">Final decision: <strong>{analysisResults?.recommendation}</strong> based on combined risk score of {analysisResults?.riskScore}/100</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* What-If Scenarios Tab */}
          {activeTab === 'scenarios' && (
            <div className="space-y-6">
              {/* Real-time Risk Calculator */}
              <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">🎯 Advanced Loan Simulator</h3>
                <p className="text-gray-600 mb-6">Adjust parameters and see real-time impact on loan approval</p>
                
                {/* Current vs Simulated Comparison */}
                <div className="grid grid-cols-2 gap-6 mb-6">
                  <div className="bg-white rounded-lg p-4 border-2 border-gray-200">
                    <h4 className="font-semibold text-gray-900 mb-3">📋 Current Profile</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Credit Score:</span>
                        <span className="font-bold">{applicantData?.credit?.credit_score?.score}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Monthly Income:</span>
                        <span className="font-bold">₹{(applicantData?.income?.income_statement?.salary_slips?.monthly_income/1000).toFixed(0)}K</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Monthly EMI:</span>
                        <span className="font-bold">₹{((applicantData?.loan?.loan_repayment_history?.active_loans || []).reduce((sum, loan) => sum + (loan.emi_amount || 0), 0)/1000).toFixed(0)}K</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Payment History:</span>
                        <span className="font-bold">{Math.round((applicantData?.credit?.payment_history?.on_time_payment_ratio || 0) * 100)}%</span>
                      </div>
                      <div className="flex justify-between border-t pt-2 mt-2">
                        <span>Current Decision:</span>
                        <span className={`font-bold ${
                          analysisResults?.recommendation === 'APPROVE' ? 'text-green-600' : 'text-red-600'
                        }`}>{analysisResults?.recommendation}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-white rounded-lg p-4 border-2 border-blue-300">
                    <h4 className="font-semibold text-blue-900 mb-3">🔮 Simulated Profile</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Credit Score:</span>
                        <span className="font-bold text-blue-600">{simulationParams.creditScore}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Monthly Income:</span>
                        <span className="font-bold text-blue-600">₹{(simulationParams.monthlyIncome/1000).toFixed(0)}K</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Monthly EMI:</span>
                        <span className="font-bold text-blue-600">₹{(simulationParams.monthlyEMI/1000).toFixed(0)}K</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Payment History:</span>
                        <span className="font-bold text-blue-600">{Math.round(simulationParams.paymentHistory * 100)}%</span>
                      </div>
                      <div className="flex justify-between border-t pt-2 mt-2">
                        <span>Simulated Decision:</span>
                        <span className={`font-bold ${
                          simulationResults?.recommendation === 'APPROVE' ? 'text-green-600' : 
                          simulationResults?.recommendation === 'CONDITIONAL APPROVE' ? 'text-yellow-600' : 'text-red-600'
                        }`}>{simulationResults?.recommendation || 'Run Simulation'}</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Interactive Controls */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-white rounded-lg p-4 shadow-sm">
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-sm font-medium text-gray-700">Credit Score</label>
                      <div className="flex items-center space-x-2">
                        <button 
                          onClick={() => setSimulationParams({...simulationParams, creditScore: Math.max(300, simulationParams.creditScore - 50)})}
                          className="px-2 py-1 bg-red-100 text-red-600 rounded text-xs hover:bg-red-200"
                        >-50</button>
                        <span className="font-bold text-lg min-w-[60px] text-center">{simulationParams.creditScore}</span>
                        <button 
                          onClick={() => setSimulationParams({...simulationParams, creditScore: Math.min(850, simulationParams.creditScore + 50)})}
                          className="px-2 py-1 bg-green-100 text-green-600 rounded text-xs hover:bg-green-200"
                        >+50</button>
                      </div>
                    </div>
                    <input
                      type="range"
                      min="300"
                      max="850"
                      value={simulationParams.creditScore}
                      onChange={(e) => setSimulationParams({...simulationParams, creditScore: parseInt(e.target.value)})}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>300 (Poor)</span>
                      <span>600 (Fair)</span>
                      <span>750 (Excellent)</span>
                      <span>850</span>
                    </div>
                  </div>
                  
                  <div className="bg-white rounded-lg p-4 shadow-sm">
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-sm font-medium text-gray-700">Monthly Income</label>
                      <div className="flex items-center space-x-2">
                        <button 
                          onClick={() => setSimulationParams({...simulationParams, monthlyIncome: Math.max(20000, simulationParams.monthlyIncome - 10000)})}
                          className="px-2 py-1 bg-red-100 text-red-600 rounded text-xs hover:bg-red-200"
                        >-10K</button>
                        <span className="font-bold text-lg min-w-[60px] text-center">₹{(simulationParams.monthlyIncome/1000).toFixed(0)}K</span>
                        <button 
                          onClick={() => setSimulationParams({...simulationParams, monthlyIncome: Math.min(200000, simulationParams.monthlyIncome + 10000)})}
                          className="px-2 py-1 bg-green-100 text-green-600 rounded text-xs hover:bg-green-200"
                        >+10K</button>
                      </div>
                    </div>
                    <input
                      type="range"
                      min="20000"
                      max="200000"
                      step="5000"
                      value={simulationParams.monthlyIncome}
                      onChange={(e) => setSimulationParams({...simulationParams, monthlyIncome: parseInt(e.target.value)})}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>₹20K</span>
                      <span>₹50K</span>
                      <span>₹100K</span>
                      <span>₹200K</span>
                    </div>
                  </div>
                  
                  <div className="bg-white rounded-lg p-4 shadow-sm">
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-sm font-medium text-gray-700">Monthly EMI</label>
                      <div className="flex items-center space-x-2">
                        <button 
                          onClick={() => setSimulationParams({...simulationParams, monthlyEMI: Math.max(0, simulationParams.monthlyEMI - 5000)})}
                          className="px-2 py-1 bg-red-100 text-red-600 rounded text-xs hover:bg-red-200"
                        >-5K</button>
                        <span className="font-bold text-lg min-w-[60px] text-center">₹{(simulationParams.monthlyEMI/1000).toFixed(0)}K</span>
                        <button 
                          onClick={() => setSimulationParams({...simulationParams, monthlyEMI: Math.min(50000, simulationParams.monthlyEMI + 5000)})}
                          className="px-2 py-1 bg-green-100 text-green-600 rounded text-xs hover:bg-green-200"
                        >+5K</button>
                      </div>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="50000"
                      step="1000"
                      value={simulationParams.monthlyEMI}
                      onChange={(e) => setSimulationParams({...simulationParams, monthlyEMI: parseInt(e.target.value)})}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>₹0</span>
                      <span>₹15K</span>
                      <span>₹30K</span>
                      <span>₹50K</span>
                    </div>
                  </div>
                  
                  <div className="bg-white rounded-lg p-4 shadow-sm">
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-sm font-medium text-gray-700">Payment History</label>
                      <div className="flex items-center space-x-2">
                        <button 
                          onClick={() => setSimulationParams({...simulationParams, paymentHistory: Math.max(0.5, simulationParams.paymentHistory - 0.1)})}
                          className="px-2 py-1 bg-red-100 text-red-600 rounded text-xs hover:bg-red-200"
                        >-10%</button>
                        <span className="font-bold text-lg min-w-[60px] text-center">{Math.round(simulationParams.paymentHistory * 100)}%</span>
                        <button 
                          onClick={() => setSimulationParams({...simulationParams, paymentHistory: Math.min(1.0, simulationParams.paymentHistory + 0.1)})}
                          className="px-2 py-1 bg-green-100 text-green-600 rounded text-xs hover:bg-green-200"
                        >+10%</button>
                      </div>
                    </div>
                    <input
                      type="range"
                      min="0.5"
                      max="1.0"
                      step="0.05"
                      value={simulationParams.paymentHistory}
                      onChange={(e) => setSimulationParams({...simulationParams, paymentHistory: parseFloat(e.target.value)})}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>50% (Poor)</span>
                      <span>80% (Good)</span>
                      <span>95% (Excellent)</span>
                      <span>100%</span>
                    </div>
                  </div>
                </div>
                
                {/* Quick Preset Scenarios */}
                <div className="bg-gray-50 rounded-lg p-4 mb-6">
                  <h4 className="font-semibold text-gray-900 mb-3">⚡ Quick Scenarios</h4>
                  <div className="grid grid-cols-3 gap-3">
                    <button
                      onClick={() => setSimulationParams({
                        creditScore: 750,
                        monthlyIncome: 100000,
                        monthlyEMI: 15000,
                        paymentHistory: 0.98
                      })}
                      className="p-3 bg-green-100 text-green-800 rounded-lg hover:bg-green-200 text-sm font-medium"
                    >
                      🌟 Ideal Profile
                    </button>
                    <button
                      onClick={() => setSimulationParams({
                        creditScore: 650,
                        monthlyIncome: 60000,
                        monthlyEMI: 20000,
                        paymentHistory: 0.85
                      })}
                      className="p-3 bg-yellow-100 text-yellow-800 rounded-lg hover:bg-yellow-200 text-sm font-medium"
                    >
                      ⚠️ Borderline Case
                    </button>
                    <button
                      onClick={() => setSimulationParams({
                        creditScore: 550,
                        monthlyIncome: 40000,
                        monthlyEMI: 25000,
                        paymentHistory: 0.70
                      })}
                      className="p-3 bg-red-100 text-red-800 rounded-lg hover:bg-red-200 text-sm font-medium"
                    >
                      🚨 High Risk
                    </button>
                  </div>
                </div>
                
                <button
                  onClick={handleSimulation}
                  disabled={isSimulating}
                  className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-4 rounded-lg hover:from-blue-600 hover:to-purple-700 disabled:opacity-50 font-semibold text-lg shadow-lg"
                >
                  {isSimulating ? '⏳ Running Advanced Simulation...' : '🚀 Run Advanced Simulation'}
                </button>
              </div>

              {/* Enhanced Simulation Results */}
              {simulationResults && (
                <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-6">
                  <h3 className="text-xl font-semibold text-purple-900 mb-6">📊 Detailed Simulation Results</h3>
                  
                  {/* Decision Summary */}
                  <div className="bg-white rounded-lg p-6 mb-6 shadow-lg">
                    <div className="grid grid-cols-5 gap-4 mb-6">
                      <div className="text-center">
                        <div className={`text-3xl font-bold mb-2 ${
                          simulationResults.recommendation === 'APPROVE' ? 'text-green-600' :
                          simulationResults.recommendation === 'CONDITIONAL APPROVE' ? 'text-yellow-600' :
                          'text-red-600'
                        }`}>{simulationResults.recommendation === 'APPROVE' ? '✅' : simulationResults.recommendation === 'CONDITIONAL APPROVE' ? '⚠️' : '❌'}</div>
                        <p className="text-sm text-gray-600">Decision</p>
                        <p className={`font-bold ${
                          simulationResults.recommendation === 'APPROVE' ? 'text-green-600' :
                          simulationResults.recommendation === 'CONDITIONAL APPROVE' ? 'text-yellow-600' :
                          'text-red-600'
                        }`}>{simulationResults.recommendation}</p>
                      </div>
                      <div className="text-center">
                        <div className="text-3xl font-bold mb-2 text-purple-600">{simulationResults.riskScore}</div>
                        <p className="text-sm text-gray-600">Risk Score</p>
                        <p className="font-bold text-purple-900">/100</p>
                      </div>
                      <div className="text-center">
                        <div className="text-3xl font-bold mb-2 text-blue-600">{Math.round((simulationParams.monthlyEMI / simulationParams.monthlyIncome) * 100)}%</div>
                        <p className="text-sm text-gray-600">DTI Ratio</p>
                        <p className={`font-bold ${
                          (simulationParams.monthlyEMI / simulationParams.monthlyIncome) <= 0.3 ? 'text-green-600' :
                          (simulationParams.monthlyEMI / simulationParams.monthlyIncome) <= 0.5 ? 'text-yellow-600' : 'text-red-600'
                        }`}>{(simulationParams.monthlyEMI / simulationParams.monthlyIncome) <= 0.3 ? 'Excellent' : (simulationParams.monthlyEMI / simulationParams.monthlyIncome) <= 0.5 ? 'Good' : 'High'}</p>
                      </div>
                      <div className="text-center">
                        <div className="text-3xl font-bold mb-2 text-green-600">{Math.round(simulationParams.paymentHistory * 100)}%</div>
                        <p className="text-sm text-gray-600">Payment History</p>
                        <p className={`font-bold ${
                          simulationParams.paymentHistory >= 0.95 ? 'text-green-600' :
                          simulationParams.paymentHistory >= 0.85 ? 'text-yellow-600' : 'text-red-600'
                        }`}>{simulationParams.paymentHistory >= 0.95 ? 'Excellent' : simulationParams.paymentHistory >= 0.85 ? 'Good' : 'Poor'}</p>
                      </div>
                      <div className="text-center">
                        <div className="text-3xl font-bold mb-2 text-indigo-600">{simulationParams.creditScore}</div>
                        <p className="text-sm text-gray-600">Credit Score</p>
                        <p className={`font-bold ${
                          simulationParams.creditScore >= 750 ? 'text-green-600' :
                          simulationParams.creditScore >= 650 ? 'text-yellow-600' : 'text-red-600'
                        }`}>{simulationParams.creditScore >= 750 ? 'Excellent' : simulationParams.creditScore >= 650 ? 'Good' : 'Poor'}</p>
                      </div>
                    </div>
                    
                    <div className="border-t pt-4">
                      <h4 className="font-semibold text-gray-900 mb-2">🧠 AI Analysis:</h4>
                      <p className="text-gray-700 leading-relaxed">
                        {simulationResults.reasoning?.[0] || 'Advanced scenario analysis completed with multi-factor risk assessment.'}
                      </p>
                    </div>
                  </div>
                  
                  {/* SHAP Feature Contributions */}
                  {simulationResults.shapExplanation && (
                    <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
                      <h4 className="font-semibold text-blue-900 mb-4">🧠 SHAP Feature Contributions</h4>
                      <div className="space-y-3">
                        <div className="text-center mb-4">
                          <p className="text-sm text-blue-700">Base Risk: {simulationResults.shapExplanation.baseValue} + Feature Contributions = Final Risk</p>
                        </div>
                        {simulationResults.shapExplanation.explanation.primaryFactors.map((factor, index) => (
                          <div key={index} className="flex items-center justify-between p-3 bg-white rounded-lg">
                            <div className="flex items-center space-x-3">
                              <div className={`w-3 h-3 rounded-full ${
                                factor.impact === 'POSITIVE' ? 'bg-green-500' : 'bg-red-500'
                              }`}></div>
                              <div>
                                <p className="font-medium text-gray-900">{factor.feature}</p>
                                <p className="text-sm text-gray-600">Value: {factor.value}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className={`font-bold ${
                                factor.impact === 'POSITIVE' ? 'text-green-600' : 'text-red-600'
                              }`}>
                                {factor.contribution > 0 ? '+' : ''}{factor.contribution.toFixed(1)} points
                              </p>
                              <p className="text-xs text-gray-500">{factor.impact === 'POSITIVE' ? 'Reduces Risk' : 'Increases Risk'}</p>
                            </div>
                          </div>
                        ))}
                        <div className="border-t pt-3 mt-4">
                          <p className="text-sm text-blue-800 font-medium">{simulationResults.shapExplanation.explanation.summary}</p>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* SHAP Counterfactuals */}
                  {simulationResults.shapCounterfactuals?.length > 0 && (
                    <div className="bg-purple-50 rounded-lg p-6 border border-purple-200">
                      <h4 className="font-semibold text-purple-900 mb-4">🔮 SHAP-Based What-If Scenarios</h4>
                      <div className="space-y-3">
                        {simulationResults.shapCounterfactuals.map((scenario, index) => (
                          <div key={index} className="bg-white rounded-lg p-4 border border-purple-100">
                            <div className="flex justify-between items-start mb-2">
                              <h5 className="font-medium text-purple-900">{scenario.name}</h5>
                              <span className={`px-2 py-1 rounded text-xs font-medium ${
                                scenario.impact > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                              }`}>
                                {scenario.impact > 0 ? '-' : '+'}{Math.abs(scenario.impact).toFixed(1)} risk points
                              </span>
                            </div>
                            <p className="text-sm text-purple-700 mb-2">{scenario.change}</p>
                            <div className="flex justify-between text-xs text-gray-600">
                              <span>Current Risk: {scenario.oldRisk.toFixed(1)}</span>
                              <span>New Risk: {scenario.newRisk.toFixed(1)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Improvement Suggestions */}
                  {simulationResults.recommendation !== 'APPROVE' && simulationResults.improvementTips?.length > 0 && (
                    <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
                      <h4 className="font-semibold text-yellow-900 mb-3">💡 Improvement Suggestions</h4>
                      <div className="space-y-2">
                        {simulationResults.improvementTips.map((tip, index) => (
                          <div key={index} className="flex items-start space-x-2">
                            <span className="text-yellow-600 mt-1">•</span>
                            <p className="text-yellow-800 text-sm">{tip}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Improvement Timeline Tab */}
          {activeTab === 'timeline' && (
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">📈 Personalized Improvement Plan</h3>
                
                {analysisResults?.improvementTips?.length > 0 ? (
                  <div className="space-y-4">
                    {analysisResults.improvementTips.map((tip, index) => (
                      <div key={index} className="bg-white rounded-lg p-4 border border-orange-200">
                        <div className="flex items-start space-x-3">
                          <div className="w-6 h-6 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                            <span className="text-orange-600 text-sm font-bold">{index + 1}</span>
                          </div>
                          <div>
                            <p className="text-gray-900 font-medium">{tip}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="text-6xl mb-4">🎉</div>
                    <h4 className="text-lg font-semibold text-gray-900 mb-2">Excellent Profile!</h4>
                    <p className="text-gray-600">Your financial profile is strong. Continue maintaining good payment discipline.</p>
                  </div>
                )}
              </div>

              {/* Timeline Visualization - Only show if improvements needed */}
              {analysisResults?.improvementTips?.length > 0 && (
                <div className="bg-gray-50 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">⏰ Expected Timeline</h3>
                  <div className="space-y-4">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-blue-600 font-bold">1M</span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">Month 1-2: Immediate Actions</p>
                        <p className="text-sm text-gray-600">Set up auto-payments, review credit report, reduce credit utilization</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                        <span className="text-yellow-600 font-bold">3M</span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">Month 3-6: Building Momentum</p>
                        <p className="text-sm text-gray-600">Consistent payments, debt reduction, credit score improvement</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                        <span className="text-green-600 font-bold">6M</span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">Month 6+: Reapplication Ready</p>
                        <p className="text-sm text-gray-600">Improved profile, better loan terms, higher approval chances</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExplainabilityPanel;