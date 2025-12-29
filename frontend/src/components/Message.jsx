import React from 'react';
import './Message.css';

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
        {message.content}
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

