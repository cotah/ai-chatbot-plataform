/**
 * Conversation Scripts Service
 * Structured messages for each conversation state
 */

import { STATES } from './conversationState.service.js';

/**
 * Get script for a given state
 */
export function getScript(state, data = {}) {
  const scripts = {
    [STATES.WELCOME]: {
      message: `Hi — I'm BTRIX.
I help businesses automate sales, support and operations.
What would you like to do today?
1) Pricing & Plans
2) AI Agents
3) Support
4) Book a Demo`,
      options: ['Pricing & Plans', 'AI Agents', 'Support', 'Book a Demo'],
    },
    
    [STATES.PRICING_SELECT]: {
      message: `Got it. Which plan are you interested in?
1) Essential
2) Pro
3) Enterprise`,
      options: ['Essential', 'Pro', 'Enterprise'],
    },
    
    [STATES.PRICING_DETAIL]: {
      Essential: {
        message: `**BTRIX Essential**
€300/month (€1,400 setup)

Best for: Small businesses starting automation (10-50 leads/day)

Includes:
• Basic automation structure
• WhatsApp + website chatbot
• Lead capture and CRM
• 24/7 AI support

Would you like to book a demo or ask a quick question?`,
      },
      Pro: {
        message: `**BTRIX Pro** ⭐ Most Popular
€550/month (€2,200 setup)

Best for: Growing companies with higher volume (50-200 leads/day)

Includes:
• Everything in Essential
• Multi-channel automation
• Lead scoring and prioritization
• Advanced CRM integration
• Operational dashboards

Would you like to book a demo or ask a quick question?`,
      },
      Enterprise: {
        message: `**BTRIX Enterprise**
€900+/month (€3,500+ setup)

Best for: Large companies, franchises, complex operations (200+ leads/day)

Includes:
• Everything in Pro
• Fully customized ecosystem
• Multiple AI agents included
• Deep integrations (ERP, custom APIs)
• Dedicated success manager

Would you like to book a demo or ask a quick question?`,
      },
    },
    
    [STATES.AGENTS_SELECT]: {
      message: `Sure. Which area are you looking to improve?
1) Sales
2) Marketing
3) Finance
4) Inventory
5) Social Media
6) Design (Images)
7) Video`,
      options: ['Sales', 'Marketing', 'Finance', 'Inventory', 'Social Media', 'Design', 'Video'],
    },
    
    [STATES.AGENTS_DETAIL]: {
      Sales: {
        message: `**Sales Agent** — €200/month

What it does:
• Lead qualification
• Pipeline management
• Follow-up automation
• Sales forecasting

Note: Requires an active BTRIX pack.

Would you like to book a demo to see it in action?`,
      },
      Marketing: {
        message: `**Marketing Agent** — €200/month

What it does:
• Campaign optimization
• Analytics and reporting
• A/B testing
• Performance tracking

Note: Requires an active BTRIX pack.

Would you like to book a demo to see it in action?`,
      },
      Finance: {
        message: `**Finance Agent** — €180/month

What it does:
• Cash flow tracking
• Expense monitoring
• Financial alerts
• Budget management

Note: Requires an active BTRIX pack.

Would you like to book a demo to see it in action?`,
      },
      Inventory: {
        message: `**Inventory Agent** — €180/month

What it does:
• Stock monitoring
• Reorder alerts
• Inventory forecasting
• Supplier management

Note: Requires an active BTRIX pack.

Would you like to book a demo to see it in action?`,
      },
      'Social Media': {
        message: `**Social Media Agent** — €180/month

What it does:
• Content planning
• Engagement tracking
• Post scheduling
• Analytics

Note: Requires an active BTRIX pack.

Would you like to book a demo to see it in action?`,
      },
      Design: {
        message: `**Design Agent** — €180/month

What it does:
• Static designs (banners, posts, ads)
• Brand consistency
• Template generation
• Quick turnaround

Note: Requires an active BTRIX pack.

Would you like to book a demo to see it in action?`,
      },
      Video: {
        message: `**Video Agent** — €250/month

What it does:
• Short-form videos
• Ads and reels
• Video editing
• Content repurposing

Note: Requires an active BTRIX pack.

Would you like to book a demo to see it in action?`,
      },
    },
    
    [STATES.SUPPORT_ISSUE]: {
      message: 'Of course. Please describe the issue in one sentence.',
    },
    
    [STATES.SUPPORT_ESCALATE]: {
      message: 'I can escalate this to a human during business hours. What\'s the best email to reach you?',
    },
    
    [STATES.BOOK_START]: {
      message: 'Great. What\'s your first name?',
    },
    
    [STATES.BOOK_NAME]: {
      message: data.name ? `Thanks, ${data.name}. What's your work email?` : 'What\'s your work email?',
    },
    
    [STATES.BOOK_EMAIL]: {
      message: 'Perfect. What\'s your phone number (with country code)?',
      invalidMessage: 'That doesn\'t look like a valid email. Please provide your work email.',
    },
    
    [STATES.BOOK_PHONE]: {
      message: 'What\'s your company name?',
      invalidMessage: 'That doesn\'t look like a valid phone number. Please include country code (e.g., +1234567890).',
    },
    
    [STATES.BOOK_COMPANY]: {
      message: 'How many employees does your company have?',
    },
    
    [STATES.BOOK_EMPLOYEES]: {
      message: `Which channel matters most right now?
1) WhatsApp
2) Website Chat
3) Email
4) Instagram/Facebook`,
      options: ['WhatsApp', 'Website Chat', 'Email', 'Instagram/Facebook'],
    },
    
    [STATES.BOOK_CHANNEL]: {
      message: `Thanks. Last question: what's your main goal?
1) More leads & sales
2) Faster support
3) Bookings & scheduling
4) Operations automation`,
      options: ['More leads & sales', 'Faster support', 'Bookings & scheduling', 'Operations automation'],
    },
    
    [STATES.BOOK_GOAL]: {
      message: 'Done. Here\'s the next step: [insert booking link] or I can propose the best plan for you.',
    },
    
    [STATES.BOOK_SEND_LINK]: {
      message: data.bookingLink 
        ? `Perfect. Please choose an exact date and time here: ${data.bookingLink}. Your timezone is ${data.timezone || 'UTC'}.`
        : 'Thanks. A human will confirm available times during business hours. What\'s your preferred date (DD/MM) and timezone?',
      preferenceMessage: (preference) => `Got it — I'll prioritize ${preference}. Please pick the exact time in the booking link: ${data.bookingLink || '[booking link]'}.`,
    },
    
    [STATES.BOOK_AWAIT_CONFIRMATION]: {
      message: 'Once you pick a time, I\'ll be ready here if you need anything.',
    },
    
    [STATES.BOOK_CONFIRMED]: {
      message: data.booking_id && data.start_datetime && data.timezone
        ? `Your demo is confirmed for ${data.start_datetime} ${data.timezone}. Check your email for the calendar invite.`
        : 'Waiting for booking confirmation...',
    },
  };
  
  return scripts[state] || { message: 'How can I help you?' };
}

/**
 * Get welcome message (always the same)
 */
export function getWelcomeMessage() {
  return getScript(STATES.WELCOME);
}

/**
 * Get menu message
 */
export function getMenuMessage() {
  return getScript(STATES.WELCOME); // Same as welcome
}

/**
 * Get booking preference response
 */
export function getBookingPreferenceResponse(preference, bookingLink) {
  if (!bookingLink) {
    return 'Thanks. A human will confirm available times during business hours. What\'s your preferred date (DD/MM) and timezone?';
  }
  
  return `Thanks — ${preference} is noted as your preference. To lock an exact time, please choose a slot here: ${bookingLink}.`;
}

/**
 * Get booking confirmation message (ONLY if booking is confirmed)
 */
export function getBookingConfirmationMessage(bookingData) {
  const { booking_id, start_datetime, timezone, status } = bookingData;
  
  // CRITICAL: Only confirm if we have real booking data
  if (!booking_id || !start_datetime || !timezone || status !== 'confirmed') {
    return null; // Don't send confirmation message
  }
  
  return `Your demo is confirmed for ${start_datetime} ${timezone}. Check your email for the calendar invite.`;
}

/**
 * Get error message for invalid input
 */
export function getInvalidInputMessage(state, inputType) {
  const messages = {
    email: 'That doesn\'t look like a valid email. Please provide your work email.',
    phone: 'That doesn\'t look like a valid phone number. Please include country code (e.g., +1234567890).',
    name: 'Please provide your name (at least 2 characters).',
  };
  
  return messages[inputType] || 'Invalid input. Please try again.';
}

/**
 * Get redirect message (when user goes off-topic)
 */
export function getRedirectMessage(state, expectedInput) {
  const messages = {
    [STATES.BOOK_NAME]: 'Just to confirm, what\'s your first name?',
    [STATES.BOOK_EMAIL]: 'Just to confirm, what\'s your work email?',
    [STATES.BOOK_PHONE]: 'Just to confirm, what\'s your phone number?',
    [STATES.BOOK_COMPANY]: 'Just to confirm, what\'s your company name?',
    [STATES.BOOK_EMPLOYEES]: 'Just to confirm, how many employees does your company have?',
    [STATES.BOOK_CHANNEL]: 'Just to confirm, which channel matters most to you?',
    [STATES.BOOK_GOAL]: 'Just to confirm, what\'s your main goal?',
  };
  
  return messages[state] || 'Let\'s continue. ' + expectedInput;
}

export default {
  getScript,
  getWelcomeMessage,
  getMenuMessage,
  getBookingPreferenceResponse,
  getBookingConfirmationMessage,
  getInvalidInputMessage,
  getRedirectMessage,
};
