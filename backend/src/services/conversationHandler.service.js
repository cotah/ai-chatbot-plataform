/**
 * Conversation Handler Service
 * Orchestrates state machine + scripts + RAG
 */

import {
  STATES,
  getInitialState,
  transitionState,
  validateStateInput,
  getNextState,
  getStateContext,
} from './conversationState.service.js';
import {
  getScript,
  getWelcomeMessage,
  getBookingPreferenceResponse,
  getBookingConfirmationMessage,
  getInvalidInputMessage,
  getRedirectMessage,
} from './conversationScripts.service.js';
import logger from '../utils/logger.js';

/**
 * Handle conversation based on current state
 */
export async function handleConversation(sessionState, userMessage, sessionId) {
  try {
    // If no state exists, initialize with WELCOME
    if (!sessionState || !sessionState.current) {
      sessionState = getInitialState();
      logger.info('Initialized conversation state', { sessionId, state: STATES.WELCOME });
    }
    
    const currentState = sessionState.current;
    const stateData = sessionState.data || {};
    
    logger.info('Handling conversation', {
      sessionId,
      currentState,
      userMessage: userMessage.substring(0, 50),
      stateHistory: sessionState.history || [],
      hasData: !!sessionState.data && Object.keys(sessionState.data).length > 0,
    });
    
    // Handle based on current state
    let response;
    let nextState = currentState;
    let updatedData = { ...stateData };
    
    // CRITICAL: Check if user wants to book directly (from any state except booking states)
    const isInBookingFlow = currentState.startsWith('BOOK_');
    const wantsToBook = !isInBookingFlow && detectBookingIntent(userMessage);
    
    if (wantsToBook) {
      logger.info('Direct booking intent detected', { sessionId, currentState });
      // First go to BOOK_START, then immediately to BOOK_NAME
      nextState = STATES.BOOK_NAME;
      response = getScript(STATES.BOOK_NAME, updatedData);
      
      // Transition and return early
      const newState = transitionState(currentState, nextState, {
        ...sessionState,
        data: updatedData,
      });
      
      return {
        response,
        newState,
      };
    }
    
    switch (currentState) {
      case STATES.WELCOME:
        // Send welcome message
        response = getWelcomeMessage();
        nextState = STATES.MENU;
        break;
      
      case STATES.MENU:
        // Determine next state based on user selection
        nextState = getNextState(STATES.MENU, userMessage);
        
        if (nextState === STATES.PRICING_SELECT) {
          response = getScript(STATES.PRICING_SELECT);
        } else if (nextState === STATES.AGENTS_SELECT) {
          response = getScript(STATES.AGENTS_SELECT);
        } else if (nextState === STATES.SUPPORT_ISSUE) {
          response = getScript(STATES.SUPPORT_ISSUE);
        } else if (nextState === STATES.BOOK_START) {
          response = getScript(STATES.BOOK_START);
        } else {
          // User input didn't match any option - ANTI-LOOP: show short error, don't repeat full menu
          response = {
            message: 'Please reply with 1, 2, 3, or 4.',
          };
          // CRITICAL: Stay in MENU state, don't reset to WELCOME
          nextState = STATES.MENU;
          
          logger.warn('Invalid menu selection', {
            sessionId,
            userMessage: userMessage.substring(0, 50),
            currentState: STATES.MENU,
          });
        }
        break;
      
      case STATES.PRICING_SELECT:
        // User selected a plan
        const selectedPlan = detectPlanSelection(userMessage);
        if (selectedPlan) {
          updatedData.selectedPlan = selectedPlan;
          response = getScript(STATES.PRICING_DETAIL)[selectedPlan];
          nextState = STATES.PRICING_DETAIL;
        } else {
          response = {
            message: 'Please choose one of the plans:',
            ...getScript(STATES.PRICING_SELECT),
          };
          nextState = STATES.PRICING_SELECT;
        }
        break;
      
      case STATES.PRICING_DETAIL:
        // User responded to pricing detail
        nextState = getNextState(STATES.PRICING_DETAIL, userMessage);
        if (nextState === STATES.BOOK_START) {
          response = getScript(STATES.BOOK_START);
        } else if (nextState === STATES.MENU) {
          response = getWelcomeMessage();
        } else {
          // Use RAG to answer question
          response = { message: 'Let me help you with that.', useRAG: true };
          nextState = STATES.PRICING_DETAIL;
        }
        break;
      
      case STATES.AGENTS_SELECT:
        // User selected an agent
        const selectedAgent = detectAgentSelection(userMessage);
        if (selectedAgent) {
          updatedData.selectedAgent = selectedAgent;
          response = getScript(STATES.AGENTS_DETAIL)[selectedAgent];
          nextState = STATES.AGENTS_DETAIL;
        } else {
          response = {
            message: 'Please choose one of the agents:',
            ...getScript(STATES.AGENTS_SELECT),
          };
          nextState = STATES.AGENTS_SELECT;
        }
        break;
      
      case STATES.AGENTS_DETAIL:
        // User responded to agent detail
        nextState = getNextState(STATES.AGENTS_DETAIL, userMessage);
        if (nextState === STATES.BOOK_START) {
          response = getScript(STATES.BOOK_START);
        } else if (nextState === STATES.MENU) {
          response = getWelcomeMessage();
        } else {
          // Use RAG to answer question
          response = { message: 'Let me help you with that.', useRAG: true };
          nextState = STATES.AGENTS_DETAIL;
        }
        break;
      
      case STATES.SUPPORT_ISSUE:
        // User described issue, use RAG to help
        updatedData.issue = userMessage;
        response = { message: 'Let me help you with that.', useRAG: true };
        nextState = STATES.SUPPORT_ISSUE;
        break;
      
      case STATES.BOOK_START:
        // Start booking flow
        response = getScript(STATES.BOOK_NAME, updatedData);
        nextState = STATES.BOOK_NAME;
        break;
      
      case STATES.BOOK_NAME:
        // Validate name
        const nameValidation = validateStateInput(STATES.BOOK_NAME, userMessage);
        if (nameValidation.valid) {
          updatedData.name = userMessage.trim();
          response = getScript(STATES.BOOK_EMAIL, updatedData);
          nextState = STATES.BOOK_EMAIL;
        } else {
          response = { message: getInvalidInputMessage(STATES.BOOK_NAME, 'name') };
          nextState = STATES.BOOK_NAME;
        }
        break;
      
      case STATES.BOOK_EMAIL:
        // Validate email
        const emailValidation = validateStateInput(STATES.BOOK_EMAIL, userMessage);
        if (emailValidation.valid) {
          updatedData.email = userMessage.trim();
          response = getScript(STATES.BOOK_PHONE, updatedData);
          nextState = STATES.BOOK_PHONE;
        } else {
          response = { message: getInvalidInputMessage(STATES.BOOK_EMAIL, 'email') };
          nextState = STATES.BOOK_EMAIL;
        }
        break;
      
      case STATES.BOOK_PHONE:
        // Validate phone
        const phoneValidation = validateStateInput(STATES.BOOK_PHONE, userMessage);
        if (phoneValidation.valid) {
          updatedData.phone = userMessage.trim();
          response = getScript(STATES.BOOK_COMPANY, updatedData);
          nextState = STATES.BOOK_COMPANY;
        } else {
          response = { message: getInvalidInputMessage(STATES.BOOK_PHONE, 'phone') };
          nextState = STATES.BOOK_PHONE;
        }
        break;
      
      case STATES.BOOK_COMPANY:
        updatedData.company = userMessage.trim();
        response = getScript(STATES.BOOK_EMPLOYEES, updatedData);
        nextState = STATES.BOOK_EMPLOYEES;
        break;
      
      case STATES.BOOK_EMPLOYEES:
        updatedData.employees = userMessage.trim();
        response = getScript(STATES.BOOK_CHANNEL, updatedData);
        nextState = STATES.BOOK_CHANNEL;
        break;
      
      case STATES.BOOK_CHANNEL:
        updatedData.channel = detectChannelSelection(userMessage);
        response = getScript(STATES.BOOK_GOAL, updatedData);
        nextState = STATES.BOOK_GOAL;
        break;
      
      case STATES.BOOK_GOAL:
        updatedData.goal = detectGoalSelection(userMessage);
        
        // Send booking link (NEVER confirm without real booking)
        const bookingLink = process.env.BOOKING_LINK || 'https://calendly.com/btrix-demo';
        updatedData.bookingLink = bookingLink;
        updatedData.timezone = 'UTC'; // TODO: Detect timezone
        
        // Check if user mentioned time preference
        const timePreference = detectTimePreference(userMessage);
        if (timePreference) {
          response = { message: getBookingPreferenceResponse(timePreference, bookingLink) };
        } else {
          response = getScript(STATES.BOOK_SEND_LINK, updatedData);
        }
        
        nextState = STATES.BOOK_SEND_LINK;
        break;
      
      case STATES.BOOK_SEND_LINK:
        // Check if user mentioned time preference
        const preference = detectTimePreference(userMessage);
        if (preference) {
          response = { message: getBookingPreferenceResponse(preference, updatedData.bookingLink) };
          nextState = STATES.BOOK_SEND_LINK;
        } else {
          response = getScript(STATES.BOOK_AWAIT_CONFIRMATION, updatedData);
          nextState = STATES.BOOK_AWAIT_CONFIRMATION;
        }
        break;
      
      case STATES.BOOK_AWAIT_CONFIRMATION:
        // Wait for booking confirmation from system
        // DO NOT confirm without booking_id
        response = { message: 'Once you pick a time, I\'ll be ready here if you need anything.' };
        nextState = STATES.BOOK_AWAIT_CONFIRMATION;
        break;
      
      case STATES.BOOK_CONFIRMED:
        // Booking already confirmed
        response = { message: 'Your demo is already confirmed. Looking forward to meeting you!' };
        nextState = STATES.DONE;
        break;
      
      default:
        // Unknown state, reset to welcome
        logger.warn('Unknown state, resetting to welcome', { sessionId, currentState });
        response = getWelcomeMessage();
        nextState = STATES.MENU;
        break;
    }
    
    // Transition state
    const newState = transitionState(currentState, nextState, {
      ...sessionState,
      data: updatedData,
    });
    
    logger.info('Conversation handled', {
      sessionId,
      prevState: currentState,
      userMessage: userMessage.substring(0, 50),
      normalizedIntent: nextState !== currentState ? 'transition' : 'stay',
      nextState: nextState,
      responseLength: response.message?.length || 0,
      stateHistory: (sessionState.history || []).concat([currentState]).slice(-5), // Last 5 states
    });
    
    return {
      response,
      newState,
    };
    
  } catch (error) {
    logger.error('Error handling conversation', {
      sessionId,
      error: error.message,
      stack: error.stack,
    });
    
    // Return safe fallback
    return {
      response: { message: 'I apologize for the confusion. Let me start over.' },
      newState: getInitialState(),
    };
  }
}

/**
 * Detect plan selection from user input
 */
function detectPlanSelection(input) {
  const lower = input.toLowerCase();
  if (lower.includes('essential') || lower === '1') return 'Essential';
  if (lower.includes('pro') || lower === '2') return 'Pro';
  if (lower.includes('enterprise') || lower === '3') return 'Enterprise';
  return null;
}

/**
 * Detect agent selection from user input
 */
function detectAgentSelection(input) {
  const lower = input.toLowerCase();
  if (lower.includes('sales') || lower === '1') return 'Sales';
  if (lower.includes('marketing') || lower === '2') return 'Marketing';
  if (lower.includes('finance') || lower === '3') return 'Finance';
  if (lower.includes('inventory') || lower === '4') return 'Inventory';
  if (lower.includes('social') || lower === '5') return 'Social Media';
  if (lower.includes('design') || lower === '6') return 'Design';
  if (lower.includes('video') || lower === '7') return 'Video';
  return null;
}

/**
 * Detect channel selection from user input
 */
function detectChannelSelection(input) {
  const lower = input.toLowerCase();
  if (lower.includes('whatsapp') || lower === '1') return 'WhatsApp';
  if (lower.includes('website') || lower.includes('chat') || lower === '2') return 'Website Chat';
  if (lower.includes('email') || lower === '3') return 'Email';
  if (lower.includes('instagram') || lower.includes('facebook') || lower === '4') return 'Instagram/Facebook';
  return input.trim();
}

/**
 * Detect goal selection from user input
 */
function detectGoalSelection(input) {
  const lower = input.toLowerCase();
  if (lower.includes('lead') || lower.includes('sales') || lower === '1') return 'More leads & sales';
  if (lower.includes('support') || lower === '2') return 'Faster support';
  if (lower.includes('booking') || lower.includes('scheduling') || lower === '3') return 'Bookings & scheduling';
  if (lower.includes('operations') || lower.includes('automation') || lower === '4') return 'Operations automation';
  return input.trim();
}

/**
 * Detect time preference from user input
 */
function detectTimePreference(input) {
  const lower = input.toLowerCase();
  if (lower.includes('morning')) return 'morning';
  if (lower.includes('afternoon')) return 'afternoon';
  if (lower.includes('evening')) return 'evening';
  return null;
}

/**
 * Detect booking intent from user input
 */
function detectBookingIntent(input) {
  const lower = input.toLowerCase();
  // Check for booking keywords
  if (lower.includes('book')) return true;
  if (lower.includes('demo')) return true;
  if (lower.includes('call')) return true;
  if (lower.includes('schedule')) return true;
  if (lower.includes('meeting')) return true;
  if (lower === '4') return true; // Menu option 4
  return false;
}

/**
 * Confirm booking (ONLY if we have real booking data)
 */
export function confirmBooking(sessionState, bookingData) {
  const { booking_id, start_datetime, timezone, status } = bookingData;
  
  // CRITICAL: Only confirm if we have all required data
  if (!booking_id || !start_datetime || !timezone || status !== 'confirmed') {
    logger.warn('Attempted to confirm booking without complete data', {
      booking_id,
      start_datetime,
      timezone,
      status,
    });
    return null;
  }
  
  // Update state to BOOK_CONFIRMED
  const updatedData = {
    ...sessionState.data,
    booking_id,
    start_datetime,
    timezone,
    status,
  };
  
  const newState = transitionState(sessionState.current, STATES.BOOK_CONFIRMED, {
    ...sessionState,
    data: updatedData,
  });
  
  const confirmationMessage = getBookingConfirmationMessage(bookingData);
  
  logger.info('Booking confirmed', {
    booking_id,
    start_datetime,
    timezone,
  });
  
  return {
    response: { message: confirmationMessage },
    newState,
  };
}

export default {
  handleConversation,
  confirmBooking,
};
