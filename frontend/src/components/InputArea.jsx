import React, { useState, useRef, useEffect } from 'react';
import TextInput from './TextInput';
import MicButton from './MicButton';
import VideoButton from './VideoButton';
import './InputArea.css';

const InputArea = ({
  onSendMessage,
  onAudioTranscription,
  onVideoClick,
  isLoading,
  theme,
}) => {
  const [inputValue, setInputValue] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const textInputRef = useRef(null);

  const handleSend = () => {
    if (inputValue.trim() && !isLoading) {
      onSendMessage(inputValue.trim());
      setInputValue('');
      // Keep focus on input after sending - removed textInputRef.current?.focus();
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleMicClick = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const startRecording = () => {
    // Mock audio recording - will be replaced with real implementation
    setIsRecording(true);
    console.log('Recording started (mock)');
    
    // Simulate recording for 3 seconds, then transcribe
    setTimeout(() => {
      const mockTranscription = "I'd like to make a reservation for tonight";
      onAudioTranscription(mockTranscription);
      setIsRecording(false);
    }, 3000);
  };

  const stopRecording = () => {
    setIsRecording(false);
    console.log('Recording stopped (mock)');
  };

  return (
    <div className="input-area">
      <div className="input-area-container">
        <TextInput
          ref={textInputRef}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={handleKeyPress}
          onSend={handleSend}
          placeholder="Type your message..."
          disabled={isLoading}
          theme={theme}
        />
        <div className="input-area-buttons">
          <MicButton
            isRecording={isRecording}
            onClick={handleMicClick}
            disabled={isLoading}
            theme={theme}
          />
          <VideoButton
            onClick={onVideoClick}
            disabled={true} // Disabled by default as per requirements
            theme={theme}
          />
        </div>
      </div>
    </div>
  );
};

export default InputArea;

