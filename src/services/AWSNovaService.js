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
        // Calculate DTI properly for AI prompt
        const actualDTI = monthlyIncome > 0 ? totalEMI / monthlyIncome : 0;
        const dtiPercentage = Math.round(actualDTI * 100);
        const assets = this.calculateAssetValue(applicantData);
        const creditAge = this.calculateCreditAge(applicantData);
        const utilization = this.calculateCreditUtilization(applicantData);
        const inquiries = applicantData.credit?.credit_inquiries?.length || 0;
        
        const prompt = `You are a senior loan underwriter for UNSECURED PERSONAL LOANS. Make balanced decisions with proper risk assessment.

STRICT LENDING STANDARDS:
- Credit Score BELOW 550: AUTOMATIC REJECT (too high risk)
- Credit Score 550-599: REJECT unless ALL other factors are excellent
- Credit Score 600-649: APPROVE if DTI <40% AND Payment History >80%
- Credit Score 650+: APPROVE with reasonable DTI and payment history
- DTI above 60%: REJECT regardless of credit score
- Payment History below 70%: REJECT (shows poor discipline)

APPLICANT PROFILE:
• Credit Score: ${creditScore} (${this.getCreditRating(creditScore)})
• Monthly Income: ₹${monthlyIncome.toLocaleString()} (${employmentType})
• Current EMI: ₹${totalEMI.toLocaleString()}
• Debt-to-Income Ratio: ${dtiPercentage}%
• Payment History: ${Math.round(paymentHistory * 100)}% on-time payments
• Credit Utilization: ${Math.round(utilization * 100)}%
• Employment: ${employmentType}

DECISION FRAMEWORK:
1. Check minimum credit score threshold (550+)
2. Assess DTI sustainability (<50% preferred, <60% maximum)
3. Evaluate payment discipline (80%+ preferred, 70%+ minimum)
4. Consider employment stability as tie-breaker
5. Make holistic decision with proper risk weighting

IMPROVEMENT GUIDANCE REQUIRED:
- ALWAYS provide improvement tips regardless of approval/rejection
- For APPROVED: Suggest ways to maintain good standing
- For REJECTED: Provide specific steps to become approvable
- Focus on the 2-3 weakest factors in the profile
- Give realistic timelines for improvement (3-6 months typical)

FORMATTING REQUIREMENTS:
- Use NO asterisks, bullets, or special characters
- Write in plain text only
- Keep responses clean and simple
- Use only letters, numbers, spaces, and basic punctuation

Provide your response in this exact format:

DECISION: APPROVE or REJECT
RISK_SCORE: number from 0 to 100
REASONING: Plain text explanation without any formatting
IMPROVEMENT_TIPS: Plain text suggestions without bullets or asterisks`;

        const response = await fetch(`${this.baseUrl}/model/amazon.nova-pro-v1:0/invoke`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`
          },
          body: JSON.stringify({
            messages: [{ role: 'user', content: [{ text: prompt }] }],
            inferenceConfig: { maxTokens: 400, temperature: 0.2 }
          })
        });

        if (response.ok) {
          const result = await response.json();
          const aiResponse = result.output?.message?.content?.[0]?.text || '';
          
          // Clean the entire AI response first
          const cleanedResponse = aiResponse
            .replace(/\*+/g, '') // Remove all asterisks
            .replace(/#+/g, '') // Remove hash symbols
            .replace(/^[•\-\*]\s*/gm, '') // Remove bullet points
            .trim();
          
          const decisionMatch = cleanedResponse.match(/DECISION:\s*([^\n\r]+)/);
          const riskMatch = cleanedResponse.match(/RISK_SCORE:\s*(\d+)/);
          const reasoningMatch = cleanedResponse.match(/REASONING:\s*([\s\S]*?)(?=IMPROVEMENT_TIPS:|$)/);
          const improvementMatch = cleanedResponse.match(/IMPROVEMENT_TIPS:\s*([\s\S]+)/);
          
          if (decisionMatch) {
            // Clean decision text
            const cleanDecision = decisionMatch[1]
              .trim()
              .replace(/[^A-Z\s]/g, '') // Keep only letters and spaces
              .replace(/\s+/g, ' ') // Normalize spaces
              .trim();
            
            let cleanReasoning = ['AI analysis completed'];
            if (reasoningMatch) {
              cleanReasoning = reasoningMatch[1]
                .trim()
                .split(/[.!]\s+/)
                .filter(sentence => sentence.length > 10)
                .map(sentence => sentence.trim())
                .slice(0, 3);
            }
            
            let improvementTips = [];
            if (improvementMatch) {
              improvementTips = improvementMatch[1]
                .trim()
                .split(/[.!]\s+/)
                .filter(tip => tip.length > 10)
                .map(tip => tip.trim())
                .slice(0, 3);
            }
            
            return {
              recommendation: cleanDecision,
              reasoning: cleanReasoning,
              improvementTips,
              riskScore: riskMatch ? parseInt(riskMatch[1]) : this.calculateComprehensiveRiskScore(applicantData),
              keyFactors: {
                creditScore,
                creditRating: applicantData?.credit?.credit_score?.rating,
                monthlyIncome,
                netIncome: applicantData?.income?.income_statement?.salary_slips?.net_income,
                dtiRatio: dtiPercentage,
                totalEMI,
                paymentHistory: Math.round(paymentHistory * 100),
                missedPayments: applicantData?.credit?.payment_history?.missed_payments || 0,
                totalAssets: assets,
                creditUtilization: Math.round(utilization * 100),
                creditAge,
                employmentType,
                employer: applicantData?.income?.income_statement?.salary_slips?.employer,
                itrFiled: applicantData?.income?.income_statement?.tax_returns?.itr_filed,
                rentalIncome: applicantData?.income?.income_statement?.investment_portfolio?.real_estate_income?.monthly_rent || 0,
                creditInquiries: inquiries,
                activeLoansCount: applicantData?.loan?.loan_repayment_history?.active_loans?.length || 0,
                creditCardsCount: applicantData?.credit?.credit_cards?.length || 0,
                totalRiskFactors: Object.values(this.analysisResults).reduce((sum, analysis) => sum + (analysis.riskFactors?.length || 0), 0),
                totalPositives: Object.values(this.analysisResults).reduce((sum, analysis) => sum + (analysis.positives?.length || 0), 0)
              },
              explainability: {
                primaryFactors: this.getPrimaryDecisionFactors(creditScore, actualDTI, paymentHistory, applicantData),
                whatIfScenarios: this.generateWhatIfScenarios(applicantData)
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
    let improvementTips = [];

    const riskScore = this.calculateComprehensiveRiskScore(applicantData);
    
    if (riskScore <= 35) {
      recommendation = 'APPROVE';
      reasoning.push('Acceptable risk profile with manageable financial indicators');
    } else {
      recommendation = 'REJECT';
      reasoning.push('Risk profile exceeds acceptable lending thresholds');
      improvementTips.push('Improve credit score and maintain consistent payment history', 'Consider reducing existing debt burden');
    }

    const actualDTI = monthlyIncome > 0 ? totalEMI / monthlyIncome : 0;
    return {
      recommendation,
      reasoning,
      improvementTips,
      riskScore: this.calculateComprehensiveRiskScore(applicantData),
      keyFactors: {
        creditScore,
        creditRating: applicantData?.credit?.credit_score?.rating,
        monthlyIncome,
        netIncome: applicantData?.income?.income_statement?.salary_slips?.net_income,
        dtiRatio: Math.round((monthlyIncome > 0 && totalEMI > 0 ? totalEMI / monthlyIncome : 0) * 100),
        totalEMI,
        paymentHistory: Math.round(paymentHistory * 100),
        missedPayments: applicantData?.credit?.payment_history?.missed_payments || 0,
        totalAssets: this.calculateAssetValue(applicantData),
        creditUtilization: Math.round(this.calculateCreditUtilization(applicantData) * 100),
        creditAge: this.calculateCreditAge(applicantData),
        employmentType,
        employer: applicantData?.income?.income_statement?.salary_slips?.employer,
        itrFiled: applicantData?.income?.income_statement?.tax_returns?.itr_filed,
        rentalIncome: applicantData?.income?.income_statement?.investment_portfolio?.real_estate_income?.monthly_rent || 0,
        creditInquiries: applicantData?.credit?.credit_inquiries?.length || 0,
        activeLoansCount: applicantData?.loan?.loan_repayment_history?.active_loans?.length || 0,
        creditCardsCount: applicantData?.credit?.credit_cards?.length || 0,
        totalRiskFactors: Object.values(this.analysisResults).reduce((sum, analysis) => sum + (analysis.riskFactors?.length || 0), 0),
        totalPositives: Object.values(this.analysisResults).reduce((sum, analysis) => sum + (analysis.positives?.length || 0), 0)
      },
      explainability: {
        primaryFactors: this.getPrimaryDecisionFactors(creditScore, actualDTI, paymentHistory, applicantData),
        whatIfScenarios: this.generateWhatIfScenarios(applicantData)
      }
    };
  }

  getPrimaryDecisionFactors(creditScore, dtiRatio, paymentHistory) {
    const factors = [];
    const actualDTI = isNaN(dtiRatio) || dtiRatio === 0 ? 0 : dtiRatio;
    
    if (creditScore < 600) {
      factors.push({ factor: 'Credit Score', impact: 'NEGATIVE', weight: 40, description: `Score of ${creditScore} is below minimum threshold of 600` });
    } else if (creditScore >= 750) {
      factors.push({ factor: 'Credit Score', impact: 'POSITIVE', weight: 40, description: `Excellent score of ${creditScore} indicates low default risk` });
    }
    
    if (actualDTI > 0.5) {
      factors.push({ factor: 'Debt-to-Income', impact: 'NEGATIVE', weight: 30, description: `DTI of ${Math.round(actualDTI * 100)}% exceeds safe lending limit of 50%` });
    } else if (actualDTI < 0.3 && actualDTI > 0) {
      factors.push({ factor: 'Debt-to-Income', impact: 'POSITIVE', weight: 30, description: `Low DTI of ${Math.round(actualDTI * 100)}% shows strong repayment capacity` });
    }
    
    if (paymentHistory < 0.8) {
      factors.push({ factor: 'Payment History', impact: 'NEGATIVE', weight: 20, description: `Only ${Math.round(paymentHistory * 100)}% on-time payments indicates reliability concerns` });
    } else if (paymentHistory >= 0.95) {
      factors.push({ factor: 'Payment History', impact: 'POSITIVE', weight: 20, description: `${Math.round(paymentHistory * 100)}% on-time payments shows excellent discipline` });
    }
    
    return factors;
  }

  generateWhatIfScenarios(applicantData) {
    const creditScore = applicantData.credit?.credit_score?.score || 0;
    const monthlyIncome = applicantData.income?.income_statement?.salary_slips?.monthly_income || 0;
    const totalEMI = this.analysisResults.loan?.totalEMI || 0;
    const dtiRatio = monthlyIncome > 0 ? totalEMI / monthlyIncome : 0;
    
    const scenarios = [];
    
    // Scenario 1: Credit score improvement
    if (creditScore < 750) {
      const improvedScore = Math.min(850, creditScore + 50);
      const newRisk = Math.max(0, Math.min(100, (100 - improvedScore/8.5) + (dtiRatio * 30)));
      const wouldApprove = newRisk <= 30;
      scenarios.push({
        scenario: 'Improve Credit Score by 50 points',
        change: `${creditScore} → ${improvedScore}`,
        impact: wouldApprove ? 'APPROVE' : 'STILL REJECTED',
        description: wouldApprove ? `Would reduce risk score to ${Math.round(newRisk)} and qualify for approval` : `Even with improved score of ${improvedScore}, risk score of ${Math.round(newRisk)} still too high`
      });
    }
    
    // Scenario 2: Debt reduction
    if (dtiRatio > 0.1) {
      const reducedEMI = totalEMI * 0.8;
      const newDTI = monthlyIncome > 0 ? reducedEMI / monthlyIncome : 0;
      const newRisk = Math.max(0, Math.min(100, (100 - creditScore/8.5) + (newDTI * 30)));
      const wouldApprove = newRisk <= 30;
      scenarios.push({
        scenario: 'Reduce existing debt by 20%',
        change: `${Math.round(dtiRatio * 100)}% → ${Math.round(newDTI * 100)}% DTI`,
        impact: wouldApprove ? 'APPROVE' : 'STILL REJECTED',
        description: wouldApprove ? `Would reduce risk score to ${Math.round(newRisk)} and qualify for approval` : `DTI improvement alone insufficient, risk score ${Math.round(newRisk)} still too high`
      });
    }
    
    // Scenario 3: Income increase
    const increasedIncome = monthlyIncome * 1.2;
    const newDTIIncome = increasedIncome > 0 ? totalEMI / increasedIncome : 0;
    const newRiskIncome = Math.max(0, Math.min(100, (100 - creditScore/8.5) + (newDTIIncome * 30)));
    const wouldApproveIncome = newRiskIncome <= 30;
    scenarios.push({
      scenario: 'Increase monthly income by 20%',
      change: `₹${monthlyIncome.toLocaleString()} → ₹${increasedIncome.toLocaleString()}`,
      impact: wouldApproveIncome ? 'APPROVE' : 'STILL REJECTED',
      description: wouldApproveIncome ? `Would reduce risk score to ${Math.round(newRiskIncome)} and qualify for approval` : `Income increase helps but risk score ${Math.round(newRiskIncome)} still exceeds approval threshold`
    });
    
    return scenarios;
  }

  async simulateScenario(applicantData, changes) {
    // Create modified applicant data based on changes
    const modifiedData = JSON.parse(JSON.stringify(applicantData));
    
    if (changes.creditScore) {
      modifiedData.credit.credit_score.score = changes.creditScore;
    }
    if (changes.monthlyIncome) {
      modifiedData.income.income_statement.salary_slips.monthly_income = changes.monthlyIncome;
    }
    if (changes.reduceDebt) {
      modifiedData.loan.loan_repayment_history.active_loans.forEach(loan => {
        loan.emi_amount = Math.round(loan.emi_amount * (1 - changes.reduceDebt));
      });
    }
    
    // Generate new recommendation with modified data
    return await this.generateFinalRecommendation(modifiedData);
  }

  getAnalysisResults() {
    return this.analysisResults;
  }

  calculateAssetValue(applicantData) {
    let totalAssets = 0;
    const investments = applicantData?.income?.income_statement?.investment_portfolio;
    
    if (investments?.real_estate_income?.property_value) {
      totalAssets += investments.real_estate_income.property_value;
    }
    if (investments?.mutual_funds) {
      investments.mutual_funds.forEach(fund => totalAssets += fund.current_value || 0);
    }
    if (investments?.fixed_deposits) {
      investments.fixed_deposits.forEach(fd => totalAssets += fd.amount || 0);
    }
    if (investments?.stocks) {
      investments.stocks.forEach(stock => totalAssets += (stock.quantity * stock.current_price) || 0);
    }
    
    return totalAssets;
  }
  
  getRealEstateValue(applicantData) {
    return applicantData?.income?.income_statement?.investment_portfolio?.real_estate_income?.property_value || 0;
  }
  
  getInvestmentValue(applicantData) {
    const investments = applicantData?.income?.income_statement?.investment_portfolio;
    let total = 0;
    if (investments?.mutual_funds) {
      investments.mutual_funds.forEach(fund => total += fund.current_value || 0);
    }
    if (investments?.fixed_deposits) {
      investments.fixed_deposits.forEach(fd => total += fd.amount || 0);
    }
    return total;
  }
  
  calculateCreditUtilization(applicantData) {
    const cards = applicantData?.credit?.credit_cards || [];
    if (cards.length === 0) return 0;
    
    let totalUsed = 0, totalLimit = 0;
    cards.forEach(card => {
      // Use utilization_ratio directly if available, otherwise calculate from balance
      if (card.utilization_ratio !== undefined) {
        totalUsed += (card.limit || card.credit_limit || 0) * card.utilization_ratio;
        totalLimit += card.limit || card.credit_limit || 0;
      } else {
        totalUsed += card.current_balance || 0;
        totalLimit += card.limit || card.credit_limit || 0;
      }
    });
    
    return totalLimit > 0 ? totalUsed / totalLimit : 0;
  }
  
  calculateCreditAge(applicantData) {
    const cards = applicantData?.credit?.credit_cards || [];
    if (cards.length === 0) return 0;
    
    let totalAge = 0, validCards = 0;
    cards.forEach(card => {
      const openDate = card.opened_on || card.account_opened;
      if (openDate) {
        const openDateObj = new Date(openDate);
        const monthsOld = (new Date() - openDateObj) / (1000 * 60 * 60 * 24 * 30);
        totalAge += monthsOld;
        validCards++;
      }
    });
    
    return validCards > 0 ? Math.round(totalAge / validCards) : 0;
  }
  
  getCreditRating(score) {
    if (score >= 800) return 'Exceptional';
    if (score >= 740) return 'Very Good';
    if (score >= 670) return 'Good';
    if (score >= 580) return 'Fair';
    return 'Poor';
  }
  
  calculateComprehensiveRiskScore(applicantData) {
    const creditScore = applicantData?.credit?.credit_score?.score || 0;
    const monthlyIncome = applicantData?.income?.income_statement?.salary_slips?.monthly_income || 0;
    const totalEMI = this.analysisResults.loan?.totalEMI || 0;
    const dtiRatio = monthlyIncome > 0 ? totalEMI / monthlyIncome : 0;
    const paymentHistory = applicantData?.credit?.payment_history?.on_time_payment_ratio || 0;
    const utilization = this.calculateCreditUtilization(applicantData);
    const employmentType = applicantData?.income?.income_statement?.salary_slips?.employment_type;
    
    let riskScore = 0;
    
    // Credit Score Risk (35%) - More balanced scoring
    if (creditScore < 550) riskScore += 35;
    else if (creditScore < 600) riskScore += 25;
    else if (creditScore < 650) riskScore += 18;
    else if (creditScore < 700) riskScore += 12;
    else if (creditScore < 750) riskScore += 8;
    else if (creditScore < 800) riskScore += 4;
    
    // DTI Risk (30%) - More realistic thresholds
    if (dtiRatio > 0.6) riskScore += 30;
    else if (dtiRatio > 0.5) riskScore += 20;
    else if (dtiRatio > 0.4) riskScore += 12;
    else if (dtiRatio > 0.35) riskScore += 6;
    
    // Payment History Risk (25%) - Increased weight
    if (paymentHistory < 0.7) riskScore += 25;
    else if (paymentHistory < 0.8) riskScore += 18;
    else if (paymentHistory < 0.9) riskScore += 12;
    else if (paymentHistory < 0.95) riskScore += 6;
    
    // Employment Stability Risk (10%)
    if (employmentType === 'Contract' || employmentType === 'Self Employed') riskScore += 10;
    else if (employmentType === 'Permanent') riskScore += 0;
    else riskScore += 5; // Unknown employment type
    
    return Math.min(100, Math.max(0, riskScore));
  }
  
  getPrimaryDecisionFactors(creditScore, dtiRatio, paymentHistory, applicantData) {
    const factors = [];
    const actualDTI = isNaN(dtiRatio) || dtiRatio === 0 ? 0 : dtiRatio;
    const employmentType = applicantData?.income?.income_statement?.salary_slips?.employment_type;
    
    // Always include credit score factor
    if (creditScore < 600) {
      factors.push({ factor: 'Credit Score', impact: 'NEGATIVE', weight: 35, description: `Score of ${creditScore} is below minimum threshold of 600` });
    } else if (creditScore >= 750) {
      factors.push({ factor: 'Credit Score', impact: 'POSITIVE', weight: 35, description: `Excellent score of ${creditScore} indicates low default risk` });
    } else if (creditScore >= 650) {
      factors.push({ factor: 'Credit Score', impact: 'POSITIVE', weight: 35, description: `Good score of ${creditScore} shows reliable credit management` });
    }
    
    // Always include DTI factor
    if (actualDTI > 0.5) {
      factors.push({ factor: 'Debt-to-Income', impact: 'NEGATIVE', weight: 30, description: `DTI of ${Math.round(actualDTI * 100)}% exceeds safe lending limit of 50%` });
    } else if (actualDTI < 0.3 && actualDTI > 0) {
      factors.push({ factor: 'Debt-to-Income', impact: 'POSITIVE', weight: 30, description: `Low DTI of ${Math.round(actualDTI * 100)}% shows strong repayment capacity` });
    } else if (actualDTI <= 0.5 && actualDTI > 0) {
      factors.push({ factor: 'Debt-to-Income', impact: 'POSITIVE', weight: 30, description: `Manageable DTI of ${Math.round(actualDTI * 100)}% within acceptable limits` });
    }
    
    // Always include payment history factor
    if (paymentHistory < 0.8) {
      factors.push({ factor: 'Payment History', impact: 'NEGATIVE', weight: 25, description: `Only ${Math.round(paymentHistory * 100)}% on-time payments indicates reliability concerns` });
    } else if (paymentHistory >= 0.95) {
      factors.push({ factor: 'Payment History', impact: 'POSITIVE', weight: 25, description: `${Math.round(paymentHistory * 100)}% on-time payments shows excellent discipline` });
    } else {
      factors.push({ factor: 'Payment History', impact: 'POSITIVE', weight: 25, description: `${Math.round(paymentHistory * 100)}% on-time payments shows good payment discipline` });
    }
    
    // Always include employment factor
    if (employmentType === 'Permanent') {
      factors.push({ factor: 'Employment Stability', impact: 'POSITIVE', weight: 10, description: `Permanent employment provides stable income source` });
    } else if (employmentType === 'Contract') {
      factors.push({ factor: 'Employment Stability', impact: 'NEGATIVE', weight: 10, description: `Contract employment may indicate income instability` });
    } else if (employmentType === 'Self Employed') {
      factors.push({ factor: 'Employment Stability', impact: 'NEGATIVE', weight: 10, description: `Self-employment income may be variable and unpredictable` });
    }
    
    return factors;
  }

  clearResults() {
    this.analysisResults = {};
  }
}

export default AWSNovaService;