# Loan Analysis Dataset

## Overview
This dataset contains synthetic financial profiles for loan risk assessment and creditworthiness analysis. Each folder represents a different customer profile with varying risk levels.

## Dataset Structure

Each customer profile contains 4 JSON files:

### 1. credit_report.json
- **Personal Information**: Name, PAN, Aadhar, DOB
- **Credit Score**: Current score and rating (300-850 range)
- **Credit Cards**: Limits, utilization, status
- **Loans**: Active loans with EMI details
- **Payment History**: Missed payments and on-time ratio
- **Credit Inquiries**: Recent credit applications

### 2. income_report.json
- **Salary Information**: Monthly income, deductions, net pay
- **Business Income**: Self-employment details if applicable
- **Tax Returns**: ITR filing status and income sources
- **Investment Portfolio**: Mutual funds, FDs, stocks, real estate

### 3. loan_report.json
- **Active Loans**: Current loan details with repayment history
- **Closed Loans**: Previously paid loans
- **Payment Behavior**: On-time vs missed payments
- **Prepayment History**: Early payment patterns
- **Credit Utilization**: Overall debt-to-limit ratio

### 4. transaction_log_report.json
- **Spending Patterns**: Merchant categories and frequencies
- **Utility Payments**: Bill payment behavior and delays
- **Monthly Breakdowns**: Detailed payment history
- **Usage Trends**: Spending pattern analysis

## Customer Profiles

- **Dataset 1**: Baseline profile (Good credit, stable income)
- **Dataset 2**: Excellent profile (High score, premium income)
- **Dataset 3**: Poor profile (Low score, payment defaults)
- **Dataset 4**: New to credit (Limited history, young professional)
- **Dataset 5**: High risk (Very poor score, NPA loans)
- **Dataset 6**: Average profile (Mixed signals, moderate risk)

## Use Cases

### Loan Approval Analysis
- Credit score assessment
- Income verification
- Debt-to-income ratio calculation
- Payment history evaluation

### Risk Scoring
- Default probability prediction
- Credit limit determination
- Interest rate pricing
- Loan tenure decisions

### Behavioral Analysis
- Spending pattern recognition
- Payment discipline assessment
- Financial stability indicators
- Cash flow analysis

## Key Metrics

- **Credit Score Range**: 520-820
- **Income Levels**: ₹33K-₹150K monthly
- **Loan Amounts**: ₹80K-₹5M
- **Utilization Ratios**: 0%-100%
- **Payment Ratios**: 45%-100% on-time

## Data Quality
All data is synthetically generated for testing and development purposes. Patterns reflect real-world financial behaviors across different risk segments.