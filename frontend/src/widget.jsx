/**
 * Chatbot Widget Entry Point
 * This file is used when building as a standalone widget library
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import ChatbotWidget from './components/ChatbotWidget';

/**
 * Initialize chatbot widget
 * @param {Object} config - Widget configuration
 * @param {string} config.containerId - DOM element ID to mount widget
 * @param {Object} config.theme - Theme customization
 */
export function initChatbot(config = {}) {
  const {
    containerId = 'chatbot-widget-container',
    theme = {},
    ...otherProps
  } = config;

  const container = document.getElementById(containerId);
  if (!container) {
    console.error(`Container with ID "${containerId}" not found`);
    return;
  }

  const root = ReactDOM.createRoot(container);
  root.render(
    <ChatbotWidget theme={theme} {...otherProps} />
  );

  return root;
}

// Auto-initialize if data attributes are present
if (typeof window !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    const script = document.querySelector('script[data-chatbot-widget]');
    if (script) {
      const containerId = script.getAttribute('data-container-id') || 'chatbot-widget-container';
      const theme = {
        primaryColor: script.getAttribute('data-primary-color') || '#667eea',
        secondaryColor: script.getAttribute('data-secondary-color') || '#764ba2',
        borderRadius: script.getAttribute('data-border-radius') || '20px',
        backgroundColor: script.getAttribute('data-background-color') || 'rgba(255, 255, 255, 0.95)',
      };

      initChatbot({ containerId, theme });
    }
  });
}

import { ChatbotWidget } from "ai-chatbot-widget"

