/**
 * Mock API Service
 * Simulates API calls for development and testing
 */

// Simulate network delay
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Mock responses based on message content
const getMockResponse = (message, conversationId) => {
  const lowerMessage = message.toLowerCase();

  // Reservation intent
  if (lowerMessage.includes('reservation') || lowerMessage.includes('book') || lowerMessage.includes('table')) {
    return {
      conversationId: conversationId || `conv_${Date.now()}`,
      message: "I'd be happy to help you make a reservation! Could you please provide:\n\n• Your name\n• Phone number\n• Email address\n• Preferred date and time\n• Number of guests",
      toolCalls: [],
    };
  }

  // Order intent
  if (lowerMessage.includes('order') || lowerMessage.includes('menu') || lowerMessage.includes('food')) {
    return {
      conversationId: conversationId || `conv_${Date.now()}`,
      message: "Great! I can help you place an order for pickup. Would you like to see our menu? You can view it via our video menu on YouTube, or I can help you place an order directly.",
      toolCalls: [],
    };
  }

  // Hours question
  if (lowerMessage.includes('hour') || lowerMessage.includes('open') || lowerMessage.includes('close')) {
    return {
      conversationId: conversationId || `conv_${Date.now()}`,
      message: "We're open:\n\n• Monday - Thursday: 11:00 AM - 10:00 PM\n• Friday - Saturday: 11:00 AM - 11:00 PM\n• Sunday: 12:00 PM - 9:00 PM\n\nIs there anything else I can help you with?",
      toolCalls: [],
    };
  }

  // Location question
  if (lowerMessage.includes('location') || lowerMessage.includes('address') || lowerMessage.includes('where')) {
    return {
      conversationId: conversationId || `conv_${Date.now()}`,
      message: "We're located at:\n\n123 Main Street\nCity, State 12345\n\nWe're in the heart of downtown, with plenty of parking available. Would you like directions?",
      toolCalls: [],
    };
  }

  // Video request
  if (lowerMessage.includes('video') || lowerMessage.includes('see') || lowerMessage.includes('show')) {
    return {
      conversationId: conversationId || `conv_${Date.now()}`,
      message: "I can start a video session to help you visually. Would you like me to do that?",
      toolCalls: [
        {
          id: 'tool_1',
          name: 'create_video_session',
          arguments: {
            reason: 'Customer requested video assistance',
          },
        },
      ],
    };
  }

  // Human support request
  if (lowerMessage.includes('human') || lowerMessage.includes('person') || lowerMessage.includes('speak to')) {
    return {
      conversationId: conversationId || `conv_${Date.now()}`,
      message: "I understand you'd like to speak with a team member. Here's our WhatsApp link for direct support: https://wa.me/1234567890?text=Hello%2C%20I%20need%20assistance",
      toolCalls: [
        {
          id: 'tool_2',
          name: 'provide_whatsapp_link',
          arguments: {
            reason: 'Customer requested human support',
            message: 'Hello, I need assistance',
          },
        },
      ],
    };
  }

  // Default response
  return {
    conversationId: conversationId || `conv_${Date.now()}`,
    message: "I'm here to help! I can assist you with:\n\n• Making reservations\n• Placing orders\n• Answering questions about our business\n• Providing information about hours and location\n\nWhat would you like to do today?",
    toolCalls: [],
  };
};

/**
 * Mock chat API call
 */
export const mockChatAPI = async (message, conversationId = null, languageOverride = null, languageOnly = false) => {
  // Handle language-only requests
  if (languageOnly && languageOverride) {
    await delay(300);
    const languageNames = {
      en: 'English',
      'pt-BR': 'Portuguese (Brazil)',
      es: 'Spanish',
    };
    return {
      success: true,
      language: languageOverride,
      languageChanged: true,
      message: `Language changed to ${languageNames[languageOverride] || languageOverride}`,
      systemMessage: true,
    };
  }
  // Simulate network delay (500-1500ms)
  const delayTime = 500 + Math.random() * 1000;
  await delay(delayTime);

  // Simulate occasional errors (5% chance)
  if (Math.random() < 0.05) {
    throw new Error('Network error: Please try again');
  }

  const response = getMockResponse(message, conversationId);
  
  // Add language info to response (mock)
  // If languageOverride is provided, use it; otherwise detect from message
  let detectedLanguage = languageOverride;
  if (!detectedLanguage) {
    const lowerMessage = message.toLowerCase();
    if (lowerMessage.includes('português') || lowerMessage.includes('portuguese') || lowerMessage.includes('pt-br') || lowerMessage.match(/\bpt\b/)) {
      detectedLanguage = 'pt-BR';
    } else if (lowerMessage.includes('español') || lowerMessage.includes('spanish') || lowerMessage.match(/\bes\b/)) {
      detectedLanguage = 'es';
    } else {
      detectedLanguage = 'en';
    }
  }
  
  response.language = detectedLanguage;
  response.languageMode = 'auto'; // Mock: can be 'single', 'auto', or 'allowed'
  response.allowedLanguages = ['en', 'pt-BR', 'es']; // Mock: only used when mode is 'allowed'

  return response;
};

/**
 * Mock audio transcription API call
 */
export const mockTranscribeAudio = async (audioBlob) => {
  // Simulate transcription delay
  await delay(1000 + Math.random() * 1000);

  // Return mock transcription
  return {
    transcription: "I'd like to make a reservation for tonight at 7 PM for 2 people",
  };
};

/**
 * Mock reservation API call
 */
export const mockCreateReservation = async (reservationData) => {
  await delay(800);
  return {
    success: true,
    reservation: {
      eventId: `event_${Date.now()}`,
      eventLink: 'https://calendar.google.com/event?eid=mock',
      date: reservationData.date,
      time: reservationData.time,
      guests: reservationData.guests,
      confirmationMessage: `Reservation confirmed for ${reservationData.name} on ${reservationData.date} at ${reservationData.time} for ${reservationData.guests} guest(s).`,
    },
  };
};

/**
 * Mock order API call
 */
export const mockCreateOrder = async (orderData) => {
  await delay(600);
  return {
    success: true,
    order: {
      orderId: `order_${Date.now()}`,
      paymentIntentId: `pi_mock_${Date.now()}`,
      clientSecret: `pi_mock_secret_${Date.now()}`,
      amount: orderData.items.reduce((sum, item) => sum + item.price * item.quantity, 0),
      currency: 'usd',
      items: orderData.items,
    },
  };
};

/**
 * Mock video session API call
 */
export const mockCreateVideoSession = async (sessionData) => {
  await delay(1000);
  return {
    success: true,
    session: {
      sessionId: `session_${Date.now()}`,
      sessionUrl: 'https://heygen.com/session/mock',
      streamUrl: 'https://heygen.com/stream/mock',
      token: 'mock_token',
    },
  };
};

