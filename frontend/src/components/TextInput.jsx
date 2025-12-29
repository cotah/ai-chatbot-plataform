import React, { forwardRef } from 'react';
import './TextInput.css';

const TextInput = forwardRef(({ value, onChange, onKeyPress, onSend, placeholder, disabled, theme }, ref) => {
  return (
    <div className="text-input-wrapper">
      <textarea
        ref={ref}
        className="text-input"
        value={value}
        onChange={onChange}
        onKeyPress={onKeyPress}
        placeholder={placeholder}
        disabled={disabled}
        rows={1}
        style={{
          '--primary-color': theme?.primaryColor || '#667eea',
          '--border-radius': theme?.borderRadius || '20px',
        }}
      />
      {value.trim() && (
        <button
          className="text-input-send-button"
          onClick={onSend}
          disabled={disabled}
          aria-label="Send message"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M18 2L9 11M18 2L12 18L9 11M18 2L2 8L9 11"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      )}
    </div>
  );
});

TextInput.displayName = 'TextInput';

export default TextInput;

