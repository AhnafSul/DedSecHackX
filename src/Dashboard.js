import React from 'react';
import ChatBot from './components/ChatBot';
import ExplainabilityPanel from './components/ExplainabilityPanel';
import RegulatoryReport from './components/RegulatoryReport';

const Dashboard = ({ applicantData, analysisResults, onBack }) => {
  const [showIncomeModal, setShowIncomeModal] = React.useState(false);
  const [showDTIModal, setShowDTIModal] = React.useState(false);
  const [showChatBot, setShowChatBot] = React.useState(false);
  const [showExplainabilityPanel, setShowExplainabilityPanel] = React.useState(false);
  const [showRegulatoryReport, setShowRegulatoryReport] = React.useState(false);
  const [showExpenseModal, setShowExpenseModal] = React.useState(false);
  const [showCreditModal, setShowCreditModal] = React.useState(false);
  const [showRiskModal, setShowRiskModal] = React.useState(false);
  const [loanAmount, setLoanAmount] = React.useState(500000);
  const [rejectionAdvice, setRejectionAdvice] = React.useState('Getting personalized advice...');
  // Extract real data from JSON files
  const extractedData = {
    personalInfo: {
      name: applicantData?.credit?.personal_info?.name || 'N/A',
      age: applicantData?.credit?.personal_info?.dob ? 
        new Date().getFullYear() - new Date(applicantData.credit.personal_info.dob).getFullYear() : 'N/A',
      pan: applicantData?.credit?.personal_info?.pan || 'N/A',
      employment: applicantData?.income?.income_statement?.salary_slips?.current_designation || 'N/A'
    },
    financialMetrics: {
      creditScore: applicantData?.credit?.credit_score?.score || 0,
      creditRating: applicantData?.credit?.credit_score?.rating || 'N/A',
      monthlyIncome: applicantData?.income?.income_statement?.salary_slips?.monthly_income || 0,
      netIncome: applicantData?.income?.income_statement?.salary_slips?.net_income || 0,
      totalEMI: applicantData?.loan?.loan_repayment_history?.active_loans?.reduce((sum, loan) => sum + (loan.emi_amount || 0), 0) || 0,
      dtiRatio: 0,
      paymentHistory: applicantData?.credit?.payment_history?.on_time_payment_ratio || 0,
      missedPayments: applicantData?.credit?.payment_history?.missed_payments || 0,
      creditUtilization: (() => {
        const cards = applicantData?.credit?.credit_cards || [];
        if (cards.length === 0) return 0;
        // Calculate weighted average utilization
        const totalUsed = cards.reduce((sum, card) => sum + ((card.limit || 0) * (card.utilization_ratio || 0)), 0);
        const totalLimit = cards.reduce((sum, card) => sum + (card.limit || 0), 0);
        const utilization = totalLimit > 0 ? totalUsed / totalLimit : 0;
        console.log(`Credit Utilization Debug - Cards: ${cards.length}, Total Used: ${totalUsed}, Total Limit: ${totalLimit}, Utilization: ${utilization}`);
        return utilization;
      })(),
      totalAssets: (() => {
        const investments = applicantData?.income?.income_statement?.investment_portfolio;
        let total = 0;
        if (investments?.mutual_funds) total += investments.mutual_funds.reduce((sum, fund) => sum + (fund.current_value || 0), 0);
        if (investments?.fixed_deposits) total += investments.fixed_deposits.reduce((sum, fd) => sum + (fd.amount || 0), 0);
        if (investments?.stocks) total += investments.stocks.reduce((sum, stock) => sum + ((stock.quantity || 0) * (stock.current_price || 0)), 0);
        return total;
      })(),
      rentalIncome: applicantData?.income?.income_statement?.investment_portfolio?.real_estate_income?.monthly_rent || 0,
      employmentType: applicantData?.income?.income_statement?.salary_slips?.employment_type || 'N/A',
      employer: applicantData?.income?.income_statement?.salary_slips?.employer || 'N/A',
      itrFiled: applicantData?.income?.income_statement?.tax_returns?.itr_filed || false,
      creditInquiries: applicantData?.credit?.credit_inquiries?.length || 0,
      activeLoansCount: applicantData?.loan?.loan_repayment_history?.active_loans?.length || 0,
      creditCardsCount: applicantData?.credit?.credit_cards?.length || 0
    },
    aiDecision: analysisResults || {
      recommendation: 'ANALYZING',
      riskScore: 0,
      reasoning: ['Analysis in progress...'],
      keyFactors: {}
    }
  };
  
  // Calculate DTI ratio
  if (extractedData.financialMetrics.monthlyIncome > 0 && extractedData.financialMetrics.totalEMI > 0) {
    extractedData.financialMetrics.dtiRatio = Math.round(
      (extractedData.financialMetrics.totalEMI / extractedData.financialMetrics.monthlyIncome) * 100
    );
  } else {
    extractedData.financialMetrics.dtiRatio = 0;
  }
  // Generate risk factors from real data
  const riskFactors = [
    { 
      factor: 'Credit Score', 
      score: Math.min(100, Math.round(extractedData.financialMetrics.creditScore / 8.5)), 
      status: extractedData.financialMetrics.creditScore >= 750 ? 'excellent' : 
              extractedData.financialMetrics.creditScore >= 650 ? 'good' : 
              extractedData.financialMetrics.creditScore >= 550 ? 'warning' : 'poor'
    },
    { 
      factor: 'DTI Ratio', 
      score: Math.max(0, 100 - extractedData.financialMetrics.dtiRatio), 
      status: extractedData.financialMetrics.dtiRatio <= 30 ? 'excellent' : 
              extractedData.financialMetrics.dtiRatio <= 40 ? 'good' : 
              extractedData.financialMetrics.dtiRatio <= 50 ? 'warning' : 'poor'
    },
    { 
      factor: 'Payment History', 
      score: Math.round(extractedData.financialMetrics.paymentHistory * 100), 
      status: extractedData.financialMetrics.paymentHistory >= 0.95 ? 'excellent' : 
              extractedData.financialMetrics.paymentHistory >= 0.85 ? 'good' : 
              extractedData.financialMetrics.paymentHistory >= 0.75 ? 'warning' : 'poor'
    },
    { 
      factor: 'Credit Utilization', 
      score: Math.max(0, Math.round(100 - (extractedData.financialMetrics.creditUtilization * 100))), 
      status: extractedData.financialMetrics.creditUtilization <= 0.3 ? 'excellent' : 
              extractedData.financialMetrics.creditUtilization <= 0.5 ? 'good' : 
              extractedData.financialMetrics.creditUtilization <= 0.7 ? 'warning' : 'poor'
    },
    { 
      factor: 'Employment Stability', 
      score: applicantData?.income?.income_statement?.salary_slips?.employment_type === 'Permanent' ? 90 : 
             applicantData?.income?.income_statement?.salary_slips?.employment_type === 'Contract' ? 60 : 70, 
      status: applicantData?.income?.income_statement?.salary_slips?.employment_type === 'Permanent' ? 'good' : 'warning'
    }
  ];

  const getStatusColor = (status) => {
    switch (status) {
      case 'excellent': return 'text-green-500 bg-green-100';
      case 'good': return 'text-blue-500 bg-blue-100';
      case 'warning': return 'text-yellow-500 bg-yellow-100';
      case 'poor': return 'text-red-500 bg-red-100';
      default: return 'text-gray-500 bg-gray-100';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'excellent': return '✅';
      case 'good': return '📈';
      case 'warning': return '⚠️';
      case 'poor': return '📉';
      default: return '⚠️';
    }
  };

  // Get AI advice for rejected applicants
  React.useEffect(() => {
    const decision = extractedData.aiDecision.recommendation;
    const creditScore = extractedData.financialMetrics.creditScore;
    const currentDTI = extractedData.financialMetrics.dtiRatio;
    
    if (decision === 'REJECT' || creditScore < 600 || currentDTI > 60) {
      const getAIRejectionAdvice = async () => {
        try {
          const prompt = `As a financial advisor, give personalized advice to ${extractedData.personalInfo.name} whose loan was rejected:

PROFILE:
• Credit Score: ${creditScore}
• Payment History: ${Math.round(extractedData.financialMetrics.paymentHistory * 100)}% on-time
• DTI Ratio: ${currentDTI}%
• Employment: ${extractedData.personalInfo.employment}
• Monthly Income: ₹${extractedData.financialMetrics.monthlyIncome?.toLocaleString()}

Provide specific, actionable advice in 2-3 sentences on how to improve their profile for future loan approval. Be encouraging but realistic.`;

          const response = await fetch('https://bedrock-runtime.us-east-1.amazonaws.com/model/amazon.nova-pro-v1:0/invoke', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${process.env.REACT_APP_AWS_NOVA_KEY}`
            },
            body: JSON.stringify({
              messages: [{ role: 'user', content: [{ text: prompt }] }],
              inferenceConfig: { maxTokens: 200, temperature: 0.3 }
            })
          });

          if (response.ok) {
            const result = await response.json();
            const aiAdvice = result.output?.message?.content?.[0]?.text || 'Focus on improving your credit score and payment history before reapplying.';
            setRejectionAdvice(aiAdvice.trim());
          }
        } catch (error) {
          setRejectionAdvice(`With a ${creditScore} credit score and ${Math.round(extractedData.financialMetrics.paymentHistory * 100)}% payment history, focus on timely payments for 6 months before reapplying.`);
        }
      };
      
      getAIRejectionAdvice();
    }
  }, [extractedData.aiDecision.recommendation]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 p-6 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-400/20 to-purple-400/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-green-400/20 to-blue-400/20 rounded-full blur-3xl animate-pulse" style={{animationDelay: '2s'}}></div>
      </div>
      
      <div className="max-w-7xl mx-auto space-y-6 relative z-10">
        
        {/* Header */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-gray-100 transform hover:scale-[1.02] transition-all duration-300 hover:shadow-2xl">
          {/* Back Navigation */}
          <div className="flex items-center mb-4">
            <button
              onClick={onBack}
              className="flex items-center space-x-2 text-gray-500 hover:text-gray-700 transition-colors duration-200 group"
            >
              <span className="text-lg group-hover:transform group-hover:-translate-x-1 transition-transform duration-200">←</span>
              <span className="text-sm font-medium">Back to Applications</span>
            </button>
          </div>
          
          {/* Main Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Loan Decision Analysis</h1>
              <p className="text-gray-600 mt-1">XAI-powered intelligent lending assessment</p>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setShowRegulatoryReport(true)}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-2"
              >
                <span>📋</span>
                <span>Compliance Report</span>
              </button>
              <div className="text-right">
                <p className="text-sm text-gray-500">Application ID</p>
                <p className="font-semibold text-gray-900">#LN-2025-{applicantData?.credit?.personal_info?.name?.replace(/\s+/g, '').slice(0,3).toUpperCase() || '001'}</p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                <span className="text-white text-xl">👤</span>
              </div>
            </div>
          </div>
        </div>

        {/* Applicant Info */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-gray-100 transform hover:scale-[1.01] transition-all duration-300">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Applicant Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="flex items-center space-x-3">
              <span className="text-xl">👤</span>
              <div>
                <p className="text-sm text-gray-500">Name</p>
                <p className="font-semibold">{applicantData?.credit?.personal_info?.name || 'N/A'}</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <span className="text-xl">📅</span>
              <div>
                <p className="text-sm text-gray-500">Age</p>
                <p className="font-semibold">{applicantData?.credit?.personal_info?.dob ? new Date().getFullYear() - new Date(applicantData.credit.personal_info.dob).getFullYear() : 'N/A'} years</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <span className="text-xl">📍</span>
              <div>
                <p className="text-sm text-gray-500">PAN</p>
                <p className="font-semibold">{applicantData?.credit?.personal_info?.pan || 'N/A'}</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <span className="text-xl">💼</span>
              <div>
                <p className="text-sm text-gray-500">Employment</p>
                <p className="font-semibold">{applicantData?.income?.income_statement?.salary_slips?.current_designation || 'N/A'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-gray-100 cursor-pointer group hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 hover:bg-gradient-to-br hover:from-blue-50 hover:to-purple-50" onClick={() => setShowCreditModal(true)}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1 group-hover:text-blue-600 transition-colors">Credit Score</p>
                <p className="text-2xl font-bold text-gray-900 group-hover:text-blue-700 transition-colors">{extractedData.financialMetrics.creditScore}</p>
                <p className="text-sm mt-1 text-blue-600 animate-bounce">+15</p>
              </div>
              <div className="p-3 rounded-full bg-blue-100 group-hover:bg-blue-200 group-hover:scale-110 transition-all duration-300">
                <span className="text-2xl group-hover:animate-pulse">📈</span>
              </div>
            </div>
            <div className="mt-2 text-xs text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300">🔍 Click for breakdown</div>
          </div>
          
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-gray-100 group hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 hover:bg-gradient-to-br hover:from-green-50 hover:to-blue-50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1 group-hover:text-green-600 transition-colors">Monthly Income</p>
                <p className="text-2xl font-bold text-gray-900 group-hover:text-green-700 transition-colors">₹{(extractedData.financialMetrics.monthlyIncome / 1000).toFixed(0)}K</p>
                <p className="text-sm mt-1 text-green-600 animate-pulse">+5%</p>
              </div>
              <div className="p-3 rounded-full bg-green-100 group-hover:bg-green-200 group-hover:scale-110 group-hover:rotate-12 transition-all duration-300">
                <span className="text-2xl">💰</span>
              </div>
            </div>
          </div>
          
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-gray-100 cursor-pointer group hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 hover:bg-gradient-to-br hover:from-yellow-50 hover:to-orange-50" onClick={() => setShowDTIModal(true)}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1 group-hover:text-yellow-600 transition-colors">DTI Ratio</p>
                <p className="text-2xl font-bold text-gray-900 group-hover:text-yellow-700 transition-colors">{extractedData.financialMetrics.dtiRatio}%</p>
                <p className="text-sm mt-1 text-yellow-600">{extractedData.financialMetrics.dtiRatio > 50 ? 'High' : extractedData.financialMetrics.dtiRatio > 30 ? 'Moderate' : 'Low'}</p>
              </div>
              <div className="p-3 rounded-full bg-yellow-100 group-hover:bg-yellow-200 group-hover:scale-110 group-hover:animate-bounce transition-all duration-300">
                <span className="text-2xl">⚠️</span>
              </div>
            </div>
            <div className="mt-2 text-xs text-yellow-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300">🔍 Click for details</div>
          </div>
          
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-gray-100 cursor-pointer group hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 hover:bg-gradient-to-br hover:from-green-50 hover:to-teal-50" onClick={() => setShowExpenseModal(true)}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1 group-hover:text-green-600 transition-colors">Expense Analysis</p>
                <p className="text-2xl font-bold text-gray-900 group-hover:text-green-700 transition-colors">₹{Math.round((extractedData.financialMetrics.monthlyIncome - extractedData.financialMetrics.totalEMI) * 0.7 / 1000)}K</p>
                <p className="text-sm mt-1 text-green-600">Monthly Expenses</p>
              </div>
              <div className="p-3 rounded-full bg-green-100 group-hover:bg-green-200 group-hover:scale-110 group-hover:-rotate-12 transition-all duration-300">
                <span className="text-2xl">💰</span>
              </div>
            </div>
            <div className="mt-2 text-xs text-green-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300">🔍 Click for details</div>
          </div>
          
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-gray-100 cursor-pointer group hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 hover:bg-gradient-to-br hover:from-purple-50 hover:to-pink-50" onClick={() => setShowRiskModal(true)}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1 group-hover:text-purple-600 transition-colors">Risk Score</p>
                <p className="text-2xl font-bold text-gray-900 group-hover:text-purple-700 transition-colors">{Math.round(extractedData.aiDecision.riskScore || 0)}/100</p>
                <p className="text-sm mt-1 text-purple-600 animate-pulse">{extractedData.aiDecision.recommendation}</p>
              </div>
              <div className="p-3 rounded-full bg-purple-100 group-hover:bg-purple-200 group-hover:scale-110 group-hover:animate-spin transition-all duration-300">
                <span className="text-2xl">📊</span>
              </div>
            </div>
            <div className="mt-2 text-xs text-purple-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300">🔍 Click for breakdown</div>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-gray-100 hover:shadow-2xl hover:scale-[1.02] transition-all duration-300">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Credit Score Trend</h3>
            <div className="h-64 p-4 relative">
              {(() => {
                const currentScore = extractedData.financialMetrics.creditScore;
                const trendData = [
                  { month: 'Jan', score: Math.max(300, currentScore - 35) },
                  { month: 'Feb', score: Math.max(300, currentScore - 25) },
                  { month: 'Mar', score: Math.max(300, currentScore - 15) },
                  { month: 'Apr', score: Math.max(300, currentScore - 8) },
                  { month: 'May', score: Math.max(300, currentScore - 3) },
                  { month: 'Jun', score: currentScore }
                ];
                
                return (
                  <>
                    <svg className="w-full h-full" viewBox="0 0 300 200">
                      <path
                        d={trendData.map((point, index) => {
                          const x = 20 + (index * 52);
                          const y = 180 - ((point.score - 300) / 550) * 160;
                          return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
                        }).join(' ')}
                        stroke="#3b82f6"
                        strokeWidth="2"
                        fill="none"
                      />
                      
                      {trendData.map((point, index) => {
                        const x = 20 + (index * 52);
                        const y = 180 - ((point.score - 300) / 550) * 160;
                        return (
                          <g key={index}>
                            <circle cx={x} cy={y} r="3" fill="#3b82f6" />
                            <text x={x} y={y - 8} textAnchor="middle" className="text-xs fill-gray-700">
                              {point.score}
                            </text>
                            <text x={x} y={195} textAnchor="middle" className="text-xs fill-gray-500">
                              {point.month}
                            </text>
                          </g>
                        );
                      })}
                    </svg>
                    
                    <div className="absolute top-2 right-2 bg-blue-100 px-3 py-1 rounded-full">
                      <span className="text-sm font-semibold text-blue-800">Current: {currentScore}</span>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-gray-100 cursor-pointer hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 group" onClick={() => setShowIncomeModal(true)}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-700 transition-colors">Income Breakdown</h3>
              <span className="text-sm text-blue-600 hover:text-blue-800 group-hover:animate-bounce">🔍 Click to expand</span>
            </div>
            <div className="h-64 flex items-center justify-center">
              <div className="w-48 h-48 relative">
                {(() => {
                  const salary = extractedData.financialMetrics.monthlyIncome;
                  const rental = applicantData?.income?.income_statement?.investment_portfolio?.real_estate_income?.monthly_rent || 0;
                  const other = Math.max(0, extractedData.financialMetrics.netIncome - salary);
                  const total = salary + rental + other;
                  
                  if (total === 0) return <div className="text-gray-500">No income data</div>;
                  
                  const salaryPercent = (salary / total) * 100;
                  const rentalPercent = (rental / total) * 100;
                  const otherPercent = (other / total) * 100;
                  
                  return (
                    <>
                      <div className="w-full h-full rounded-full relative overflow-hidden">
                        <div 
                          className="absolute inset-0 bg-blue-500"
                          style={{ 
                            background: `conic-gradient(
                              #3b82f6 0% ${salaryPercent}%,
                              #10b981 ${salaryPercent}% ${salaryPercent + rentalPercent}%,
                              #f59e0b ${salaryPercent + rentalPercent}% 100%
                            )` 
                          }}
                        />
                        <div className="absolute inset-4 bg-white rounded-full flex items-center justify-center">
                          <div className="text-center">
                            <div className="text-lg font-bold text-gray-900">₹{(total/1000).toFixed(0)}K</div>
                            <div className="text-xs text-gray-500">Total</div>
                          </div>
                        </div>
                      </div>
                      <div className="absolute -bottom-8 left-0 right-0 space-y-1">
                        <div className="flex items-center justify-center space-x-4 text-xs">
                          <div className="flex items-center space-x-1">
                            <div className="w-3 h-3 bg-blue-500 rounded"></div>
                            <span>Salary {salaryPercent.toFixed(0)}%</span>
                          </div>
                          {rental > 0 && (
                            <div className="flex items-center space-x-1">
                              <div className="w-3 h-3 bg-green-500 rounded"></div>
                              <span>Rental {rentalPercent.toFixed(0)}%</span>
                            </div>
                          )}
                          {other > 0 && (
                            <div className="flex items-center space-x-1">
                              <div className="w-3 h-3 bg-yellow-500 rounded"></div>
                              <span>Other {otherPercent.toFixed(0)}%</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>

        {/* Risk Assessment */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-gray-100 hover:shadow-2xl hover:scale-[1.01] transition-all duration-300">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Risk Factor Analysis</h3>
          <div className="space-y-4">
            {riskFactors.map((factor, index) => (
              <div key={factor.factor} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-lg ${getStatusColor(factor.status)}`}>
                    <span>{getStatusIcon(factor.status)}</span>
                  </div>
                  <span className="font-medium text-gray-900">{factor.factor}</span>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="w-32 bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        factor.status === 'excellent' ? 'bg-green-500' :
                        factor.status === 'good' ? 'bg-blue-500' :
                        factor.status === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${factor.score}%` }}
                    />
                  </div>
                  <span className="font-semibold text-gray-900 w-12 text-right">{factor.score}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Loan Amount Analyzer */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-gray-100 hover:shadow-2xl hover:scale-[1.01] transition-all duration-300">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">💰 Loan Amount Analyzer</h3>
          {(() => {
            const maxLoan = extractedData.financialMetrics.monthlyIncome * 10;
            const newEMI = loanAmount / 60; // 5 year loan
            const newDTI = Math.round(((extractedData.financialMetrics.totalEMI + newEMI) / extractedData.financialMetrics.monthlyIncome) * 100);
            
            const getEligibility = () => {
              if (newDTI > 60) return { status: 'rejected', color: 'red', message: 'DTI too high - loan rejected' };
              if (newDTI > 50) return { status: 'risky', color: 'orange', message: 'High risk - requires guarantor' };
              if (newDTI > 40) return { status: 'conditional', color: 'yellow', message: 'Conditional approval' };
              return { status: 'approved', color: 'green', message: 'Pre-approved' };
            };
            
            const eligibility = getEligibility();
            
            return (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-blue-50 p-4 rounded-xl">
                    <p className="text-sm text-blue-700">Requested Amount</p>
                    <p className="text-2xl font-bold text-blue-900">₹{loanAmount.toLocaleString()}</p>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-xl">
                    <p className="text-sm text-purple-700">Monthly EMI</p>
                    <p className="text-2xl font-bold text-purple-900">₹{Math.round(newEMI).toLocaleString()}</p>
                  </div>
                  <div className={`bg-${eligibility.color}-50 p-4 rounded-xl`}>
                    <p className={`text-sm text-${eligibility.color}-700`}>New DTI Ratio</p>
                    <p className={`text-2xl font-bold text-${eligibility.color}-900`}>{newDTI}%</p>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>₹50,000</span>
                    <span>₹{maxLoan.toLocaleString()}</span>
                  </div>
                  <input
                    type="range"
                    min="50000"
                    max={maxLoan}
                    step="25000"
                    value={loanAmount}
                    onChange={(e) => setLoanAmount(parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                  />
                </div>
                
                <div className={`p-4 rounded-xl bg-${eligibility.color}-50 border border-${eligibility.color}-200`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className={`font-semibold text-${eligibility.color}-900`}>Eligibility Status</h4>
                      <p className={`text-sm text-${eligibility.color}-700`}>{eligibility.message}</p>
                    </div>
                    <div className={`text-2xl`}>
                      {eligibility.status === 'approved' ? '✅' : 
                       eligibility.status === 'conditional' ? '⚠️' : 
                       eligibility.status === 'risky' ? '🔍' : '❌'}
                    </div>
                  </div>
                  
                  {eligibility.status === 'conditional' && (
                    <div className="mt-3 text-sm text-yellow-800">
                      <p>• Interest rate: 12-14% per annum</p>
                      <p>• Maintain current payment discipline</p>
                      <p>• Income verification required</p>
                    </div>
                  )}
                  
                  {eligibility.status === 'risky' && (
                    <div className="mt-3 text-sm text-orange-800">
                      <p>• Guarantor required</p>
                      <p>• Higher interest rate: 15-18%</p>
                      <p>• Additional documentation needed</p>
                    </div>
                  )}
                  
                  {eligibility.status === 'approved' && (
                    <div className="mt-3 text-sm text-green-800">
                      <p>• Competitive interest rate: 10-12%</p>
                      <p>• Fast processing</p>
                      <p>• Minimal documentation</p>
                    </div>
                  )}
                </div>
                
                {/* AI Recommendations */}
                <div className="bg-gradient-to-r from-purple-50 to-blue-50 p-4 rounded-xl border border-purple-200">
                  <div className="flex items-center mb-3">
                    <span className="text-xl mr-2">🤖</span>
                    <h4 className="font-semibold text-purple-900">AI Recommendations</h4>
                  </div>
                  {(() => {
                    const getAIAdvice = () => {
                      const creditScore = extractedData.financialMetrics.creditScore;
                      const currentDTI = extractedData.financialMetrics.dtiRatio;
                      const paymentHistory = extractedData.financialMetrics.paymentHistory;
                      const decision = extractedData.aiDecision.recommendation;
                      
                      // Handle rejected applications with AI advice
                      if (decision === 'REJECT' || creditScore < 600 || currentDTI > 60) {
                        return {
                          recommendation: "Personalized Improvement Plan",
                          advice: rejectionAdvice,
                          suggestedAmount: null,
                          isRejected: true
                        };
                      }
                      
                      if (loanAmount <= extractedData.financialMetrics.monthlyIncome * 6) {
                        return {
                          recommendation: `Optimal loan amount for ${extractedData.personalInfo.name}`,
                          advice: `Based on your ${creditScore} credit score and ${Math.round(paymentHistory * 100)}% payment history, this amount keeps you in a safe financial zone. Consider this for better approval odds.`,
                          suggestedAmount: Math.round(extractedData.financialMetrics.monthlyIncome * 6)
                        };
                      } else if (loanAmount > extractedData.financialMetrics.monthlyIncome * 8) {
                        return {
                          recommendation: "Consider a lower amount",
                          advice: `Your current DTI of ${currentDTI}% plus this loan would strain your finances. I'd suggest ₹${Math.round(extractedData.financialMetrics.monthlyIncome * 7).toLocaleString()} for better financial health.`,
                          suggestedAmount: Math.round(extractedData.financialMetrics.monthlyIncome * 7)
                        };
                      } else {
                        return {
                          recommendation: "Reasonable choice",
                          advice: `This amount works with your income profile. With your ${extractedData.personalInfo.employment} job and steady payments, you should qualify. Consider prepayment options to save on interest.`,
                          suggestedAmount: loanAmount
                        };
                      }
                    };
                    
                    const aiAdvice = getAIAdvice();
                    
                    return (
                      <div className="space-y-2">
                        <p className="font-medium text-purple-900">{aiAdvice.recommendation}</p>
                        <p className="text-sm text-purple-700">{aiAdvice.advice}</p>
                        {aiAdvice.isRejected ? (
                          <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                            💡 Tip: Focus on timely payments and reducing existing debt before reapplying
                          </div>
                        ) : (
                          aiAdvice.suggestedAmount !== loanAmount && (
                            <button
                              onClick={() => setLoanAmount(aiAdvice.suggestedAmount)}
                              className="mt-2 px-3 py-1 bg-purple-600 text-white text-xs rounded-full hover:bg-purple-700 transition-colors"
                            >
                              Try ₹{aiAdvice.suggestedAmount.toLocaleString()}
                            </button>
                          )
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>
            );
          })()}
        </div>

        {/* Decision Summary */}
        <div className="bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-2xl shadow-xl p-6 text-white hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 animate-gradient-x">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-semibold mb-2">Loan Decision Recommendation</h3>
              <p className="text-blue-100">Based on comprehensive XAI analysis</p>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold mb-1">{extractedData.aiDecision.recommendation || 'ANALYZING'}</div>
              <button
                onClick={() => setShowExplainabilityPanel(true)}
                className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors backdrop-blur-sm"
              >
                🔍 View Detailed Explanation
              </button>
            </div>
          </div>
        </div>
        
        {/* AI Chat Button */}
        <div className="fixed bottom-4 right-4 z-40">
          <button
            onClick={() => setShowChatBot(true)}
            className="bg-gradient-to-r from-purple-500 to-blue-600 text-white p-4 rounded-full shadow-2xl hover:shadow-3xl transform hover:scale-110 hover:rotate-12 transition-all duration-300 flex items-center space-x-2 animate-pulse hover:animate-none group"
          >
            <span className="text-2xl group-hover:animate-bounce">🤖</span>
            <span className="font-semibold hidden sm:block">Ask AI</span>
          </button>
        </div>

      </div>
      
      {/* Income Detail Modal */}
      {showIncomeModal && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowIncomeModal(false)}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Detailed Income Analysis</h2>
                <button 
                  onClick={() => setShowIncomeModal(false)}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ×
                </button>
              </div>
              
              {(() => {
                const incomeData = applicantData?.income?.income_statement;
                const salary = incomeData?.salary_slips?.monthly_income || 0;
                const netSalary = incomeData?.salary_slips?.net_income || 0;
                const rental = incomeData?.investment_portfolio?.real_estate_income?.monthly_rent || 0;
                const deductions = incomeData?.salary_slips?.deductions || {};
                const investments = incomeData?.investment_portfolio || {};
                
                return (
                  <div className="space-y-6">
                    {/* Primary Income */}
                    <div className="bg-blue-50 rounded-xl p-4">
                      <h3 className="text-lg font-semibold text-blue-900 mb-3 flex items-center">
                        💼 Primary Employment Income
                      </h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-blue-700">Gross Monthly Salary</p>
                          <p className="text-xl font-bold text-blue-900">₹{salary.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-sm text-blue-700">Net Monthly Salary</p>
                          <p className="text-xl font-bold text-blue-900">₹{netSalary.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-sm text-blue-700">Employer</p>
                          <p className="font-semibold text-blue-900">{incomeData?.salary_slips?.employer || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-sm text-blue-700">Employment Type</p>
                          <p className="font-semibold text-blue-900">{incomeData?.salary_slips?.employment_type || 'N/A'}</p>
                        </div>
                      </div>
                    </div>
                    
                    {/* Deductions */}
                    <div className="bg-red-50 rounded-xl p-4">
                      <h3 className="text-lg font-semibold text-red-900 mb-3 flex items-center">
                        📉 Monthly Deductions
                      </h3>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <p className="text-sm text-red-700">PF Contribution</p>
                          <p className="text-lg font-bold text-red-900">₹{(deductions.pf || 0).toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-sm text-red-700">Tax Deduction</p>
                          <p className="text-lg font-bold text-red-900">₹{(deductions.tax || 0).toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-sm text-red-700">Other Deductions</p>
                          <p className="text-lg font-bold text-red-900">₹{(deductions.other || 0).toLocaleString()}</p>
                        </div>
                      </div>
                    </div>
                    
                    {/* Additional Income */}
                    {rental > 0 && (
                      <div className="bg-green-50 rounded-xl p-4">
                        <h3 className="text-lg font-semibold text-green-900 mb-3 flex items-center">
                          🏠 Rental Income
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm text-green-700">Monthly Rental</p>
                            <p className="text-xl font-bold text-green-900">₹{rental.toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-sm text-green-700">Property Location</p>
                            <p className="font-semibold text-green-900">{incomeData?.investment_portfolio?.real_estate_income?.property_location || 'N/A'}</p>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* Investment Portfolio */}
                    <div className="bg-purple-50 rounded-xl p-4">
                      <h3 className="text-lg font-semibold text-purple-900 mb-3 flex items-center">
                        📈 Investment Portfolio
                      </h3>
                      <div className="space-y-3">
                        {investments.mutual_funds?.length > 0 && (
                          <div>
                            <p className="text-sm text-purple-700 font-medium">Mutual Funds</p>
                            {investments.mutual_funds.map((fund, index) => (
                              <div key={index} className="flex justify-between items-center bg-white p-2 rounded mt-1">
                                <span className="text-sm">{fund.fund_name}</span>
                                <span className="font-semibold">₹{fund.current_value?.toLocaleString()}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        
                        {investments.fixed_deposits?.length > 0 && (
                          <div>
                            <p className="text-sm text-purple-700 font-medium">Fixed Deposits</p>
                            {investments.fixed_deposits.map((fd, index) => (
                              <div key={index} className="flex justify-between items-center bg-white p-2 rounded mt-1">
                                <span className="text-sm">{fd.bank}</span>
                                <span className="font-semibold">₹{fd.amount?.toLocaleString()}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        
                        {investments.stocks?.length > 0 && (
                          <div>
                            <p className="text-sm text-purple-700 font-medium">Stocks</p>
                            {investments.stocks.map((stock, index) => (
                              <div key={index} className="flex justify-between items-center bg-white p-2 rounded mt-1">
                                <span className="text-sm">{stock.company}</span>
                                <span className="font-semibold">{stock.quantity} @ ₹{stock.current_price}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Tax Information */}
                    <div className="bg-yellow-50 rounded-xl p-4">
                      <h3 className="text-lg font-semibold text-yellow-900 mb-3 flex items-center">
                        📄 Tax Compliance
                      </h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-yellow-700">ITR Filed</p>
                          <p className="font-semibold text-yellow-900">{incomeData?.tax_returns?.itr_filed ? '✅ Yes' : '❌ No'}</p>
                        </div>
                        <div>
                          <p className="text-sm text-yellow-700">Annual Taxable Income</p>
                          <p className="font-semibold text-yellow-900">₹{(incomeData?.tax_returns?.total_taxable_income || 0).toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-sm text-yellow-700">Tax Paid</p>
                          <p className="font-semibold text-yellow-900">₹{(incomeData?.tax_returns?.tax_paid || 0).toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-sm text-yellow-700">80C Deductions</p>
                          <p className="font-semibold text-yellow-900">₹{(incomeData?.tax_returns?.section_80c_deductions?.total_claimed || 0).toLocaleString()}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}
      
      {/* DTI Detail Modal */}
      {showDTIModal && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowDTIModal(false)}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Debt-to-Income Analysis</h2>
                <button 
                  onClick={() => setShowDTIModal(false)}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ×
                </button>
              </div>
              
              {(() => {
                const monthlyIncome = extractedData.financialMetrics.monthlyIncome;
                const totalEMI = extractedData.financialMetrics.totalEMI;
                const dtiRatio = extractedData.financialMetrics.dtiRatio;
                const activeLoans = applicantData?.loan?.loan_repayment_history?.active_loans || [];
                const disposableIncome = monthlyIncome - totalEMI;
                
                // Debug comprehensive data availability
                console.log(`Data Check - Income: ₹${monthlyIncome}, EMI: ₹${totalEMI}, DTI: ${dtiRatio}%, Active Loans: ${activeLoans.length}, Credit Cards: ${applicantData?.credit?.credit_cards?.length || 0}, Assets: ₹${extractedData.financialMetrics.totalAssets || 0}`);
                
                return (
                  <div className="space-y-6">
                    {/* DTI Overview */}
                    <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl p-6">
                      <h3 className="text-xl font-semibold text-yellow-900 mb-4 flex items-center">
                        📊 DTI Ratio Overview
                      </h3>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="text-center">
                          <p className="text-sm text-yellow-700">Monthly Income</p>
                          <p className="text-2xl font-bold text-yellow-900">₹{monthlyIncome.toLocaleString()}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-sm text-yellow-700">Total EMI</p>
                          <p className="text-2xl font-bold text-red-900">₹{totalEMI.toLocaleString()}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-sm text-yellow-700">DTI Ratio</p>
                          <p className="text-3xl font-bold text-orange-900">{dtiRatio}%</p>
                        </div>
                      </div>
                      
                      {/* Visual DTI Bar */}
                      <div className="mt-4">
                        <div className="flex justify-between text-sm text-gray-600 mb-2">
                          <span>Income Utilization</span>
                          <span>{dtiRatio}% used for EMIs</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-4">
                          <div 
                            className={`h-4 rounded-full ${
                              dtiRatio > 50 ? 'bg-red-500' : 
                              dtiRatio > 30 ? 'bg-yellow-500' : 'bg-green-500'
                            }`}
                            style={{ width: `${Math.min(dtiRatio, 100)}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-xs text-gray-500 mt-1">
                          <span>0%</span>
                          <span className="text-green-600">30% (Ideal)</span>
                          <span className="text-yellow-600">50% (Caution)</span>
                          <span>100%</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Active Loans Breakdown */}
                    <div className="bg-red-50 rounded-xl p-4">
                      <h3 className="text-lg font-semibold text-red-900 mb-3 flex items-center">
                        💳 Active Loan EMIs
                      </h3>
                      {activeLoans.length > 0 ? (
                        <div className="space-y-3">
                          {activeLoans.map((loan, index) => (
                            <div key={index} className="bg-white p-4 rounded-lg border border-red-100">
                              <div className="flex justify-between items-start">
                                <div>
                                  <h4 className="font-semibold text-red-900">{loan.loan_type}</h4>
                                  <p className="text-sm text-red-700">{loan.issuer}</p>
                                  <p className="text-xs text-gray-600">Started: {loan.start_date}</p>
                                </div>
                                <div className="text-right">
                                  <p className="text-lg font-bold text-red-900">₹{loan.emi_amount?.toLocaleString()}</p>
                                  <p className="text-sm text-red-700">Monthly EMI</p>
                                </div>
                              </div>
                              <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                                <div>
                                  <p className="text-gray-600">Outstanding</p>
                                  <p className="font-semibold">₹{loan.outstanding_amount?.toLocaleString()}</p>
                                </div>
                                <div>
                                  <p className="text-gray-600">On-time Payments</p>
                                  <p className="font-semibold text-green-600">{loan.on_time_payments || 0}</p>
                                </div>
                                <div>
                                  <p className="text-gray-600">Missed Payments</p>
                                  <p className="font-semibold text-red-600">{loan.missed_payments || 0}</p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-red-700">No active loans found</p>
                      )}
                    </div>
                    
                    {/* Financial Health */}
                    <div className="bg-blue-50 rounded-xl p-4">
                      <h3 className="text-lg font-semibold text-blue-900 mb-3 flex items-center">
                        💰 Financial Health Indicators
                      </h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white p-3 rounded-lg">
                          <p className="text-sm text-blue-700">Disposable Income</p>
                          <p className="text-xl font-bold text-blue-900">₹{disposableIncome.toLocaleString()}</p>
                          <p className="text-xs text-gray-600">After EMI payments</p>
                        </div>
                        <div className="bg-white p-3 rounded-lg">
                          <p className="text-sm text-blue-700">DTI Risk Level</p>
                          <p className={`text-xl font-bold ${
                            dtiRatio <= 30 ? 'text-green-600' :
                            dtiRatio <= 50 ? 'text-yellow-600' : 'text-red-600'
                          }`}>
                            {dtiRatio <= 30 ? 'LOW RISK' :
                             dtiRatio <= 50 ? 'MODERATE' : 'HIGH RISK'}
                          </p>
                          <p className="text-xs text-gray-600">
                            {dtiRatio <= 30 ? 'Excellent debt management' :
                             dtiRatio <= 50 ? 'Manageable debt levels' : 'Debt burden concern'}
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    {/* Recommendations */}
                    <div className="bg-green-50 rounded-xl p-4">
                      <h3 className="text-lg font-semibold text-green-900 mb-3 flex items-center">
                        💡 Recommendations
                      </h3>
                      <div className="space-y-2 text-sm">
                        {dtiRatio <= 30 && (
                          <p className="text-green-800">✅ Excellent DTI ratio! You have good borrowing capacity for additional loans.</p>
                        )}
                        {dtiRatio > 30 && dtiRatio <= 50 && (
                          <p className="text-yellow-800">⚠️ Moderate DTI ratio. Consider loan consolidation or prepayments to improve ratio.</p>
                        )}
                        {dtiRatio > 50 && (
                          <p className="text-red-800">🚨 High DTI ratio. Focus on debt reduction before taking additional loans.</p>
                        )}
                        <p className="text-gray-700">💰 Ideal DTI ratio is below 30% for optimal financial health.</p>
                        <p className="text-gray-700">📈 Consider increasing income or reducing existing debt to improve this ratio.</p>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}
      
      {/* Credit Score Modal */}
      {showCreditModal && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowCreditModal(false)}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Credit Score Analysis</h2>
                <button onClick={() => setShowCreditModal(false)} className="text-gray-500 hover:text-gray-700 text-2xl">×</button>
              </div>
              
              <div className="space-y-6">
                <div className="bg-blue-50 rounded-xl p-6 text-center">
                  <h3 className="text-lg font-semibold text-blue-900 mb-2">Current Credit Score</h3>
                  <div className="text-5xl font-bold text-blue-900 mb-2">{extractedData.financialMetrics.creditScore}</div>
                  <div className="text-sm text-blue-700">
                    {extractedData.financialMetrics.creditScore >= 750 ? 'Excellent' :
                     extractedData.financialMetrics.creditScore >= 650 ? 'Good' :
                     extractedData.financialMetrics.creditScore >= 550 ? 'Fair' : 'Poor'} Credit Rating
                  </div>
                </div>
                
                <div className="bg-gray-50 rounded-xl p-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">📈 How Credit Score is Calculated</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center p-3 bg-white rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900">Payment History</p>
                        <p className="text-sm text-gray-600">On-time payments, defaults, late payments</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-blue-600">35%</p>
                        <p className="text-xs text-green-600">{Math.round(extractedData.financialMetrics.paymentHistory * 100)}% on-time</p>
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center p-3 bg-white rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900">Credit Utilization</p>
                        <p className="text-sm text-gray-600">How much credit you're using vs available</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-blue-600">30%</p>
                        <p className="text-xs text-yellow-600">{Math.round(extractedData.financialMetrics.creditUtilization * 100)}% utilized</p>
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center p-3 bg-white rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900">Credit History Length</p>
                        <p className="text-sm text-gray-600">Age of oldest and average accounts</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-blue-600">15%</p>
                        <p className="text-xs text-gray-600">Account age matters</p>
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center p-3 bg-white rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900">Credit Mix</p>
                        <p className="text-sm text-gray-600">Types of credit accounts</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-blue-600">10%</p>
                        <p className="text-xs text-gray-600">Variety is good</p>
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center p-3 bg-white rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900">New Credit</p>
                        <p className="text-sm text-gray-600">Recent credit inquiries and accounts</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-blue-600">10%</p>
                        <p className="text-xs text-red-600">Recent inquiries</p>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="bg-green-50 rounded-xl p-4">
                  <h3 className="text-lg font-semibold text-green-900 mb-3">💡 Tips to Improve Score</h3>
                  <div className="space-y-2 text-sm text-green-800">
                    <p>• Pay all bills on time - this has the biggest impact</p>
                    <p>• Keep credit utilization below 30% of available limit</p>
                    <p>• Don't close old credit cards - longer history helps</p>
                    <p>• Limit new credit applications to avoid hard inquiries</p>
                    <p>• Monitor your credit report regularly for errors</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Expense Analysis Modal */}
      {showExpenseModal && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowExpenseModal(false)}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Expense Analysis</h2>
                <button onClick={() => setShowExpenseModal(false)} className="text-gray-500 hover:text-gray-700 text-2xl">×</button>
              </div>
              
              {(() => {
                const transactions = applicantData?.transaction?.transaction_logs || [];
                const monthlyIncome = extractedData.financialMetrics.monthlyIncome;
                const totalEMI = extractedData.financialMetrics.totalEMI;
                const estimatedExpenses = Math.round((monthlyIncome - totalEMI) * 0.7);
                
                return (
                  <div className="space-y-6">
                    <div className="bg-green-50 rounded-xl p-6">
                      <h3 className="text-xl font-semibold text-green-900 mb-4">💰 Monthly Expense Breakdown</h3>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="text-center">
                          <p className="text-sm text-green-700">Total Income</p>
                          <p className="text-2xl font-bold text-green-900">₹{monthlyIncome.toLocaleString()}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-sm text-green-700">EMI Payments</p>
                          <p className="text-2xl font-bold text-red-900">₹{totalEMI.toLocaleString()}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-sm text-green-700">Available for Expenses</p>
                          <p className="text-2xl font-bold text-blue-900">₹{(monthlyIncome - totalEMI).toLocaleString()}</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-purple-50 rounded-xl p-4">
                      <h3 className="text-lg font-semibold text-purple-900 mb-3">📊 Estimated Spending Categories</h3>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-white p-3 rounded-lg">
                          <p className="text-sm text-purple-700">Groceries & Food</p>
                          <p className="text-lg font-bold text-purple-900">₹{Math.round(estimatedExpenses * 0.3).toLocaleString()}</p>
                          <p className="text-xs text-gray-600">~30% of expenses</p>
                        </div>
                        <div className="bg-white p-3 rounded-lg">
                          <p className="text-sm text-purple-700">Transportation</p>
                          <p className="text-lg font-bold text-purple-900">₹{Math.round(estimatedExpenses * 0.15).toLocaleString()}</p>
                          <p className="text-xs text-gray-600">~15% of expenses</p>
                        </div>
                        <div className="bg-white p-3 rounded-lg">
                          <p className="text-sm text-purple-700">Utilities & Bills</p>
                          <p className="text-lg font-bold text-purple-900">₹{Math.round(estimatedExpenses * 0.25).toLocaleString()}</p>
                          <p className="text-xs text-gray-600">~25% of expenses</p>
                        </div>
                        <div className="bg-white p-3 rounded-lg">
                          <p className="text-sm text-purple-700">Entertainment & Others</p>
                          <p className="text-lg font-bold text-purple-900">₹{Math.round(estimatedExpenses * 0.3).toLocaleString()}</p>
                          <p className="text-xs text-gray-600">~30% of expenses</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-gray-50 rounded-xl p-4">
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">💹 Expense Health Score</h3>
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="text-sm text-gray-600">Expense to Income Ratio</p>
                          <p className="text-lg font-bold text-gray-900">{Math.round((estimatedExpenses / monthlyIncome) * 100)}%</p>
                        </div>
                        <div className={`px-4 py-2 rounded-full text-sm font-semibold ${
                          (estimatedExpenses / monthlyIncome) < 0.5 ? 'bg-green-100 text-green-800' :
                          (estimatedExpenses / monthlyIncome) < 0.7 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {(estimatedExpenses / monthlyIncome) < 0.5 ? 'Excellent' :
                           (estimatedExpenses / monthlyIncome) < 0.7 ? 'Good' : 'High'}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}
      
      {/* Risk Score Modal */}
      {showRiskModal && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowRiskModal(false)}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Risk Score Analysis</h2>
                <button onClick={() => setShowRiskModal(false)} className="text-gray-500 hover:text-gray-700 text-2xl">×</button>
              </div>
              
              {(() => {
                const riskScore = Math.round(extractedData.aiDecision.riskScore || 0);
                const creditScore = extractedData.financialMetrics.creditScore;
                const dtiRatio = extractedData.financialMetrics.dtiRatio;
                const paymentHistory = extractedData.financialMetrics.paymentHistory;
                const creditUtilization = extractedData.financialMetrics.creditUtilization;
                
                return (
                  <div className="space-y-6">
                    <div className="bg-purple-50 rounded-xl p-6 text-center">
                      <h3 className="text-lg font-semibold text-purple-900 mb-2">Overall Risk Score</h3>
                      <div className="text-5xl font-bold text-purple-900 mb-2">{riskScore}/100</div>
                      <div className="text-sm text-purple-700">
                        {riskScore <= 30 ? 'Low Risk - Excellent borrower profile' :
                         riskScore <= 60 ? 'Moderate Risk - Good borrower with minor concerns' :
                         riskScore <= 80 ? 'High Risk - Significant concerns present' : 'Very High Risk - Multiple red flags'}
                      </div>
                    </div>
                    
                    <div className="bg-gray-50 rounded-xl p-4">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">📊 Risk Calculation Factors</h3>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center p-3 bg-white rounded-lg">
                          <div>
                            <p className="font-medium text-gray-900">Credit Score Impact</p>
                            <p className="text-sm text-gray-600">Score: {creditScore} - {creditScore >= 750 ? 'Excellent' : creditScore >= 650 ? 'Good' : 'Fair'}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-purple-600">40% Weight</p>
                            <p className={`text-xs ${
                              creditScore >= 750 ? 'text-green-600' :
                              creditScore >= 650 ? 'text-yellow-600' : 'text-red-600'
                            }`}>
                              {creditScore >= 750 ? 'Low Risk' :
                               creditScore >= 650 ? 'Medium Risk' : 'High Risk'}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex justify-between items-center p-3 bg-white rounded-lg">
                          <div>
                            <p className="font-medium text-gray-900">Debt-to-Income Ratio</p>
                            <p className="text-sm text-gray-600">DTI: {dtiRatio}% - {dtiRatio <= 30 ? 'Excellent' : dtiRatio <= 50 ? 'Acceptable' : 'High'}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-purple-600">25% Weight</p>
                            <p className={`text-xs ${
                              dtiRatio <= 30 ? 'text-green-600' :
                              dtiRatio <= 50 ? 'text-yellow-600' : 'text-red-600'
                            }`}>
                              {dtiRatio <= 30 ? 'Low Risk' :
                               dtiRatio <= 50 ? 'Medium Risk' : 'High Risk'}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex justify-between items-center p-3 bg-white rounded-lg">
                          <div>
                            <p className="font-medium text-gray-900">Payment History</p>
                            <p className="text-sm text-gray-600">{Math.round(paymentHistory * 100)}% on-time payments</p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-purple-600">20% Weight</p>
                            <p className={`text-xs ${
                              paymentHistory >= 0.95 ? 'text-green-600' :
                              paymentHistory >= 0.85 ? 'text-yellow-600' : 'text-red-600'
                            }`}>
                              {paymentHistory >= 0.95 ? 'Low Risk' :
                               paymentHistory >= 0.85 ? 'Medium Risk' : 'High Risk'}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex justify-between items-center p-3 bg-white rounded-lg">
                          <div>
                            <p className="font-medium text-gray-900">Credit Utilization</p>
                            <p className="text-sm text-gray-600">{Math.round(creditUtilization * 100)}% of available credit used</p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-purple-600">15% Weight</p>
                            <p className={`text-xs ${
                              creditUtilization <= 0.3 ? 'text-green-600' :
                              creditUtilization <= 0.7 ? 'text-yellow-600' : 'text-red-600'
                            }`}>
                              {creditUtilization <= 0.3 ? 'Low Risk' :
                               creditUtilization <= 0.7 ? 'Medium Risk' : 'High Risk'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-blue-50 rounded-xl p-4">
                      <h3 className="text-lg font-semibold text-blue-900 mb-3">📈 Risk Level Breakdown</h3>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-blue-800">0-30: Low Risk</span>
                          <span className="text-xs text-green-600">✅ Excellent borrower profile</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-blue-800">31-60: Moderate Risk</span>
                          <span className="text-xs text-yellow-600">⚠️ Good with minor concerns</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-blue-800">61-80: High Risk</span>
                          <span className="text-xs text-orange-600">🔍 Requires careful evaluation</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-blue-800">81-100: Very High Risk</span>
                          <span className="text-xs text-red-600">🚨 Multiple concerns present</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-green-50 rounded-xl p-4">
                      <h3 className="text-lg font-semibold text-green-900 mb-3">💡 Risk Improvement Strategies</h3>
                      <div className="space-y-2 text-sm text-green-800">
                        {creditScore < 750 && (
                          <p>• 📈 Improve credit score by maintaining payment discipline and reducing utilization</p>
                        )}
                        {dtiRatio > 30 && (
                          <p>• 💰 Reduce debt-to-income ratio by paying down existing loans or increasing income</p>
                        )}
                        {paymentHistory < 0.95 && (
                          <p>• ⏰ Establish consistent payment history - set up auto-payments to avoid missed payments</p>
                        )}
                        {creditUtilization > 0.3 && (
                          <p>• 💳 Lower credit utilization by paying down balances or requesting credit limit increases</p>
                        )}
                        <p>• 📊 Regular monitoring of credit reports helps identify and fix issues early</p>
                        <p>• 🏦 Maintain stable employment and banking relationships</p>
                        <p>• 💼 Consider debt consolidation if managing multiple high-interest loans</p>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}
      
      {/* ChatBot */}
      <ChatBot 
        applicantData={applicantData}
        analysisResults={analysisResults}
        isOpen={showChatBot}
        onClose={() => setShowChatBot(false)}
      />
      
      {/* Explainability Panel */}
      <ExplainabilityPanel 
        applicantData={applicantData}
        analysisResults={analysisResults}
        isOpen={showExplainabilityPanel}
        onClose={() => setShowExplainabilityPanel(false)}
      />
      
      {/* Regulatory Report */}
      <RegulatoryReport 
        applicantData={applicantData}
        analysisResults={analysisResults}
        isOpen={showRegulatoryReport}
        onClose={() => setShowRegulatoryReport(false)}
      />
    </div>
  );
};

export default Dashboard;