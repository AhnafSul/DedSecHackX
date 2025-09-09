class SHAPExplainer {
  constructor() {
    // Base values (average risk across population)
    this.baseValue = 50; // Baseline risk score
    
    // Feature importance weights learned from data
    this.featureWeights = {
      creditScore: 0.35,
      dtiRatio: 0.30,
      paymentHistory: 0.25,
      employment: 0.10
    };
  }

  // Calculate SHAP values for each feature
  calculateSHAPValues(applicantData) {
    const features = this.extractFeatures(applicantData);
    const shapValues = {};
    
    // Calculate individual feature contributions
    shapValues.creditScore = this.calculateCreditScoreContribution(features.creditScore);
    shapValues.dtiRatio = this.calculateDTIContribution(features.dtiRatio);
    shapValues.paymentHistory = this.calculatePaymentHistoryContribution(features.paymentHistory);
    shapValues.employment = this.calculateEmploymentContribution(features.employment);
    
    // Ensure additivity: base_value + sum(shap_values) = prediction
    const totalContribution = Object.values(shapValues).reduce((sum, val) => sum + val, 0);
    const prediction = this.baseValue + totalContribution;
    
    return {
      baseValue: this.baseValue,
      shapValues,
      prediction: Math.max(0, Math.min(100, prediction)),
      features,
      explanation: this.generateExplanation(shapValues, features)
    };
  }

  extractFeatures(applicantData) {
    const creditScore = applicantData?.credit?.credit_score?.score || 0;
    const monthlyIncome = applicantData?.income?.income_statement?.salary_slips?.monthly_income || 0;
    const totalEMI = applicantData?.loan?.loan_repayment_history?.active_loans?.reduce((sum, loan) => sum + (loan.emi_amount || 0), 0) || 0;
    const dtiRatio = monthlyIncome > 0 ? totalEMI / monthlyIncome : 0;
    const paymentHistory = applicantData?.credit?.payment_history?.on_time_payment_ratio || 0;
    const employment = applicantData?.income?.income_statement?.salary_slips?.employment_type || 'Unknown';
    
    return {
      creditScore,
      dtiRatio,
      paymentHistory,
      employment,
      monthlyIncome,
      totalEMI
    };
  }

  // SHAP-style marginal contribution calculations
  calculateCreditScoreContribution(creditScore) {
    // Population average credit score: 650
    const avgCreditScore = 650;
    const scoreDiff = creditScore - avgCreditScore;
    
    // Non-linear contribution based on score ranges
    if (creditScore >= 750) {
      return -15 + (scoreDiff - 100) * 0.05; // Excellent scores reduce risk significantly
    } else if (creditScore >= 650) {
      return scoreDiff * -0.08; // Good scores reduce risk moderately
    } else if (creditScore >= 600) {
      return scoreDiff * -0.12; // Fair scores have higher impact
    } else {
      return scoreDiff * -0.15 + 5; // Poor scores increase risk substantially
    }
  }

  calculateDTIContribution(dtiRatio) {
    // Population average DTI: 35%
    const avgDTI = 0.35;
    const dtiDiff = dtiRatio - avgDTI;
    
    if (dtiRatio > 0.6) {
      return 25 + (dtiDiff - 0.25) * 40; // Very high DTI
    } else if (dtiRatio > 0.4) {
      return dtiDiff * 30; // Moderate to high DTI
    } else if (dtiRatio > 0.2) {
      return dtiDiff * 20; // Normal DTI range
    } else {
      return dtiDiff * 15 - 3; // Very low DTI is beneficial
    }
  }

  calculatePaymentHistoryContribution(paymentHistory) {
    // Population average payment history: 85%
    const avgPaymentHistory = 0.85;
    const historyDiff = paymentHistory - avgPaymentHistory;
    
    if (paymentHistory >= 0.95) {
      return historyDiff * -25 - 5; // Excellent history
    } else if (paymentHistory >= 0.85) {
      return historyDiff * -20; // Good history
    } else if (paymentHistory >= 0.75) {
      return historyDiff * -15 + 3; // Fair history
    } else {
      return historyDiff * -10 + 8; // Poor history
    }
  }

  calculateEmploymentContribution(employment) {
    const employmentScores = {
      'Permanent': -3,
      'Contract': 2,
      'Self Employed': 4,
      'Unknown': 1
    };
    
    return employmentScores[employment] || 1;
  }

  generateExplanation(shapValues, features) {
    const sortedContributions = Object.entries(shapValues)
      .map(([feature, value]) => ({
        feature: this.getFeatureName(feature),
        contribution: value,
        value: this.getFeatureDisplayValue(feature, features),
        impact: value > 0 ? 'NEGATIVE' : 'POSITIVE'
      }))
      .sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution));

    return {
      primaryFactors: sortedContributions,
      topPositive: sortedContributions.filter(f => f.impact === 'POSITIVE')[0],
      topNegative: sortedContributions.filter(f => f.impact === 'NEGATIVE')[0],
      summary: this.generateSummary(sortedContributions)
    };
  }

  getFeatureName(feature) {
    const names = {
      creditScore: 'Credit Score',
      dtiRatio: 'Debt-to-Income Ratio',
      paymentHistory: 'Payment History',
      employment: 'Employment Stability'
    };
    return names[feature] || feature;
  }

  getFeatureDisplayValue(feature, features) {
    switch (feature) {
      case 'creditScore':
        return features.creditScore.toString();
      case 'dtiRatio':
        return `${Math.round(features.dtiRatio * 100)}%`;
      case 'paymentHistory':
        return `${Math.round(features.paymentHistory * 100)}%`;
      case 'employment':
        return features.employment;
      default:
        return features[feature];
    }
  }

  generateSummary(contributions) {
    const totalPositive = contributions
      .filter(c => c.impact === 'POSITIVE')
      .reduce((sum, c) => sum + Math.abs(c.contribution), 0);
    
    const totalNegative = contributions
      .filter(c => c.impact === 'NEGATIVE')
      .reduce((sum, c) => sum + Math.abs(c.contribution), 0);

    if (totalPositive > totalNegative) {
      return `Strong positive factors (${totalPositive.toFixed(1)} points) outweigh negative factors (${totalNegative.toFixed(1)} points)`;
    } else {
      return `Negative factors (${totalNegative.toFixed(1)} points) outweigh positive factors (${totalPositive.toFixed(1)} points)`;
    }
  }

  // Generate counterfactual explanations (what-if scenarios)
  generateCounterfactuals(applicantData) {
    const baseShap = this.calculateSHAPValues(applicantData);
    const scenarios = [];

    // Scenario 1: Improve credit score by 50 points
    const improvedCredit = JSON.parse(JSON.stringify(applicantData));
    improvedCredit.credit.credit_score.score = Math.min(850, baseShap.features.creditScore + 50);
    const creditScenario = this.calculateSHAPValues(improvedCredit);
    scenarios.push({
      name: 'Improve Credit Score by 50 points',
      change: `${baseShap.features.creditScore} → ${improvedCredit.credit.credit_score.score}`,
      oldRisk: baseShap.prediction,
      newRisk: creditScenario.prediction,
      impact: baseShap.prediction - creditScenario.prediction,
      feasible: true
    });

    // Scenario 2: Reduce DTI by 10%
    const reducedDTI = JSON.parse(JSON.stringify(applicantData));
    const newEMI = baseShap.features.totalEMI * 0.9;
    if (reducedDTI.loan?.loan_repayment_history?.active_loans) {
      const ratio = newEMI / baseShap.features.totalEMI;
      reducedDTI.loan.loan_repayment_history.active_loans.forEach(loan => {
        loan.emi_amount = Math.round((loan.emi_amount || 0) * ratio);
      });
    }
    const dtiScenario = this.calculateSHAPValues(reducedDTI);
    scenarios.push({
      name: 'Reduce existing debt by 10%',
      change: `${Math.round(baseShap.features.dtiRatio * 100)}% → ${Math.round(dtiScenario.features.dtiRatio * 100)}% DTI`,
      oldRisk: baseShap.prediction,
      newRisk: dtiScenario.prediction,
      impact: baseShap.prediction - dtiScenario.prediction,
      feasible: true
    });

    // Scenario 3: Perfect payment history
    const perfectPayments = JSON.parse(JSON.stringify(applicantData));
    perfectPayments.credit.payment_history.on_time_payment_ratio = 1.0;
    const paymentScenario = this.calculateSHAPValues(perfectPayments);
    scenarios.push({
      name: 'Achieve perfect payment history',
      change: `${Math.round(baseShap.features.paymentHistory * 100)}% → 100%`,
      oldRisk: baseShap.prediction,
      newRisk: paymentScenario.prediction,
      impact: baseShap.prediction - paymentScenario.prediction,
      feasible: baseShap.features.paymentHistory < 1.0
    });

    return scenarios.filter(s => s.feasible && Math.abs(s.impact) > 1);
  }
}

export default SHAPExplainer;