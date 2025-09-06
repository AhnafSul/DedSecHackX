import React from 'react';
import { getAllApplicantSummaries } from './data/dataLoader';

const ApplicantSelector = ({ onSelectApplicant }) => {
  const applicants = getAllApplicantSummaries();

  const getRiskColor = (riskLevel) => {
    switch (riskLevel) {
      case 'Excellent': return 'bg-green-100 text-green-800 border-green-200';
      case 'Good': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Fair': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Poor': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'Very Poor': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getAvatar = (name) => {
    const avatars = ['👨💼', '👩💼', '👨💻', '👩💻', '👨🏭', '👩🔬'];
    return avatars[name.length % avatars.length];
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <div className="max-w-6xl mx-auto">
        
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            🧠 Loan XAI Analysis
          </h1>
          <p className="text-xl text-gray-600 mb-2">
            Select an applicant to analyze with Explainable AI
          </p>
          <p className="text-sm text-gray-500">
            Choose from {applicants.length} loan applications for comprehensive risk assessment
          </p>
        </div>

        {/* Applicant Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {applicants.map((applicant) => (
            <div
              key={applicant.id}
              onClick={() => onSelectApplicant(applicant.id)}
              className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 cursor-pointer card-hover transform transition-all duration-300 hover:scale-105 hover:shadow-xl"
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="text-3xl">{getAvatar(applicant.name)}</div>
                  <div>
                    <h3 className="font-bold text-lg text-gray-900">{applicant.name}</h3>
                    <p className="text-sm text-gray-500">ID: {applicant.id}</p>
                  </div>
                </div>
                <div className={`px-3 py-1 rounded-full text-xs font-semibold border ${getRiskColor(applicant.riskLevel)}`}>
                  {applicant.riskLevel}
                </div>
              </div>

              {/* Key Metrics */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Credit Score</span>
                  <span className="font-semibold text-gray-900">{applicant.creditScore}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Monthly Income</span>
                  <span className="font-semibold text-gray-900">₹{applicant.monthlyIncome.toLocaleString()}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Age</span>
                  <span className="font-semibold text-gray-900">{applicant.age} years</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Employment</span>
                  <span className="font-semibold text-gray-900 text-xs">{applicant.employment}</span>
                </div>
              </div>

              {/* Credit Score Bar */}
              <div className="mt-4">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Credit Score</span>
                  <span>{applicant.creditScore}/850</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${
                      applicant.creditScore >= 750 ? 'bg-green-500' :
                      applicant.creditScore >= 650 ? 'bg-blue-500' :
                      applicant.creditScore >= 550 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${(applicant.creditScore / 850) * 100}%` }}
                  />
                </div>
              </div>

              {/* Action Button */}
              <button className="w-full mt-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white py-2 px-4 rounded-lg font-medium hover:from-blue-600 hover:to-purple-700 transition-all duration-200">
                Analyze with XAI 🚀
              </button>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="text-center mt-12 text-gray-500 text-sm">
          <p>🔒 All data is synthetic and used for demonstration purposes only</p>
        </div>
      </div>
    </div>
  );
};

export default ApplicantSelector;