import React, { useState } from 'react';
import AWSNovaService from '../services/AWSNovaService';

const ExplainabilityPanel = ({ applicantData, analysisResults, isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState('factors');
  const [simulationResults, setSimulationResults] = useState(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationParams, setSimulationParams] = useState({
    creditScore: applicantData?.credit?.credit_score?.score || 520,
    monthlyIncome: applicantData?.income?.income_statement?.salary_slips?.monthly_income || 50000,
    monthlyEMI: (applicantData?.loan?.loan_repayment_history?.active_loans || []).reduce((sum, loan) => sum + (loan.emi_amount || 0), 0) || 15000
  });
  const novaService = new AWSNovaService();

  const handleSimulation = async () => {
    setIsSimulating(true);
    try {
      const modifiedData = JSON.parse(JSON.stringify(applicantData));
      modifiedData.credit.credit_score.score = simulationParams.creditScore;
      modifiedData.income.income_statement.salary_slips.monthly_income = simulationParams.monthlyIncome;
      
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
              <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">🎯 Interactive Scenario Simulator</h3>
                <p className="text-gray-600 mb-4">Adjust parameters to see how changes affect the loan decision</p>
                
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="bg-white rounded-lg p-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Credit Score</label>
                    <input
                      type="range"
                      min="300"
                      max="850"
                      value={simulationParams.creditScore}
                      onChange={(e) => setSimulationParams({...simulationParams, creditScore: parseInt(e.target.value)})}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>300</span>
                      <span className="font-bold">{simulationParams.creditScore}</span>
                      <span>850</span>
                    </div>
                  </div>
                  
                  <div className="bg-white rounded-lg p-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Monthly Income (₹)</label>
                    <input
                      type="range"
                      min="20000"
                      max="200000"
                      step="5000"
                      value={simulationParams.monthlyIncome}
                      onChange={(e) => setSimulationParams({...simulationParams, monthlyIncome: parseInt(e.target.value)})}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>20K</span>
                      <span className="font-bold">₹{(simulationParams.monthlyIncome/1000).toFixed(0)}K</span>
                      <span>200K</span>
                    </div>
                  </div>
                  
                  <div className="bg-white rounded-lg p-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Monthly EMI (₹)</label>
                    <input
                      type="range"
                      min="0"
                      max="50000"
                      step="1000"
                      value={simulationParams.monthlyEMI}
                      onChange={(e) => setSimulationParams({...simulationParams, monthlyEMI: parseInt(e.target.value)})}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>0</span>
                      <span className="font-bold">₹{(simulationParams.monthlyEMI/1000).toFixed(0)}K</span>
                      <span>50K</span>
                    </div>
                  </div>
                </div>
                
                <button
                  onClick={handleSimulation}
                  disabled={isSimulating}
                  className="w-full bg-blue-500 text-white py-3 rounded-lg hover:bg-blue-600 disabled:opacity-50 font-medium"
                >
                  {isSimulating ? '⏳ Simulating...' : '🔄 Run Simulation'}
                </button>
              </div>

              {/* Simulation Results */}
              {simulationResults && (
                <div className="bg-purple-50 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-purple-900 mb-4">📊 Simulation Results</h3>
                  <div className="bg-white rounded-lg p-4">
                    <div className="grid grid-cols-3 gap-4 mb-4">
                      <div className="text-center">
                        <p className="text-sm text-gray-600">Decision</p>
                        <p className={`text-lg font-bold ${
                          simulationResults.recommendation === 'APPROVE' ? 'text-green-600' :
                          simulationResults.recommendation === 'CONDITIONAL APPROVE' ? 'text-yellow-600' :
                          'text-red-600'
                        }`}>{simulationResults.recommendation}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-gray-600">Risk Score</p>
                        <p className="text-lg font-bold text-purple-900">{simulationResults.riskScore}/100</p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-gray-600">DTI Ratio</p>
                        <p className="text-lg font-bold text-blue-900">{Math.round((simulationParams.monthlyEMI / simulationParams.monthlyIncome) * 100)}%</p>
                      </div>
                    </div>
                    <div className="border-t pt-3">
                      <p className="text-sm text-gray-700">
                        <strong>Analysis:</strong> {simulationResults.reasoning?.[0] || 'Scenario analysis completed'}
                      </p>
                    </div>
                  </div>
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