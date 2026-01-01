import React from 'react';
import './MicButton.css';

const MicButton = ({ isRecording, onClick, disabled, theme }) => {
  return (
    <button
      className={`mic-button ${isRecording ? 'mic-button-recording' : ''}`}
      onClick={onClick}
      disabled={disabled}
      aria-label={isRecording ? 'Stop recording' : 'Start recording'}
      style={{
        '--primary-color': theme?.primaryColor || '#667eea',
        '--border-radius': theme?.borderRadius || '20px',
      }}
    >
      {isRecording ? (
        <svg
          width="20"
          height="20"
          viewBox="0 0 20 20"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <rect x="4" y="4" width="12" height="12" rx="2" fill="currentColor" />
        </svg>
      ) : (
        <svg
          width="20"
          height="20"
          viewBox="0 0 20 20"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M10 12C11.6569 12 13 10.6569 13 9V4C13 2.34315 11.6569 1 10 1C8.34315 1 7 2.34315 7 4V9C7 10.6569 8.34315 12 10 12Z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M5 9V10C5 12.7614 7.23858 15 10 15C12.7614 15 15 12.7614 15 10V9"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M10 15V19M6 19H14"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
      {isRecording && <span className="mic-button-pulse"></span>}
    </button>
  );
};

export default MicButton;

