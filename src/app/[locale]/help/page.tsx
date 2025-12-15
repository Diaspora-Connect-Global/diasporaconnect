"use client"
import React, { useState } from 'react';
import { HelpCircle, Mail, ArrowRight, ChevronDown } from 'lucide-react';

const HelpSupportPage: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const supportEmail = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || 'support@example.com';

  interface FAQItem {
    question: string;
    answer: string;
  }

  const faqItems: FAQItem[] = [
    {
      question: "How do I get started?",
      answer: "Getting started is easy! Simply sign up for an account, choose your preferred plan, and follow our guided onboarding process. You'll be up and running in minutes with access to all features included in your plan."
    },
    {
      question: "What payment methods do you accept?",
      answer: "We accept all major credit cards (Visa, Mastercard, American Express), PayPal, and bank transfers for enterprise customers. All payments are processed securely through our encrypted payment gateway."
    },
    {
      question: "Can I cancel my subscription anytime?",
      answer: "Yes, absolutely! You can cancel your subscription at any time from your account settings. There are no cancellation fees, and you'll continue to have access until the end of your current billing period."
    },
    {
      question: "How do I reset my password?",
      answer: "Click on 'Forgot Password' on the login page, enter your email address, and we'll send you a secure link to reset your password. The link is valid for 24 hours for security purposes."
    },
    {
      question: "Is my data secure?",
      answer: "Security is our top priority. We use industry-standard AES-256 encryption, maintain SOC 2 compliance, and regularly conduct security audits. Your data is stored in secure data centers with redundant backups."
    },
    {
      question: "Do you offer refunds?",
      answer: "Yes, we offer a 30-day money-back guarantee for all new subscriptions. If you're not satisfied with our service, contact our support team within 30 days of your purchase for a full refund."
    },
    {
      question: "How can I upgrade my plan?",
      answer: "You can upgrade your plan anytime from your account dashboard. Go to Settings > Billing > Change Plan. The upgrade takes effect immediately, and you'll only pay the prorated difference."
    },
    {
      question: "Do you have a mobile app?",
      answer: "Yes! Our mobile app is available for both iOS and Android devices. Download it from the App Store or Google Play Store. All features are fully synchronized across devices in real-time."
    }
  ];

  const toggleAccordion = (index: number): void => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Hero Section */}
      <div className="px-4 pt-20 pb-16 sm:pt-24 sm:pb-20">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          {/* Icon */}
          <div 
            className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-amber-500/20 to-amber-500/5 animate-[fadeIn_0.6s_ease-out]"
            style={{ animationDelay: '0.1s', animationFillMode: 'backwards' }}
          >
            <HelpCircle className="w-10 h-10 text-amber-500" />
          </div>

          {/* Title */}
          <h1 
            className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white animate-[fadeIn_0.6s_ease-out]"
            style={{ animationDelay: '0.2s', animationFillMode: 'backwards' }}
          >
            Help & <span className="bg-gradient-to-r from-amber-500 to-amber-400 bg-clip-text text-transparent">Support</span>
          </h1>

          {/* Subtitle */}
          <p 
            className="text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto animate-[fadeIn_0.6s_ease-out]"
            style={{ animationDelay: '0.3s', animationFillMode: 'backwards' }}
          >
            Get the answers you need. Browse our FAQ or reach out to our friendly support team.
          </p>
        </div>
      </div>

      {/* FAQ Section */}
      <div className="px-4 py-12 sm:py-16">
        <div className="max-w-3xl mx-auto">
          {/* Section Header */}
          <div className="text-center mb-12 space-y-4">
            <div className="inline-flex items-center px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20">
              <span className="text-sm font-medium text-amber-400">FAQ</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-white">
              Frequently Asked Questions
            </h2>
            <p className="text-slate-400">
              Find quick answers to common questions about our service.
            </p>
          </div>

          {/* Accordion */}
          <div className="space-y-3">
            {faqItems.map((item, index) => (
              <div
                key={index}
                className={`group bg-slate-900/50 border rounded-xl transition-all duration-300 ${
                  openIndex === index
                    ? 'border-amber-500/50 shadow-lg shadow-amber-500/10'
                    : 'border-slate-800 hover:border-slate-700 hover:shadow-lg hover:shadow-slate-900/50'
                }`}
              >
                <button
                  onClick={() => toggleAccordion(index)}
                  className="w-full px-6 py-5 flex items-center justify-between text-left transition-colors"
                >
                  <span className={`font-medium text-base sm:text-lg transition-colors ${
                    openIndex === index ? 'text-amber-400' : 'text-white group-hover:text-amber-400'
                  }`}>
                    {item.question}
                  </span>
                  <ChevronDown
                    className={`w-5 h-5 flex-shrink-0 ml-4 transition-all duration-300 ${
                      openIndex === index
                        ? 'text-amber-400 rotate-180'
                        : 'text-slate-400 group-hover:text-amber-400'
                    }`}
                  />
                </button>
                <div
                  className={`overflow-hidden transition-all duration-300 ${
                    openIndex === index ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                  }`}
                >
                  <div className="px-6 pb-5 text-slate-300 leading-relaxed">
                    {item.answer}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="px-4 py-8">
        <div className="max-w-3xl mx-auto">
          <div className="h-px bg-gradient-to-r from-transparent via-slate-700 to-transparent"></div>
        </div>
      </div>

      {/* Contact Section */}
      <div className="px-4 py-12 pb-20 sm:py-16 sm:pb-24">
        <div className="max-w-2xl mx-auto text-center space-y-8">
          {/* Icon */}
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-500/10">
            <Mail className="w-8 h-8 text-amber-500" />
          </div>

          {/* Content */}
          <div className="space-y-4">
            <h2 className="text-3xl sm:text-4xl font-bold text-white">
              Still have questions?
            </h2>
            <p className="text-lg text-slate-400">
              Can&apos;t find the answer you&apos;re looking for? Our support team is here to help you.
            </p>
          </div>

          {/* CTA Button */}
          <div className="space-y-3">
            <a
              href={`mailto:${supportEmail}`}
              className="group inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-semibold rounded-xl shadow-lg shadow-amber-500/25 hover:shadow-xl hover:shadow-amber-500/40 transition-all duration-300 hover:scale-105"
            >
              <span>{supportEmail}</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" />
            </a>
            <p className="text-sm text-slate-500">
              We typically respond within 24 hours
            </p>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
};

export default HelpSupportPage;