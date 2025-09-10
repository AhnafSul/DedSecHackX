import React, { useState, useRef, useEffect } from 'react';
import AWSNovaService from '../services/AWSNovaService';

const ChatBot = ({ applicantData, analysisResults, isOpen, onClose }) => {
  const [messages, setMessages] = useState([
    {
      type: 'bot',
      content: `Hi! I'm your AI loan advisor. I've analyzed ${applicantData?.credit?.personal_info?.name || 'this applicant'}'s financial profile. Ask me anything about their loan eligibility, risk factors, or financial health!`,
      timestamp: new Date()
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationContext, setConversationContext] = useState({});
  const messagesEndRef = useRef(null);
  const novaService = useRef(new AWSNovaService());

  // Test connection immediately when chatbot opens
  useEffect(() => {
    if (isOpen) {
      testConnection();
    }
  }, [isOpen]);

  const testConnection = async () => {
    if (!novaService.current.apiKey) {
      novaService.current.connectionStatus = 'no-key';
      return;
    }
    
    try {
      const response = await fetch('https://bedrock-runtime.us-east-1.amazonaws.com/model/amazon.nova-pro-v1:0/invoke', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${novaService.current.apiKey}`
        },
        body: JSON.stringify({
          messages: [{ role: 'user', content: [{ text: 'hi' }] }],
          inferenceConfig: { maxTokens: 5, temperature: 0.1 }
        })
      });
      
      if (response.ok) {
        novaService.current.connectionStatus = 'connected';
        novaService.current.showConnectionNotification();
      } else {
        novaService.current.connectionStatus = 'failed';
      }
    } catch (error) {
      novaService.current.connectionStatus = 'failed';
    }
  };

  const suggestedQuestions = [
    "Why was this loan approved/rejected?",
    "What if my salary goes up by 20%?",
    "If I reduce debt by ₹15,000, will I get approved?",
    "Is their DTI ratio concerning?",
    "What happens to my DTI?",
    "Will I still get the loan?",
    "What if they increase their income by 25%?",
    "How would reducing debt by ₹10,000 help?",
    "What credit score do they need for approval?",
    "Can they get a co-signer to improve chances?"
  ];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (message) => {
    if (!message.trim()) return;

    // Retry connection in background until successful
    if (!novaService.current.connectionStatus || novaService.current.connectionStatus === 'failed') {
      const botMessage = {
        type: 'bot',
        content: "🔄 Connecting to AI service...",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, botMessage]);
      
      // Quick retry without delays
      for (let i = 0; i < 2; i++) {
        await testConnection();
        if (novaService.current.connectionStatus === 'connected') {
          break;
        }
      }
      
      if (novaService.current.connectionStatus !== 'connected') {
        const errorMessage = {
          type: 'bot',
          content: "⚠️ Connection failed. Please try again.",
          timestamp: new Date()
        };
        setMessages(prev => [...prev, errorMessage]);
        setIsLoading(false);
        return;
      }
      
      // Remove connecting message and continue with actual request
      setMessages(prev => prev.slice(0, -1));
    }

    const userMessage = {
      type: 'user',
      content: message,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const context = {
        personalInfo: {
          name: applicantData?.credit?.personal_info?.name,
          age: applicantData?.credit?.personal_info?.dob ? 
            new Date().getFullYear() - new Date(applicantData.credit.personal_info.dob).getFullYear() : null,
          employment: applicantData?.income?.income_statement?.salary_slips?.current_designation,
          employmentType: applicantData?.income?.income_statement?.salary_slips?.employment_type
        },
        financialInfo: {
          monthlyIncome: applicantData?.income?.income_statement?.salary_slips?.monthly_income,
          netIncome: applicantData?.income?.income_statement?.salary_slips?.net_income,
          creditScore: applicantData?.credit?.credit_score?.score,
          creditRating: applicantData?.credit?.credit_score?.rating,
          dtiRatio: (() => {
            const monthlyIncome = applicantData?.income?.income_statement?.salary_slips?.monthly_income || 0;
            const totalEMI = applicantData?.loan?.loan_repayment_history?.active_loans?.reduce((sum, loan) => sum + (loan.emi_amount || 0), 0) || 0;
            const dtiRatio = monthlyIncome > 0 ? Math.round((totalEMI / monthlyIncome) * 100) : 0;
            return dtiRatio;
          })(),
          totalEMI: applicantData?.loan?.loan_repayment_history?.active_loans?.reduce((sum, loan) => sum + (loan.emi_amount || 0), 0),
          paymentHistory: applicantData?.credit?.payment_history?.on_time_payment_ratio,
          missedPayments: applicantData?.credit?.payment_history?.missed_payments,
          creditUtilization: (() => {
            const cards = applicantData?.credit?.credit_cards || [];
            if (cards.length === 0) return 0;
            const totalUsed = cards.reduce((sum, card) => sum + ((card.limit || 0) * (card.utilization_ratio || 0)), 0);
            const totalLimit = cards.reduce((sum, card) => sum + (card.limit || 0), 0);
            return totalLimit > 0 ? totalUsed / totalLimit : 0;
          })(),
          creditInquiries: applicantData?.credit?.credit_inquiries || [],
          activeLoans: applicantData?.loan?.loan_repayment_history?.active_loans || [],
          creditCards: applicantData?.credit?.credit_cards || [],
          employmentType: applicantData?.income?.income_statement?.salary_slips?.employment_type,
          employer: applicantData?.income?.income_statement?.salary_slips?.employer,
          itrFiled: applicantData?.income?.income_statement?.tax_returns?.itr_filed,
          totalAssets: (() => {
            const investments = applicantData?.income?.income_statement?.investment_portfolio;
            let total = 0;
            if (investments?.mutual_funds) total += investments.mutual_funds.reduce((sum, fund) => sum + (fund.current_value || 0), 0);
            if (investments?.fixed_deposits) total += investments.fixed_deposits.reduce((sum, fd) => sum + (fd.amount || 0), 0);
            if (investments?.stocks) total += investments.stocks.reduce((sum, stock) => sum + ((stock.quantity || 0) * (stock.current_price || 0)), 0);
            return total;
          })(),
          rentalIncome: applicantData?.income?.income_statement?.investment_portfolio?.real_estate_income?.monthly_rent || 0,
          monthlySpending: (() => {
            const income = applicantData?.income?.income_statement?.salary_slips?.monthly_income || 0;
            const emi = applicantData?.loan?.loan_repayment_history?.active_loans?.reduce((sum, loan) => sum + (loan.emi_amount || 0), 0) || 0;
            const availableForSpending = Math.max(0, income - emi);
            const actualSpending = applicantData?.transaction?.transaction_logs?.reduce((sum, txn) => sum + (txn.total_amount || 0), 0) || 0;
            // Use realistic spending (70% of available income after EMI)
            return Math.min(actualSpending, Math.round(availableForSpending * 0.7));
          })(),
          spendingBreakdown: (() => {
            const transactions = applicantData?.transaction?.transaction_logs || [];
            const breakdown = {
              'Groceries': 0,
              'E-commerce': 0,
              'Ride-Hailing': 0,
              'Food Delivery': 0,
              'Telecom': 0,
              'Electricity': 0,
              'Water': 0,
              'Internet': 0
            };
            transactions.forEach(txn => {
              const category = txn.category || txn.merchant;
              breakdown[category] = (breakdown[category] || 0) + (txn.total_amount || 0);
            });
            return breakdown;
          })(),
          ecommerceSpending: applicantData?.transaction?.ecommerce_activity?.total_spent || 0,
          rideDeliverySpending: (applicantData?.transaction?.ride_delivery_usage?.ride_hailing?.total_spent || 0) + (applicantData?.transaction?.ride_delivery_usage?.food_delivery?.total_spent || 0),
          mobileAppSpending: applicantData?.transaction?.mobile_app_spending?.telecom_recharge?.total_spent || 0,
          utilityPayments: (() => {
            const utilities = applicantData?.transaction?.utility_payments?.monthly_breakdown || [];
            let onTime = 0, delayed = 0, missed = 0;
            utilities.forEach(month => {
              Object.values(month).forEach(utility => {
                if (typeof utility === 'object') {
                  if (utility.missed_payment) missed++;
                  else if (utility.delay_days > 0) delayed++;
                  else onTime++;
                }
              });
            });
            return { onTime, delayed, missed };
          })(),
          deductions: {
            pf: applicantData?.income?.income_statement?.salary_slips?.deductions?.pf || 0,
            tax: applicantData?.income?.income_statement?.salary_slips?.deductions?.tax || 0,
            other: applicantData?.income?.income_statement?.salary_slips?.deductions?.other || 0
          }
        },
        loanDecision: {
          recommendation: analysisResults?.recommendation,
          riskScore: analysisResults?.riskScore,
          reasoning: analysisResults?.reasoning
        }
      };

      // Check for scenario modifications in conversation context
      const currentIncome = conversationContext.modifiedIncome || context.financialInfo.monthlyIncome;
      const currentEMI = conversationContext.modifiedEMI || context.financialInfo.totalEMI;
      const currentDTI = currentIncome > 0 ? Math.round((currentEMI / currentIncome) * 100) : 0;
      const currentCreditScore = conversationContext.modifiedCreditScore || context.financialInfo.creditScore;
      
      // Detect scenario changes in current message
      const incomeChangeMatch = message.match(/salary|income.*?(?:increase|goes?|rise).*?(\d+)%/i) || message.match(/(\d+)%.*?(?:increase|rise).*?(?:salary|income)/i);
      const debtChangeMatch = message.match(/(?:reduce|pay.*?down|lower).*?debt.*?(\d+)/i) || message.match(/debt.*?(?:reduce|pay.*?down|lower).*?(\d+)/i);
      const creditChangeMatch = message.match(/credit.*?score.*?(\d+)/i) || message.match(/(\d+).*?credit.*?score/i);
      
      if (incomeChangeMatch) {
        const percentage = parseInt(incomeChangeMatch[1]);
        const newIncome = Math.round(context.financialInfo.monthlyIncome * (1 + percentage/100));
        setConversationContext(prev => ({...prev, modifiedIncome: newIncome, lastChange: `income increased by ${percentage}%`}));
      }
      
      if (debtChangeMatch) {
        const amount = parseInt(debtChangeMatch[1]);
        const newEMI = Math.max(0, context.financialInfo.totalEMI - amount);
        setConversationContext(prev => ({...prev, modifiedEMI: newEMI, lastChange: `debt reduced by ₹${amount}`}));
      }
      
      if (creditChangeMatch) {
        const newScore = parseInt(creditChangeMatch[1]);
        setConversationContext(prev => ({...prev, modifiedCreditScore: newScore, lastChange: `credit score changed to ${newScore}`}));
      }

      const prompt = `You are ${context.personalInfo.name}'s loan advisor. Give consistent, data-driven answers.

COMPLETE PROFILE:
PERSONAL: ${context.personalInfo.name}, Age ${context.personalInfo.age}, ${context.financialInfo.employmentType} at ${context.financialInfo.employer}
FINANCIAL: Income Rs ${currentIncome?.toLocaleString()}, EMI Rs ${currentEMI?.toLocaleString()}, DTI ${currentDTI}%
CREDIT: Score ${currentCreditScore} (${context.financialInfo.creditRating}), Payment History ${Math.round((context.financialInfo.paymentHistory || 0) * 100)}%, Missed ${context.financialInfo.missedPayments || 0} payments
CARDS: ${context.financialInfo.creditCards?.length || 0} cards, ${Math.round((context.financialInfo.creditUtilization || 0) * 100)}% utilization
LOANS: ${context.financialInfo.activeLoans?.length || 0} active loans
ASSETS: Rs ${context.financialInfo.totalAssets?.toLocaleString() || 0} investments, Rs ${context.financialInfo.rentalIncome?.toLocaleString() || 0} rental
SPENDING: Total Rs ${context.financialInfo.monthlySpending?.toLocaleString()}, Groceries Rs ${context.financialInfo.spendingBreakdown?.['Groceries'] || 0}, E-commerce Rs ${context.financialInfo.ecommerceSpending || 0}, Food Rs ${context.financialInfo.spendingBreakdown?.['Food Delivery'] || 0}, Ride Rs ${context.financialInfo.spendingBreakdown?.['Ride-Hailing'] || 0}, Utilities Rs ${(context.financialInfo.spendingBreakdown?.['Electricity'] || 0) + (context.financialInfo.spendingBreakdown?.['Water'] || 0) + (context.financialInfo.spendingBreakdown?.['Internet'] || 0)}
UTILITIES: ${context.financialInfo.utilityPayments?.onTime || 0} on-time, ${context.financialInfo.utilityPayments?.delayed || 0} delayed
DEDUCTIONS: PF Rs ${context.financialInfo.deductions?.pf || 0}, Tax Rs ${context.financialInfo.deductions?.tax || 0}
STATUS: ${(currentCreditScore >= 650 && currentDTI <= 40) ? 'LOAN APPROVED' : 'LOAN REJECTED'}

RULES:
- Always refer to specific data from above
- DTI = EMI ÷ Income only
- Be consistent in calculations
- Keep responses 2-3 sentences
- Temperature 0.1 for consistency

QUESTION: ${message}`;

      // Build conversation history for context
      const conversationHistory = messages.slice(-4).map(msg => ({
        role: msg.type === 'user' ? 'user' : 'assistant',
        content: [{ text: msg.content }]
      }));
      
      // Add previous context to current question
      const lastUserMessage = messages.filter(m => m.type === 'user').slice(-1)[0];
      const contextualPrompt = lastUserMessage ? 
        `Previous question: "${lastUserMessage.content}"
Current question: "${message}"

${prompt}` : prompt;
      
      conversationHistory.push({
        role: 'user',
        content: [{ text: contextualPrompt }]
      });

      const response = await fetch('https://bedrock-runtime.us-east-1.amazonaws.com/model/amazon.nova-pro-v1:0/invoke', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${novaService.current.apiKey}`
        },
        body: JSON.stringify({
          messages: conversationHistory,
          inferenceConfig: {
            maxTokens: 130,
            temperature: 0.1
          }
        })
      });

      let botResponse = "Sorry, I'm having connection issues. Let me try to reconnect...";

      if (response.ok) {
        if (!novaService.current.connectionStatus) {
          novaService.current.connectionStatus = 'connected';
          novaService.current.showConnectionNotification();
        }
        const result = await response.json();
        botResponse = result.output?.message?.content?.[0]?.text || botResponse;
      }

      const botMessage = {
        type: 'bot',
        content: botResponse,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      const errorMessage = {
        type: 'bot',
        content: "I encountered an error while processing your question. Please try again.",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-4 right-4 w-96 h-[600px] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col z-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-4 rounded-t-2xl flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className="text-2xl">🤖</span>
          <div>
            <h3 className="font-semibold">AI Loan Advisor</h3>
            <p className="text-xs text-blue-100">Ask about {applicantData?.credit?.personal_info?.name}'s profile</p>
          </div>
        </div>
        <button 
          onClick={onClose}
          className="text-white hover:text-gray-200 text-xl"
        >
          ×
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((message, index) => (
          <div key={index} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] p-3 rounded-lg ${
              message.type === 'user' 
                ? 'bg-blue-500 text-white rounded-br-none' 
                : 'bg-gray-100 text-gray-800 rounded-bl-none'
            }`}>
              <div className="text-sm whitespace-pre-wrap">
                {message.content.split('\n').map((line, i) => (
                  <p key={i} className={line.trim() === '' ? 'mb-2' : 'mb-1'}>
                    {line.replace(/\*+/g, '').replace(/\*\*(.*?)\*\*/g, '$1').replace(/###\s*(.*)/g, '$1').replace(/^[•\-\*]\s*/g, '')}
                  </p>
                ))}
              </div>
              <p className="text-xs opacity-70 mt-1">
                {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 p-3 rounded-lg rounded-bl-none">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Questions */}
      <div className="p-3 border-t border-gray-200">
        <p className="text-xs text-gray-600 mb-2">💡 Ask me about:</p>
        <div className="grid grid-cols-2 gap-1 mb-2">
          {suggestedQuestions.slice(0, 4).map((question, index) => (
            <button
              key={index}
              onClick={() => handleSendMessage(question)}
              className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-full hover:bg-blue-100 transition-colors text-left"
              disabled={isLoading}
            >
              {question.length > 25 ? question.substring(0, 25) + '...' : question}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-1">
          {suggestedQuestions.slice(4, 6).map((question, index) => (
            <button
              key={index + 4}
              onClick={() => handleSendMessage(question)}
              className="text-xs bg-purple-50 text-purple-700 px-2 py-1 rounded-full hover:bg-purple-100 transition-colors"
              disabled={isLoading}
            >
              {question.length > 30 ? question.substring(0, 30) + '...' : question}
            </button>
          ))}
        </div>
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex space-x-2">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage(inputMessage)}
            placeholder="Ask about this applicant..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            disabled={isLoading}
          />
          <button
            onClick={() => handleSendMessage(inputMessage)}
            disabled={isLoading || !inputMessage.trim()}
            className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="text-sm">📤</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatBot;