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
  const messagesEndRef = useRef(null);
  const novaService = useRef(new AWSNovaService());

  const suggestedQuestions = [
    "Why was this loan approved/rejected?",
    "What are the main risk factors?",
    "How can they improve their credit score?",
    "Is their DTI ratio concerning?",
    "What's their repayment capacity?",
    "How does their employment affect the decision?",
    "What if they increase their income by 20%?",
    "How would reducing debt by ₹10,000 help?",
    "What credit score do they need for approval?",
    "Can they get a co-signer to improve chances?"
  ];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (message) => {
    if (!message.trim()) return;

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
          creditScore: applicantData?.credit?.credit_score?.score,
          dtiRatio: analysisResults?.keyFactors?.dtiRatio,
          totalEMI: applicantData?.loan?.loan_repayment_history?.active_loans?.reduce((sum, loan) => sum + (loan.emi_amount || 0), 0),
          paymentHistory: applicantData?.credit?.payment_history?.on_time_payment_ratio,
          creditUtilization: applicantData?.credit?.credit_cards?.[0]?.utilization_ratio,
          creditInquiries: applicantData?.credit?.credit_inquiries || [],
          activeLoans: applicantData?.loan?.loan_repayment_history?.active_loans || [],
          creditCards: applicantData?.credit?.credit_cards || []
        },
        loanDecision: {
          recommendation: analysisResults?.recommendation,
          riskScore: analysisResults?.riskScore,
          reasoning: analysisResults?.reasoning
        }
      };

      const prompt = `You are a friendly AI loan advisor with explainable AI capabilities, chatting about ${context.personalInfo.name}'s loan application. 

KEY INFO:
• ${context.personalInfo.name}, ${context.personalInfo.age} years old
• Works as ${context.personalInfo.employment} (${context.personalInfo.employmentType})
• Earns ₹${context.financialInfo.monthlyIncome?.toLocaleString()}/month
• Credit Score: ${context.financialInfo.creditScore}
• Current EMIs: ₹${context.financialInfo.totalEMI?.toLocaleString()} (${context.financialInfo.dtiRatio}% of income)
• Payment History: ${(context.financialInfo.paymentHistory * 100).toFixed(1)}% on-time
• Our Decision: ${context.loanDecision.recommendation}
• Risk Score: ${context.loanDecision.riskScore}/100

DETAILED DATA ACCESS:
• Credit Inquiries: ${context.financialInfo.creditInquiries.map(inq => `${inq.inquiry_type} by ${inq.inquirer} on ${inq.inquiry_date}`).join(', ')}
• Active Loans: ${context.financialInfo.activeLoans.map(loan => `${loan.loan_type} - ₹${loan.emi_amount}/month`).join(', ')}
• Credit Cards: ${context.financialInfo.creditCards.map(card => `${card.card_type} (${Math.round(card.utilization_ratio * 100)}% used)`).join(', ')}

EXPLAINABILITY FEATURES:
- Provide specific reasons for decisions with exact thresholds
- Offer what-if scenarios when asked (e.g., "If credit score improves by X points...")
- Give actionable improvement advice with timelines
- Explain how each factor contributes to the final decision
- Use transparency in all explanations

CONDITIONAL APPROVAL GUIDELINES:
- For credit scores 650-749: Loan amount up to 8x monthly income
- Conditions: Maintain current payment record, provide guarantor if amount >₹5L
- Interest rate: 12-15% based on final assessment

QUESTION: "${message}"

RESPOND LIKE AN EXPERT ADVISOR:
- Be conversational but informative
- Provide specific numbers and thresholds
- Offer actionable insights
- Use actual data from their profile
- Keep response under 200 words
- Include what-if scenarios when relevant
- Explain the 'why' behind decisions clearly`;

      // Build conversation history for context
      const conversationHistory = messages.slice(-6).map(msg => ({
        role: msg.type === 'user' ? 'user' : 'assistant',
        content: [{ text: msg.content }]
      }));
      
      // Add current question with context
      conversationHistory.push({
        role: 'user',
        content: [{ text: prompt }]
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
            maxTokens: 800,
            temperature: 0.3
          }
        })
      });

      let botResponse = "I'm having trouble accessing the detailed analysis right now. Please try asking your question again.";

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