import React from 'react';
import ReactDOM from 'react-dom/client';
import ChatbotWidget from './components/ChatbotWidget';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <div style={{ width: '100%', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <ChatbotWidget
        theme={{
          primaryColor: '#667eea',
          secondaryColor: '#764ba2',
          borderRadius: '20px',
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
        }}
      />
    </div>
  </React.StrictMode>
);

