import React from 'react';
import './Message.css';

// Function to convert URLs in text to clickable links
const linkifyText = (text) => {
  if (!text) return text;
  
  // Regex to match URLs
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);
  
  return parts.map((part, index) => {
    if (part.match(urlRegex)) {
      return (
        <a
          key={index}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="message-link"
        >
          {part}
        </a>
      );
    }
    return part;
  });
};

const Message = ({ message }) => {
  const isUser = message.role === 'user';
  const isError = message.role === 'error';
  const isSystem = message.role === 'system';

  if (isSystem) {
    return (
      <div className="message message-system">
        <div className="message-content">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`message ${isUser ? 'message-user' : 'message-assistant'} ${isError ? 'message-error' : ''}`}
    >
      <div className="message-content">
        {linkifyText(message.content)}
      </div>
      {message.toolCalls && message.toolCalls.length > 0 && (
        <div className="message-tool-calls">
          {message.toolCalls.map((toolCall) => (
            <div key={toolCall.id} className="tool-call-badge">
              {toolCall.name.replace(/_/g, ' ')}
            </div>
          ))}
        </div>
      )}
      <div className="message-timestamp">
        {new Date(message.timestamp).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        })}
      </div>
    </div>
  );
};

export default Message;

