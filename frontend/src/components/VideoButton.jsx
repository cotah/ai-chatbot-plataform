import React from 'react';
import './VideoButton.css';

const VideoButton = ({ onClick, disabled, theme }) => {
  return (
    <button
      className={`video-button ${disabled ? 'video-button-disabled' : ''}`}
      onClick={onClick}
      disabled={disabled}
      aria-label="Start video assistance"
      style={{
        '--primary-color': theme?.primaryColor || '#667eea',
        '--border-radius': theme?.borderRadius || '20px',
      }}
    >
      <svg
        width="20"
        height="20"
        viewBox="0 0 20 20"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M2 5C2 4.44772 2.44772 4 3 4H12C12.5523 4 13 4.44772 13 5V11C13 11.5523 12.5523 12 12 12H10L13 15V16H7V15L10 12H3C2.44772 12 2 11.5523 2 11V5Z"
          fill="currentColor"
        />
        <path
          d="M15 7L17 5V15L15 13"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {disabled && (
        <span className="video-button-badge" title="Coming soon">
          <svg
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M6 1L7.5 4.5L11 6L7.5 7.5L6 11L4.5 7.5L1 6L4.5 4.5L6 1Z"
              fill="currentColor"
            />
          </svg>
        </span>
      )}
    </button>
  );
};

export default VideoButton;

