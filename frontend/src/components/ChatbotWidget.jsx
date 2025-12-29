import React, { useState, useRef, useEffect } from 'react';
import './ChatbotWidget.css';
import MessageList from './MessageList';
import InputArea from './InputArea';
import LanguageChip from './LanguageChip';
import { chatAPI } from "./services/api";

const ChatbotWidget = ({ theme = {}, isPremium = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const [currentLanguage, setCurrentLanguage] = useState('en');
  const [languageMode, setLanguageMode] = useState('single');
  const [allowedLanguages, setAllowedLanguages] = useState(null);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Initialize with welcome message
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([
        {
          id: 'welcome',
          role: 'assistant',
          content: "Hello! I'm here to help you with reservations, orders, and any questions you might have. How can I assist you today?",
          timestamp: new Date(),
        },
      ]);
    }
  }, [isOpen]);

  const handleSendMessage = async (message, languageOverride = null) => {
    if (!message.trim()) return;

    // Add user message
    const userMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: message,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      // Mock API call with language override if provided
      const response = await chatAPI({ message, conversationId, languageOverride, languageOnly });
      
      setConversationId(response.conversationId);

      // Update language info from response
      if (response.language) {
        setCurrentLanguage(response.language);
      }
      if (response.languageMode) {
        setLanguageMode(response.languageMode);
      }
      if (response.allowedLanguages) {
        setAllowedLanguages(response.allowedLanguages);
      }

      // Add assistant response
      const assistantMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: response.message,
        toolCalls: response.toolCalls,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage = {
        id: `error-${Date.now()}`,
        role: 'error',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAudioTranscription = async (transcription) => {
    await handleSendMessage(transcription);
  };

  const handleVideoClick = () => {
    // Video functionality will be implemented later
    console.log('Video button clicked');
  };

  const handleLanguageChange = async (newLanguage) => {
    if (newLanguage === currentLanguage) return;

    try {
      // Call language change endpoint with empty message and languageOverride
      const response = await chatAPI('', conversationId, newLanguage, true); // true = languageOnly
      
      if (response.language) {
        setCurrentLanguage(response.language);
      }

      // Add system message
      if (response.systemMessage) {
        const systemMessage = {
          id: `system-${Date.now()}`,
          role: 'system',
          content: response.message,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, systemMessage]);
      }
    } catch (error) {
      console.error('Failed to change language:', error);
      const errorMessage = {
        id: `error-${Date.now()}`,
        role: 'error',
        content: 'Failed to change language. Please try again.',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    }
  };

  const mergedTheme = {
    primaryColor: theme.primaryColor || '#667eea',
    secondaryColor: theme.secondaryColor || '#764ba2',
    borderRadius: theme.borderRadius || '20px',
    backgroundColor: theme.backgroundColor || 'rgba(255, 255, 255, 0.95)',
    textColor: theme.textColor || '#1a1a1a',
    assistantMessageColor: theme.assistantMessageColor || '#f0f0f0',
    userMessageColor: theme.userMessageColor || '#667eea',
  };

  return (
    <div className="chatbot-widget-container">
      {/* Toggle Button */}
      {!isOpen && (
        <button
          className="chatbot-toggle-button"
          onClick={() => setIsOpen(true)}
          style={{
            '--primary-color': mergedTheme.primaryColor,
            '--secondary-color': mergedTheme.secondaryColor,
            '--border-radius': mergedTheme.borderRadius,
          }}
          aria-label="Open chatbot"
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M20 2H4C2.9 2 2 2.9 2 4V22L6 18H20C21.1 18 22 17.1 22 16V4C22 2.9 21.1 2 20 2Z"
              fill="currentColor"
            />
          </svg>
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div
          className="chatbot-window"
          style={{
            '--primary-color': mergedTheme.primaryColor,
            '--secondary-color': mergedTheme.secondaryColor,
            '--border-radius': mergedTheme.borderRadius,
            '--background-color': mergedTheme.backgroundColor,
            '--text-color': mergedTheme.textColor,
            '--assistant-message-color': mergedTheme.assistantMessageColor,
            '--user-message-color': mergedTheme.userMessageColor,
          }}
        >
          {/* Header */}
          <div className="chatbot-header">
            <div className="chatbot-header-content">
              <div className="chatbot-header-avatar">
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 5C13.66 5 15 6.34 15 8C15 9.66 13.66 11 12 11C10.34 11 9 9.66 9 8C9 6.34 10.34 5 12 5ZM12 19.2C9.5 19.2 7.29 17.92 6 15.98C6.03 13.99 10 12.9 12 12.9C13.99 12.9 17.97 13.99 18 15.98C16.71 17.92 14.5 19.2 12 19.2Z"
                    fill="currentColor"
                  />
                </svg>
              </div>
              <div className="chatbot-header-text">
                <h3>AI Assistant</h3>
                <p>We're here to help</p>
              </div>
            </div>
            <div className="chatbot-header-actions">
              <LanguageChip
                currentLanguage={currentLanguage}
                languageMode={languageMode}
                allowedLanguages={allowedLanguages}
                onLanguageChange={handleLanguageChange}
                theme={mergedTheme}
                isPremium={isPremium}
              />
              <button
                className="chatbot-close-button"
                onClick={() => setIsOpen(false)}
                aria-label="Close chatbot"
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 20 20"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M15 5L5 15M5 5L15 15"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="chatbot-messages">
            <MessageList messages={messages} isLoading={isLoading} />
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <InputArea
            onSendMessage={handleSendMessage}
            onAudioTranscription={handleAudioTranscription}
            onVideoClick={handleVideoClick}
            isLoading={isLoading}
            theme={mergedTheme}
          />
        </div>
      )}
    </div>
  );
};

export default ChatbotWidget;

