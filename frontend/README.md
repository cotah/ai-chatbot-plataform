# AI Chatbot Widget - Frontend

Premium, modern chatbot widget for websites with customizable themes.

## Features

- 🎨 **Premium Modern Design** - Glassmorphism, soft shadows, smooth animations
- 💬 **Text Chat** - Full conversation interface with message history
- 🎤 **Audio Input** - Microphone button with visual feedback
- 🎥 **Video Support** - Optional video button (disabled by default)
- 🎨 **Theme Customization** - Colors, border radius, and more
- 📱 **Responsive** - Works on desktop and mobile
- ⚡ **Fast & Lightweight** - Optimized performance

## Quick Start

### Development

```bash
cd frontend
npm install
npm run dev
```

Visit `http://localhost:5173` to see the demo.

### Build

```bash
npm run build
```

## Usage

### As React Component

```jsx
import ChatbotWidget from './components/ChatbotWidget';

function App() {
  return (
    <ChatbotWidget
      theme={{
        primaryColor: '#667eea',
        secondaryColor: '#764ba2',
        borderRadius: '20px',
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
      }}
    />
  );
}
```

### As Standalone Widget

```html
<!DOCTYPE html>
<html>
<head>
  <script src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
  <script src="./dist/chatbot-widget.umd.js"></script>
</head>
<body>
  <div id="chatbot-widget-container"></div>
  <script>
    ChatbotWidget.initChatbot({
      containerId: 'chatbot-widget-container',
      theme: {
        primaryColor: '#667eea',
        secondaryColor: '#764ba2',
        borderRadius: '20px',
      }
    });
  </script>
</body>
</html>
```

### With Data Attributes

```html
<div id="chatbot-widget-container"></div>
<script
  data-chatbot-widget
  data-container-id="chatbot-widget-container"
  data-primary-color="#667eea"
  data-secondary-color="#764ba2"
  data-border-radius="20px"
  src="./dist/chatbot-widget.umd.js"
></script>
```

## Theme Customization

The widget supports extensive theme customization:

```jsx
<ChatbotWidget
  theme={{
    // Primary gradient colors
    primaryColor: '#667eea',
    secondaryColor: '#764ba2',
    
    // Border radius (affects all rounded elements)
    borderRadius: '20px',
    
    // Background color (with transparency support)
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    
    // Text colors
    textColor: '#1a1a1a',
    assistantMessageColor: '#f0f0f0',
    userMessageColor: '#667eea',
  }}
/>
```

### Theme Properties

- `primaryColor` - Primary brand color (default: `#667eea`)
- `secondaryColor` - Secondary gradient color (default: `#764ba2`)
- `borderRadius` - Border radius for rounded elements (default: `20px`)
- `backgroundColor` - Widget background (default: `rgba(255, 255, 255, 0.95)`)
- `textColor` - Main text color (default: `#1a1a1a`)
- `assistantMessageColor` - Assistant message background (default: `#f0f0f0`)
- `userMessageColor` - User message background (default: `#667eea`)

## Components

### ChatbotWidget
Main widget component that manages state and UI.

### MessageList
Displays conversation messages.

### Message
Individual message component with user/assistant styling.

### InputArea
Input container with text input and action buttons.

### TextInput
Text input with auto-resize and send button.

### MicButton
Microphone button with recording state and animations.

### VideoButton
Video assistance button (disabled by default).

### LoadingIndicator
Animated loading dots for AI responses.

## Mock API

The widget currently uses mock API calls (`src/services/mockAPI.js`) for development. Replace with real API integration when ready.

## Styling

All styles use CSS custom properties (CSS variables) for theming. The widget is fully self-contained and won't conflict with your site's styles.

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## Development

### Project Structure

```
frontend/
├── src/
│   ├── components/
│   │   ├── ChatbotWidget.jsx
│   │   ├── MessageList.jsx
│   │   ├── Message.jsx
│   │   ├── InputArea.jsx
│   │   ├── TextInput.jsx
│   │   ├── MicButton.jsx
│   │   ├── VideoButton.jsx
│   │   └── LoadingIndicator.jsx
│   ├── services/
│   │   └── mockAPI.js
│   ├── demo.jsx
│   └── widget.jsx
├── index.html
├── vite.config.js
└── package.json
```

### Adding Real API Integration

1. Create `src/services/api.js` with real API calls
2. Replace `mockAPI` imports in components
3. Update API endpoints in configuration
4. Add error handling and retry logic

## Next Steps

- [ ] Integrate real backend API
- [ ] Add real audio recording/transcription
- [ ] Implement video avatar integration
- [ ] Add conversation persistence
- [ ] Add typing indicators
- [ ] Add file upload support
- [ ] Add emoji picker
- [ ] Add message reactions

