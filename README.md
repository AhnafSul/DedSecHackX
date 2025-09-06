# Loan XAI Dashboard

React-based loan decision analysis dashboard with AWS Nova AI integration for explainable AI-powered lending assessments.

## Features

- **Interactive Dashboard**: Clickable cards with detailed modal views for financial metrics
- **Real Data Analysis**: Processes actual JSON datasets (credit reports, income statements, loan histories)
- **AWS Nova AI Integration**: Real-time loan analysis with conversational AI chatbot
- **XAI Components**: Credit score breakdown, DTI analysis, risk assessment with improvement tips
- **Node 12 Compatible**: Uses React 17 and compatible dependencies

## Setup

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Environment Configuration**
   ```bash
   cp .env.example .env
   # Add your AWS Nova API key to .env
   ```

3. **Start Development Server**
   ```bash
   npm start
   ```

## Project Structure

```
src/
├── components/
│   └── ChatBot.js          # AI-powered chatbot
├── data/
│   ├── dataLoader.js       # Dynamic data loader
│   └── [1-6]/              # Applicant datasets
├── services/
│   └── AWSNovaService.js   # AWS Nova AI integration
└── Dashboard.js            # Main dashboard component
```

## Data Format

Each applicant dataset includes:
- `credit_report.json` - Credit score, payment history, credit cards
- `income_report.json` - Salary, investments, tax returns
- `loan_report.json` - Active loans, repayment history
- `transaction_log_report.json` - Transaction patterns, utility payments

## Environment Variables

```
REACT_APP_AWS_NOVA_KEY=your_aws_nova_api_key_here
```

## Tech Stack

- React 17
- AWS Nova Pro AI
- Node.js 12+
- Tailwind CSS (via CDN)