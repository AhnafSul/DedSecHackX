// Dynamic data loader for all applicants
import dataset1Credit from './1/credit_report.json';
import dataset1Income from './1/income_report.json';
import dataset1Loan from './1/loan_report.json';
import dataset1Transaction from './1/transaction_log_report.json';

import dataset2Credit from './2/credit_report.json';
import dataset2Income from './2/income_report.json';
import dataset2Loan from './2/loan_report.json';
import dataset2Transaction from './2/transaction_log_report.json';

import dataset3Credit from './3/credit_report.json';
import dataset3Income from './3/income_report.json';
import dataset3Loan from './3/loan_report.json';
import dataset3Transaction from './3/transaction_log_report.json';

import dataset4Credit from './4/credit_report.json';
import dataset4Income from './4/income_report.json';
import dataset4Loan from './4/loan_report.json';
import dataset4Transaction from './4/transaction_log_report.json';

import dataset5Credit from './5/credit_report.json';
import dataset5Income from './5/income_report.json';
import dataset5Loan from './5/loan_report.json';
import dataset5Transaction from './5/transaction_log_report.json';

import dataset6Credit from './6/credit_report.json';
import dataset6Income from './6/income_report.json';
import dataset6Loan from './6/loan_report.json';
import dataset6Transaction from './6/transaction_log_report.json';

// Combine all datasets
export const allApplicants = {
  1: {
    credit: dataset1Credit,
    income: dataset1Income,
    loan: dataset1Loan,
    transaction: dataset1Transaction
  },
  2: {
    credit: dataset2Credit,
    income: dataset2Income,
    loan: dataset2Loan,
    transaction: dataset2Transaction
  },
  3: {
    credit: dataset3Credit,
    income: dataset3Income,
    loan: dataset3Loan,
    transaction: dataset3Transaction
  },
  4: {
    credit: dataset4Credit,
    income: dataset4Income,
    loan: dataset4Loan,
    transaction: dataset4Transaction
  },
  5: {
    credit: dataset5Credit,
    income: dataset5Income,
    loan: dataset5Loan,
    transaction: dataset5Transaction
  },
  6: {
    credit: dataset6Credit,
    income: dataset6Income,
    loan: dataset6Loan,
    transaction: dataset6Transaction
  }
};

// Get applicant summary for selection
export const getApplicantSummary = (id) => {
  const data = allApplicants[id];
  if (!data) return null;
  
  return {
    id,
    name: data.credit.personal_info.name,
    age: new Date().getFullYear() - new Date(data.credit.personal_info.dob).getFullYear(),
    creditScore: data.credit.credit_score.score,
    monthlyIncome: data.income.income_statement.salary_slips.monthly_income,
    employment: data.income.income_statement.salary_slips.current_designation,
    riskLevel: getRiskLevel(data.credit.credit_score.score)
  };
};

// Get all applicant summaries
export const getAllApplicantSummaries = () => {
  return Object.keys(allApplicants).map(id => getApplicantSummary(parseInt(id)));
};

// Helper function to determine risk level
const getRiskLevel = (creditScore) => {
  if (creditScore >= 800) return 'Excellent';
  if (creditScore >= 750) return 'Good';
  if (creditScore >= 650) return 'Fair';
  if (creditScore >= 550) return 'Poor';
  return 'Very Poor';
};

// Get complete applicant data
export const getApplicantData = (id) => {
  return allApplicants[id];
};