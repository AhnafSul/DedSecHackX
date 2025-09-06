class AWSNovaService {
  constructor() {
    this.apiKey = process.env.REACT_APP_AWS_NOVA_KEY;
    this.baseUrl = 'https://bedrock-runtime.us-east-1.amazonaws.com';
    this.analysisResults = {};
    this.connectionStatus = null;
  }

  showConnectionNotification() {
    if (!this.apiKey) return;
    
    const notification = document.createElement('div');
    notification.className = 'fixed top-4 right-4 bg-gradient-to-r from-green-500 to-blue-600 text-white px-6 py-3 rounded-lg shadow-lg z-50 transform translate-x-full transition-transform duration-500';
    notification.innerHTML = '✅ AWS Nova Connected';
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.style.transform = 'translateX(0)';
    }, 100);
    
    setTimeout(() => {
      notification.style.transform = 'translateX(full)';
      setTimeout(() => notification.remove(), 500);
    }, 3000);
  }

  async analyzeApplicantData(applicantData, stage) {
    try {
      let analysisPrompt = '';
      let dataToAnalyze = {};

      switch (stage) {
        case 'income':
          dataToAnalyze = applicantData.income;
          analysisPrompt = `Analyze this income data for loan risk assessment. Focus on income stability, employment type, tax compliance, and debt capacity. Provide risk factors and recommendations: ${JSON.stringify(dataToAnalyze)}`;
          break;
        
        case 'credit':
          dataToAnalyze = applicantData.credit;
          analysisPrompt = `Analyze this credit report for loan approval. Focus on credit score, payment history, credit utilization, and existing debts. Identify red flags and positive indicators: ${JSON.stringify(dataToAnalyze)}`;
          break;
        
        case 'loan':
          dataToAnalyze = applicantData.loan;
          analysisPrompt = `Analyze this loan history for repayment behavior. Focus on payment patterns, prepayment behavior, and current debt load. Assess repayment reliability: ${JSON.stringify(dataToAnalyze)}`;
          break;
        
        case 'transaction':
          dataToAnalyze = applicantData.transaction;
          analysisPrompt = `Analyze these transaction patterns for financial behavior. Focus on spending habits, utility payments, and cash flow management. Identify financial discipline indicators: ${JSON.stringify(dataToAnalyze)}`;
          break;
        
        default:
          return this.performLocalAnalysis(applicantData, stage);
      }

      const response = await fetch(`${this.baseUrl}/model/amazon.nova-pro-v1:0/invoke`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          messages: [{ 
            role: 'user', 
            content: [{ text: analysisPrompt }] 
          }],
          inferenceConfig: { 
            maxTokens: 500, 
            temperature: 0.3 
          }
        })
      });

      if (response.ok) {
        if (!this.connectionStatus) {
          this.connectionStatus = 'connected';
          this.showConnectionNotification();
        }
        const result = await response.json();
        const analysis = result.output?.message?.content?.[0]?.text || 'Analysis completed';
        this.analysisResults[stage] = analysis;
        return analysis;
      } else {
        return this.performLocalAnalysis(applicantData, stage);
      }
    } catch (error) {
      return this.performLocalAnalysis(applicantData, stage);
    }
  }

  performLocalAnalysis(applicantData, stage) {
    switch (stage) {
      case 'income':
        return this.analyzeIncomeLocal(applicantData.income);
      case 'credit':
        return this.analyzeCreditLocal(applicantData.credit);
      case 'loan':
        return this.analyzeLoanLocal(applicantData.loan);
      case 'transaction':
        return this.analyzeTransactionLocal(applicantData.transaction);
      default:
        return 'Analysis completed successfully';
    }
  }

  analyzeIncomeLocal(incomeData) {
    const income = incomeData?.income_statement?.salary_slips;
    const monthlyIncome = income?.monthly_income || 0;
    const employmentType = income?.employment_type || 'Unknown';
    const itrFiled = incomeData?.income_statement?.tax_returns?.itr_filed;

    let riskFactors = [];
    let positives = [];

    if (monthlyIncome < 30000) riskFactors.push('Low income level');
    if (monthlyIncome > 100000) positives.push('High income level');
    if (employmentType === 'Contract') riskFactors.push('Contract employment - income instability');
    if (employmentType === 'Permanent') positives.push('Permanent employment - stable income');
    if (!itrFiled) riskFactors.push('ITR not filed - tax non-compliance');
    if (itrFiled) positives.push('ITR filed - tax compliant');

    this.analysisResults.income = { riskFactors, positives, monthlyIncome, employmentType };
    return `Income Analysis: ${positives.length} positive factors, ${riskFactors.length} risk factors identified`;
  }

  analyzeCreditLocal(creditData) {
    const creditScore = creditData?.credit_score?.score || 0;
    const paymentRatio = creditData?.payment_history?.on_time_payment_ratio || 0;
    const missedPayments = creditData?.payment_history?.missed_payments || 0;
    const creditCards = creditData?.credit_cards || [];

    let riskFactors = [];
    let positives = [];

    if (creditScore < 600) riskFactors.push('Poor credit score');
    if (creditScore > 750) positives.push('Excellent credit score');
    if (paymentRatio < 0.8) riskFactors.push('Poor payment history');
    if (paymentRatio > 0.95) positives.push('Excellent payment history');
    if (missedPayments > 5) riskFactors.push('Multiple missed payments');

    creditCards.forEach(card => {
      if (card.utilization_ratio > 0.8) riskFactors.push('High credit utilization');
      if (card.utilization_ratio < 0.3) positives.push('Low credit utilization');
    });

    this.analysisResults.credit = { riskFactors, positives, creditScore, paymentRatio };
    return `Credit Analysis: Score ${creditScore}, ${positives.length} strengths, ${riskFactors.length} concerns`;
  }

  analyzeLoanLocal(loanData) {
    const activeLoans = loanData?.loan_repayment_history?.active_loans || [];
    const utilizationRatio = loanData?.loan_repayment_history?.credit_utilization?.utilization_ratio || 0;

    let riskFactors = [];
    let positives = [];
    let totalEMI = 0;

    activeLoans.forEach(loan => {
      totalEMI += loan.emi_amount || 0;
      if (loan.missed_payments > 2) riskFactors.push(`${loan.loan_type}: Multiple missed payments`);
      if (loan.missed_payments === 0) positives.push(`${loan.loan_type}: Perfect payment record`);
      if (loan.prepayment_behavior?.has_prepayments) positives.push(`${loan.loan_type}: Shows prepayment capability`);
    });

    if (utilizationRatio > 0.7) riskFactors.push('High debt utilization');
    if (utilizationRatio < 0.4) positives.push('Conservative debt levels');

    this.analysisResults.loan = { riskFactors, positives, totalEMI, utilizationRatio };
    return `Loan Analysis: ₹${totalEMI.toLocaleString()} total EMI, ${activeLoans.length} active loans`;
  }

  analyzeTransactionLocal(transactionData) {
    const transactions = transactionData?.transaction_logs || [];
    const utilityPayments = transactionData?.utility_payments?.monthly_breakdown || [];

    let riskFactors = [];
    let positives = [];
    let totalSpending = 0;

    transactions.forEach(txn => {
      totalSpending += txn.total_amount || 0;
    });

    utilityPayments.forEach(month => {
      Object.values(month).forEach(utility => {
        if (typeof utility === 'object' && utility.missed_payment) {
          riskFactors.push('Utility payment delays');
        }
        if (typeof utility === 'object' && utility.delay_days === 0) {
          positives.push('Timely utility payments');
        }
      });
    });

    if (totalSpending > 50000) riskFactors.push('High monthly spending');
    if (totalSpending < 20000) positives.push('Conservative spending habits');

    this.analysisResults.transaction = { riskFactors, positives, totalSpending };
    return `Transaction Analysis: ₹${totalSpending.toLocaleString()} monthly spending pattern analyzed`;
  }

  async generateFinalRecommendation(applicantData) {
    const creditScore = applicantData.credit?.credit_score?.score || 0;
    const monthlyIncome = applicantData.income?.income_statement?.salary_slips?.monthly_income || 0;
    const totalEMI = this.analysisResults.loan?.totalEMI || 0;
    const dtiRatio = totalEMI / monthlyIncome;
    const paymentHistory = applicantData.credit?.payment_history?.on_time_payment_ratio || 0;
    const employmentType = applicantData.income?.income_statement?.salary_slips?.employment_type;

    // Try AI-powered decision first
    if (this.apiKey) {
      try {
        const prompt = `As a senior loan underwriter, make a loan decision for this applicant:

APPLICANT PROFILE:
• Credit Score: ${creditScore}
• Monthly Income: ₹${monthlyIncome.toLocaleString()}
• Current EMI: ₹${totalEMI.toLocaleString()} (${Math.round(dtiRatio * 100)}% DTI)
• Payment History: ${Math.round(paymentHistory * 100)}% on-time
• Employment: ${employmentType}
• Risk Factors: ${Object.values(this.analysisResults).reduce((sum, analysis) => sum + (analysis.riskFactors?.length || 0), 0)}
• Positive Factors: ${Object.values(this.analysisResults).reduce((sum, analysis) => sum + (analysis.positives?.length || 0), 0)}

Provide your decision in this exact format:
DECISION: [APPROVE/CONDITIONAL APPROVE/REJECT/MANUAL REVIEW]
RISK_SCORE: [0-100]
REASONING: [2-3 key points explaining your decision]`;

        const response = await fetch(`${this.baseUrl}/model/amazon.nova-pro-v1:0/invoke`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`
          },
          body: JSON.stringify({
            messages: [{ role: 'user', content: [{ text: prompt }] }],
            inferenceConfig: { maxTokens: 300, temperature: 0.2 }
          })
        });

        if (response.ok) {
          const result = await response.json();
          const aiResponse = result.output?.message?.content?.[0]?.text || '';
          
          const decisionMatch = aiResponse.match(/DECISION:\s*([^\n]+)/);
          const riskMatch = aiResponse.match(/RISK_SCORE:\s*(\d+)/);
          const reasoningMatch = aiResponse.match(/REASONING:\s*([\s\S]+)/);
          
          if (decisionMatch) {
            let cleanReasoning = ['AI analysis completed'];
            if (reasoningMatch) {
              cleanReasoning = reasoningMatch[1]
                .trim()
                .split(/[.!]\s+/)
                .filter(sentence => sentence.length > 10)
                .map(sentence => sentence.trim().replace(/^[•\-\*]\s*/, ''))
                .slice(0, 3);
            }
            
            return {
              recommendation: decisionMatch[1].trim(),
              reasoning: cleanReasoning,
              riskScore: riskMatch ? parseInt(riskMatch[1]) : Math.round((100 - creditScore/8.5) + (dtiRatio * 30)),
              keyFactors: {
                creditScore,
                monthlyIncome,
                dtiRatio: Math.round(dtiRatio * 100),
                totalRiskFactors: Object.values(this.analysisResults).reduce((sum, analysis) => sum + (analysis.riskFactors?.length || 0), 0),
                totalPositives: Object.values(this.analysisResults).reduce((sum, analysis) => sum + (analysis.positives?.length || 0), 0)
              }
            };
          }
        }
      } catch (error) {
        // Fall back to rule-based if AI fails
      }
    }

    // Fallback rule-based decision
    let recommendation = 'REJECT';
    let reasoning = [];

    if (creditScore >= 750 && dtiRatio < 0.4) {
      recommendation = 'APPROVE';
      reasoning.push('Excellent credit score and low DTI ratio');
    } else if (creditScore >= 650 && dtiRatio < 0.5) {
      recommendation = 'CONDITIONAL APPROVE';
      reasoning.push('Good credit score with manageable debt levels');
    } else if (creditScore < 600 || dtiRatio > 0.6) {
      recommendation = 'REJECT';
      reasoning.push('Poor credit score or high debt burden');
    } else {
      recommendation = 'MANUAL REVIEW';
      reasoning.push('Mixed indicators require human assessment');
    }

    return {
      recommendation,
      reasoning,
      riskScore: Math.max(0, Math.min(100, (100 - creditScore/8.5) + (dtiRatio * 30))),
      keyFactors: {
        creditScore,
        monthlyIncome,
        dtiRatio: Math.round(dtiRatio * 100),
        totalRiskFactors: Object.values(this.analysisResults).reduce((sum, analysis) => sum + (analysis.riskFactors?.length || 0), 0),
        totalPositives: Object.values(this.analysisResults).reduce((sum, analysis) => sum + (analysis.positives?.length || 0), 0)
      }
    };
  }

  getAnalysisResults() {
    return this.analysisResults;
  }

  clearResults() {
    this.analysisResults = {};
  }
}

export default AWSNovaService;