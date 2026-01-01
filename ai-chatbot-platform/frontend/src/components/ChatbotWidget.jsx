import React, { useState, useRef, useEffect } from "react";
import "./ChatbotWidget.css";
import MessageList from "./MessageList";
import InputArea from "./InputArea";
import LanguageChip from "./LanguageChip";
import { chatAPI } from "../services/api.js";

const ChatbotWidget = ({ theme = {}, isPremium = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const [currentLanguage, setCurrentLanguage] = useState("en");
  const [languageMode, setLanguageMode] = useState("single");
  const [allowedLanguages, setAllowedLanguages] = useState(null);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([
        {
          id: "welcome",
          role: "assistant",
          content:
            "Hello! I'm here to help you with reservations, orders, and any questions you might have. How can I assist you today?",
          timestamp: new Date(),
        },
      ]);
    }
  }, [isOpen]);

  const handleSendMessage = async (message, languageOverride = null) => {
    if (!message.trim()) return;

    const userMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: message,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const response = await chatAPI({
        message,
        conversationId,
        languageOverride,
        languageOnly: false,
      });

      if (response.conversationId) setConversationId(response.conversationId);

      if (response.language) setCurrentLanguage(response.language);
      if (response.languageMode) setLanguageMode(response.languageMode);
      if (response.allowedLanguages) setAllowedLanguages(response.allowedLanguages);

      const assistantMessage = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: response.message,
        toolCalls: response.toolCalls,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage = {
        id: `error-${Date.now()}`,
        role: "error",
        content: error.message || "Sorry, I encountered an error. Please try again.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLanguageChange = async (newLanguage) => {
    if (newLanguage === currentLanguage) return;

    try {
      const response = await chatAPI({
        message: "", // language-only
        conversationId, // se for null, o api.js NÃO vai enviar
        languageOverride: newLanguage,
        languageOnly: true,
      });

      if (response.language) setCurrentLanguage(response.language);

      if (response.systemMessage) {
        const systemMessage = {
          id: `system-${Date.now()}`,
          role: "system",
          content: response.message,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, systemMessage]);
      }
    } catch (error) {
      const errorMessage = {
        id: `error-${Date.now()}`,
        role: "error",
        content: error.message || "Failed to change language. Please try again.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    }
  };

  const mergedTheme = {
    primaryColor: theme.primaryColor || "#667eea",
    secondaryColor: theme.secondaryColor || "#764ba2",
    borderRadius: theme.borderRadius || "20px",
    backgroundColor: theme.backgroundColor || "rgba(255, 255, 255, 0.95)",
    textColor: theme.textColor || "#1a1a1a",
    assistantMessageColor: theme.assistantMessageColor || "#f0f0f0",
    userMessageColor: theme.userMessageColor || "#667eea",
  };

  return (
    <div className="chatbot-widget-container">
      {!isOpen && (
        <button
          className="chatbot-toggle-button"
          onClick={() => setIsOpen(true)}
          style={{
            "--primary-color": mergedTheme.primaryColor,
            "--secondary-color": mergedTheme.secondaryColor,
            "--border-radius": mergedTheme.borderRadius,
          }}
          aria-label="Open chatbot"
        >
          {/* ...svg... */}
        </button>
      )}

      {isOpen && (
        <div
          className="chatbot-window"
          style={{
            "--primary-color": mergedTheme.primaryColor,
            "--secondary-color": mergedTheme.secondaryColor,
            "--border-radius": mergedTheme.borderRadius,
            "--background-color": mergedTheme.backgroundColor,
            "--text-color": mergedTheme.textColor,
            "--assistant-message-color": mergedTheme.assistantMessageColor,
            "--user-message-color": mergedTheme.userMessageColor,
          }}
        >
          {/* Header */}
          <div className="chatbot-header">
            <div className="chatbot-header-content">
              {/* ...avatar... */}
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
                {/* ...svg... */}
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="chatbot-messages">
            <MessageList messages={messages} isLoading={isLoading} />
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <InputArea
            onSendMessage={handleSendMessage}
            onAudioTranscription={(t) => handleSendMessage(t)}
            onVideoClick={() => console.log("Video button clicked")}
            isLoading={isLoading}
            theme={mergedTheme}
          />
        </div>
      )}
    </div>
  );
};

export default ChatbotWidget;
