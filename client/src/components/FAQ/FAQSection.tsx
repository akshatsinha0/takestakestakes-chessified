import { useState } from 'react';
import './FAQSection.css';

const FAQSection = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const faqItems = [
    {
      question: "How does your Elo rating system work?",
      answer: "Our advanced Elo system calculates ratings based on opponent skill level, game outcome, and time control. Wins against higher-rated players increase your rating more significantly, while losses have minimal impact when playing against grandmaster-level opponents."
    },
    {
      question: "What security measures protect my account?",
      answer: "We use military-grade 256-bit encryption, two-factor authentication, and AI-powered anomaly detection to prevent unauthorized access. All games are protected by anti-cheat algorithms that analyze move patterns in real-time."
    },
    {
      question: "Can I analyze my games with AI?",
      answer: "Yes! Our integrated neural network (TakesNet) provides deep analysis of your games, highlighting tactical misses and suggesting strategic improvements. Premium members get access to grandmaster-level analysis."
    },
    {
      question: "How do tournaments work?",
      answer: "We host daily automated tournaments with different time controls and rating brackets. Our championship system features a unique triple-elimination format with dynamic prize pools based on participant skill levels."
    }
  ];

  return (
    <section className="faq-section">
      <h2 className="faq-title">Strategic Insights Hub</h2>
      <div className="faq-container">
        {faqItems.map((item, index) => (
          <div 
            className={`faq-item ${openIndex === index ? 'open' : ''}`}
            key={index}
          >
            <button 
              className="faq-question"
              onClick={() => setOpenIndex(openIndex === index ? null : index)}
              aria-expanded={openIndex === index}
            >
              <span className="question-text">{item.question}</span>
              <div className="icon-container">
                <div className="icon-line horizontal"></div>
                <div className="icon-line vertical"></div>
              </div>
            </button>
            <div className="faq-answer">
              <div className="answer-content">
                {item.answer}
                <div className="particle-effect">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="particle" />
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default FAQSection;
