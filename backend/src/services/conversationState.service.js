/**
 * Conversation State Machine Service
 * Manages conversation flow with structured states and transitions
 */

import logger from '../utils/logger.js';

/**
 * Conversation States
 */
export const STATES = {
  // Initial states
  WELCOME: 'WELCOME',
  MENU: 'MENU',
  
  // Pricing flow
  PRICING_SELECT: 'PRICING_SELECT',
  PRICING_DETAIL: 'PRICING_DETAIL',
  
  // Agents flow
  AGENTS_SELECT: 'AGENTS_SELECT',
  AGENTS_DETAIL: 'AGENTS_DETAIL',
  
  // Support flow
  SUPPORT_ISSUE: 'SUPPORT_ISSUE',
  SUPPORT_ESCALATE: 'SUPPORT_ESCALATE',
  
  // Booking flow (sequential)
  BOOK_START: 'BOOK_START',
  BOOK_NAME: 'BOOK_NAME',
  BOOK_EMAIL: 'BOOK_EMAIL',
  BOOK_PHONE: 'BOOK_PHONE',
  BOOK_COMPANY: 'BOOK_COMPANY',
  BOOK_EMPLOYEES: 'BOOK_EMPLOYEES',
  BOOK_CHANNEL: 'BOOK_CHANNEL',
  BOOK_GOAL: 'BOOK_GOAL',
  BOOK_PREFERENCE_TIME: 'BOOK_PREFERENCE_TIME',
  BOOK_SEND_LINK: 'BOOK_SEND_LINK',
  BOOK_AWAIT_CONFIRMATION: 'BOOK_AWAIT_CONFIRMATION',
  BOOK_CONFIRMED: 'BOOK_CONFIRMED',
  
  // End states
  DONE: 'DONE',
};

/**
 * State machine configuration
 */
const STATE_CONFIG = {
  [STATES.WELCOME]: {
    nextStates: [STATES.MENU],
    requiresInput: false,
  },
  [STATES.MENU]: {
    nextStates: [STATES.PRICING_SELECT, STATES.AGENTS_SELECT, STATES.SUPPORT_ISSUE, STATES.BOOK_START],
    requiresInput: true,
  },
  [STATES.PRICING_SELECT]: {
    nextStates: [STATES.PRICING_DETAIL],
    requiresInput: true,
  },
  [STATES.PRICING_DETAIL]: {
    nextStates: [STATES.BOOK_START, STATES.MENU, STATES.DONE],
    requiresInput: true,
  },
  [STATES.AGENTS_SELECT]: {
    nextStates: [STATES.AGENTS_DETAIL],
    requiresInput: true,
  },
  [STATES.AGENTS_DETAIL]: {
    nextStates: [STATES.BOOK_START, STATES.MENU, STATES.DONE],
    requiresInput: true,
  },
  [STATES.SUPPORT_ISSUE]: {
    nextStates: [STATES.SUPPORT_ESCALATE, STATES.MENU, STATES.DONE],
    requiresInput: true,
  },
  [STATES.SUPPORT_ESCALATE]: {
    nextStates: [STATES.DONE],
    requiresInput: true,
  },
  [STATES.BOOK_START]: {
    nextStates: [STATES.BOOK_NAME],
    requiresInput: false,
  },
  [STATES.BOOK_NAME]: {
    nextStates: [STATES.BOOK_EMAIL],
    requiresInput: true,
    validation: 'name',
  },
  [STATES.BOOK_EMAIL]: {
    nextStates: [STATES.BOOK_PHONE],
    requiresInput: true,
    validation: 'email',
  },
  [STATES.BOOK_PHONE]: {
    nextStates: [STATES.BOOK_COMPANY],
    requiresInput: true,
    validation: 'phone',
  },
  [STATES.BOOK_COMPANY]: {
    nextStates: [STATES.BOOK_EMPLOYEES],
    requiresInput: true,
  },
  [STATES.BOOK_EMPLOYEES]: {
    nextStates: [STATES.BOOK_CHANNEL],
    requiresInput: true,
  },
  [STATES.BOOK_CHANNEL]: {
    nextStates: [STATES.BOOK_GOAL],
    requiresInput: true,
  },
  [STATES.BOOK_GOAL]: {
    nextStates: [STATES.BOOK_SEND_LINK],
    requiresInput: true,
  },
  [STATES.BOOK_SEND_LINK]: {
    nextStates: [STATES.BOOK_AWAIT_CONFIRMATION],
    requiresInput: false,
  },
  [STATES.BOOK_AWAIT_CONFIRMATION]: {
    nextStates: [STATES.BOOK_CONFIRMED, STATES.DONE],
    requiresInput: false,
  },
  [STATES.BOOK_CONFIRMED]: {
    nextStates: [STATES.DONE],
    requiresInput: false,
  },
};

/**
 * Validation functions
 */
export const VALIDATORS = {
  email: (value) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value);
  },
  phone: (value) => {
    // Accept + and numbers, minimum 8 digits
    const phoneRegex = /^\+?[\d\s\-()]{8,}$/;
    return phoneRegex.test(value);
  },
  name: (value) => {
    // At least 2 characters
    return value && value.trim().length >= 2;
  },
};

/**
 * Get initial state
 */
export function getInitialState() {
  return {
    current: STATES.WELCOME,
    data: {},
    history: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Transition to next state
 */
export function transitionState(currentState, nextState, data = {}) {
  const config = STATE_CONFIG[currentState];
  
  // Validate transition
  if (!config) {
    logger.error('Invalid current state', { currentState });
    throw new Error(`Invalid state: ${currentState}`);
  }
  
  if (!config.nextStates.includes(nextState)) {
    logger.warn('Invalid state transition', { currentState, nextState, allowedStates: config.nextStates });
    // Allow transition anyway but log warning
  }
  
  logger.info('State transition', { from: currentState, to: nextState, data });
  
  return {
    current: nextState,
    data,
    history: [...(data.history || []), currentState],
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Validate input for current state
 */
export function validateStateInput(state, input) {
  const config = STATE_CONFIG[state];
  
  if (!config || !config.validation) {
    return { valid: true };
  }
  
  const validator = VALIDATORS[config.validation];
  if (!validator) {
    logger.warn('No validator found for state', { state, validation: config.validation });
    return { valid: true };
  }
  
  const valid = validator(input);
  
  return {
    valid,
    error: valid ? null : `Invalid ${config.validation}`,
  };
}

/**
 * Get next state based on user input
 */
export function getNextState(currentState, userInput) {
  const config = STATE_CONFIG[currentState];
  
  if (!config) {
    logger.error('Invalid state in getNextState', { currentState });
    return null;
  }
  
  // For states with single next state, return it
  if (config.nextStates.length === 1) {
    return config.nextStates[0];
  }
  
  // For menu state, determine next state based on input
  if (currentState === STATES.MENU) {
    // Normalize input: lowercase, remove special chars, trim
    const input = userInput.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
    
    // Option 1: Pricing & Plans
    if (
      input.includes('pricing') ||
      input.includes('plan') ||
      input.includes('price') ||
      input.includes('cost') ||
      input === '1' ||
      input.startsWith('1 ') ||
      input.includes('1 pricing')
    ) {
      return STATES.PRICING_SELECT;
    }
    
    // Option 2: AI Agents
    if (
      input.includes('agent') ||
      input.includes('ai') ||
      input === '2' ||
      input.startsWith('2 ') ||
      input.includes('2 ai')
    ) {
      return STATES.AGENTS_SELECT;
    }
    
    // Option 3: Support
    if (
      input.includes('support') ||
      input.includes('help') ||
      input === '3' ||
      input.startsWith('3 ')
    ) {
      return STATES.SUPPORT_ISSUE;
    }
    
    // Option 4: Book a Demo
    if (
      input.includes('book') ||
      input.includes('demo') ||
      input.includes('call') ||
      input.includes('meeting') ||
      input.includes('schedule') ||
      input === '4' ||
      input.startsWith('4 ')
    ) {
      return STATES.BOOK_START;
    }
    
    // If no match, return null (handler will show error message)
    logger.warn('No menu option matched', { userInput, normalizedInput: input });
    return null;
  }
  
  // For pricing detail, check if user wants to book or go back
  if (currentState === STATES.PRICING_DETAIL) {
    const input = userInput.toLowerCase();
    if (input.includes('book') || input.includes('demo')) {
      return STATES.BOOK_START;
    }
    if (input.includes('menu') || input.includes('back')) {
      return STATES.MENU;
    }
    return STATES.DONE;
  }
  
  // For agents detail, same logic
  if (currentState === STATES.AGENTS_DETAIL) {
    const input = userInput.toLowerCase();
    if (input.includes('book') || input.includes('demo')) {
      return STATES.BOOK_START;
    }
    if (input.includes('menu') || input.includes('back')) {
      return STATES.MENU;
    }
    return STATES.DONE;
  }
  
  // Default: return first next state
  return config.nextStates[0];
}

/**
 * Check if state requires input
 */
export function requiresInput(state) {
  const config = STATE_CONFIG[state];
  return config ? config.requiresInput : false;
}

/**
 * Get state context (for prompt generation)
 */
export function getStateContext(state, stateData = {}) {
  const contexts = {
    [STATES.WELCOME]: {
      instruction: 'Send welcome message with menu options. Be confident and professional.',
      expectedResponse: 'Welcome message with 4 menu options',
    },
    [STATES.MENU]: {
      instruction: 'User is choosing from menu. Wait for their selection.',
      expectedResponse: 'Acknowledge selection and proceed to next step',
    },
    [STATES.PRICING_SELECT]: {
      instruction: 'User wants pricing. Ask which plan they are interested in.',
      expectedResponse: 'Present 3 plan options: Essential, Pro, Enterprise',
    },
    [STATES.PRICING_DETAIL]: {
      instruction: 'Provide details about selected plan. Then ask if they want to book demo or have questions.',
      expectedResponse: 'Plan details + CTA (book demo or ask question)',
    },
    [STATES.AGENTS_SELECT]: {
      instruction: 'User wants AI agents info. Ask which area they want to improve.',
      expectedResponse: 'Present 7 agent options',
    },
    [STATES.AGENTS_DETAIL]: {
      instruction: 'Provide details about selected agent. Then ask if they want to book demo.',
      expectedResponse: 'Agent details + pricing + CTA for demo',
    },
    [STATES.SUPPORT_ISSUE]: {
      instruction: 'User needs support. Ask them to describe issue in one sentence.',
      expectedResponse: 'Request issue description',
    },
    [STATES.SUPPORT_ESCALATE]: {
      instruction: 'Issue needs escalation. Offer to create ticket and ask for email.',
      expectedResponse: 'Escalation offer + email request',
    },
    [STATES.BOOK_START]: {
      instruction: 'Starting booking flow. Confirm and ask for first name.',
      expectedResponse: 'Great! What\'s your first name?',
    },
    [STATES.BOOK_NAME]: {
      instruction: `User provided name: ${stateData.name || 'waiting'}. Ask for work email.`,
      expectedResponse: `Thanks, {name}. What's your work email?`,
    },
    [STATES.BOOK_EMAIL]: {
      instruction: `User provided email: ${stateData.email || 'waiting'}. Ask for phone number with country code.`,
      expectedResponse: 'Perfect. What\'s your phone number (with country code)?',
    },
    [STATES.BOOK_PHONE]: {
      instruction: `User provided phone: ${stateData.phone || 'waiting'}. Ask for company name.`,
      expectedResponse: 'What\'s your company name?',
    },
    [STATES.BOOK_COMPANY]: {
      instruction: `User provided company: ${stateData.company || 'waiting'}. Ask for number of employees.`,
      expectedResponse: 'How many employees does your company have?',
    },
    [STATES.BOOK_EMPLOYEES]: {
      instruction: `User provided employees: ${stateData.employees || 'waiting'}. Ask for main channel.`,
      expectedResponse: 'Which channel matters most right now? (WhatsApp, Website Chat, Email, Instagram/Facebook)',
    },
    [STATES.BOOK_CHANNEL]: {
      instruction: `User provided channel: ${stateData.channel || 'waiting'}. Ask for main goal.`,
      expectedResponse: 'Thanks. Last question: what\'s your main goal? (More leads & sales, Faster support, Bookings & scheduling, Operations automation)',
    },
    [STATES.BOOK_GOAL]: {
      instruction: `User provided goal: ${stateData.goal || 'waiting'}. Send booking link. NEVER confirm as scheduled.`,
      expectedResponse: 'Done. Please choose an exact date and time here: {booking_link}',
    },
    [STATES.BOOK_SEND_LINK]: {
      instruction: 'Booking link sent. Wait for user to confirm booking.',
      expectedResponse: 'Once you pick a time, I\'ll be ready here if you need anything.',
    },
    [STATES.BOOK_AWAIT_CONFIRMATION]: {
      instruction: 'Waiting for booking confirmation from system. Do NOT confirm without booking_id.',
      expectedResponse: 'Waiting for confirmation...',
    },
    [STATES.BOOK_CONFIRMED]: {
      instruction: `Booking confirmed with ID: ${stateData.booking_id || 'N/A'}, Time: ${stateData.start_datetime || 'N/A'}`,
      expectedResponse: 'Your demo is confirmed for {date} at {time} {timezone}. Check your email for calendar invite.',
    },
  };
  
  return contexts[state] || { instruction: 'Continue conversation naturally.', expectedResponse: '' };
}

export default {
  STATES,
  getInitialState,
  transitionState,
  validateStateInput,
  getNextState,
  requiresInput,
  getStateContext,
  VALIDATORS,
};
