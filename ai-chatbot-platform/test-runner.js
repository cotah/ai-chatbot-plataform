/**
 * Automated Test Runner
 * Tests all critical scenarios
 */

const API_URL = 'http://localhost:3001';
let sessionId = `sess_${Date.now()}_${Math.random().toString(36).slice(2)}`;
let conversationId = null;

const stats = {
  total: 0,
  passed: 0,
  failed: 0,
};

function log(message, emoji = '📝') {
  console.log(`${emoji} ${message}`);
}

function logSuccess(message) {
  log(message, '✅');
}

function logError(message) {
  log(message, '❌');
}

function logInfo(message) {
  log(message, 'ℹ️');
}

async function sendRequest(body) {
  const response = await fetch(`${API_URL}/api/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-session-id': sessionId,
    },
    body: JSON.stringify(body),
  });

  const data = await response.json();
  
  return {
    ok: response.ok,
    status: response.status,
    data,
  };
}

async function test(name, fn) {
  stats.total++;
  console.log(`\n${'='.repeat(60)}`);
  log(`TEST ${stats.total}: ${name}`, '🧪');
  console.log('='.repeat(60));
  
  try {
    await fn();
    stats.passed++;
    logSuccess(`TEST PASSED: ${name}`);
    return true;
  } catch (error) {
    stats.failed++;
    logError(`TEST FAILED: ${name}`);
    logError(`Error: ${error.message}`);
    return false;
  }
}

async function testHealthCheck() {
  await test('Health Check', async () => {
    const response = await fetch(`${API_URL}/api/health`);
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(`Health check failed with status ${response.status}`);
    }
    
    if (data.status !== 'healthy') {
      throw new Error(`Expected status 'healthy', got '${data.status}'`);
    }
    
    logInfo(`Health check response: ${JSON.stringify(data)}`);
  });
}

async function testFirstMessage() {
  await test('First Message', async () => {
    conversationId = null; // Reset
    
    const result = await sendRequest({
      message: 'Hello, this is my first message',
    });
    
    logInfo(`Status: ${result.status}`);
    logInfo(`Response: ${JSON.stringify(result.data, null, 2)}`);
    
    if (!result.ok) {
      throw new Error(`Request failed: ${result.data.error || 'Unknown error'}`);
    }
    
    if (!result.data.conversationId) {
      throw new Error('No conversationId returned');
    }
    
    if (!result.data.message) {
      throw new Error('No message returned');
    }
    
    conversationId = result.data.conversationId;
    logInfo(`ConversationId: ${conversationId}`);
  });
}

async function testSubsequentMessage() {
  await test('Subsequent Message', async () => {
    if (!conversationId) {
      throw new Error('No conversationId available (run first message test first)');
    }
    
    const result = await sendRequest({
      message: 'This is my second message',
      conversationId,
    });
    
    logInfo(`Status: ${result.status}`);
    logInfo(`Response: ${JSON.stringify(result.data, null, 2)}`);
    
    if (!result.ok) {
      throw new Error(`Request failed: ${result.data.error || 'Unknown error'}`);
    }
    
    if (!result.data.conversationId) {
      throw new Error('No conversationId returned');
    }
    
    if (result.data.conversationId !== conversationId) {
      throw new Error(`ConversationId changed from ${conversationId} to ${result.data.conversationId}`);
    }
    
    if (!result.data.message) {
      throw new Error('No message returned');
    }
    
    logInfo(`ConversationId maintained: ${result.data.conversationId}`);
  });
}

async function testMultipleMessages() {
  await test('Multiple Messages in Same Conversation', async () => {
    if (!conversationId) {
      throw new Error('No conversationId available');
    }
    
    for (let i = 3; i <= 5; i++) {
      logInfo(`Sending message ${i}...`);
      
      const result = await sendRequest({
        message: `This is message number ${i}`,
        conversationId,
      });
      
      if (!result.ok) {
        throw new Error(`Message ${i} failed: ${result.data.error || 'Unknown error'}`);
      }
      
      if (result.data.conversationId !== conversationId) {
        throw new Error(`ConversationId changed on message ${i}`);
      }
      
      logInfo(`Message ${i} OK - conversationId maintained`);
    }
  });
}

async function testLanguageChange() {
  await test('Language Change', async () => {
    const result = await sendRequest({
      message: '',
      conversationId,
      languageOverride: 'pt-BR',
    });
    
    logInfo(`Status: ${result.status}`);
    logInfo(`Response: ${JSON.stringify(result.data, null, 2)}`);
    
    if (!result.ok) {
      throw new Error(`Request failed: ${result.data.error || 'Unknown error'}`);
    }
    
    if (result.data.language !== 'pt-BR') {
      throw new Error(`Expected language 'pt-BR', got '${result.data.language}'`);
    }
    
    logInfo('Language changed successfully');
  });
}

async function testInvalidConversationId() {
  await test('Invalid ConversationId Format', async () => {
    const result = await sendRequest({
      message: 'Test with invalid conversation ID',
      conversationId: 'invalid_format_123',
    });
    
    logInfo(`Status: ${result.status}`);
    logInfo(`Response: ${JSON.stringify(result.data, null, 2)}`);
    
    // Should return 400 with validation error
    if (result.status !== 400) {
      throw new Error(`Expected status 400, got ${result.status}`);
    }
    
    if (!result.data.error) {
      throw new Error('Expected error message in response');
    }
    
    logInfo('Invalid conversationId properly rejected');
  });
}

async function testEmptyMessage() {
  await test('Empty Message Without Language', async () => {
    const result = await sendRequest({
      message: '',
      conversationId,
    });
    
    logInfo(`Status: ${result.status}`);
    logInfo(`Response: ${JSON.stringify(result.data, null, 2)}`);
    
    // Should return 400
    if (result.status !== 400) {
      throw new Error(`Expected status 400, got ${result.status}`);
    }
    
    logInfo('Empty message properly rejected');
  });
}

async function testMessageTooLong() {
  await test('Message Too Long', async () => {
    const longMessage = 'a'.repeat(2001);
    
    const result = await sendRequest({
      message: longMessage,
      conversationId,
    });
    
    logInfo(`Status: ${result.status}`);
    
    // Should return 400
    if (result.status !== 400) {
      throw new Error(`Expected status 400, got ${result.status}`);
    }
    
    logInfo('Long message properly rejected');
  });
}

async function testNewConversationAfterInvalid() {
  await test('New Conversation After Invalid ID', async () => {
    const result = await sendRequest({
      message: 'Starting fresh conversation',
      conversationId: null,
    });
    
    logInfo(`Status: ${result.status}`);
    logInfo(`Response: ${JSON.stringify(result.data, null, 2)}`);
    
    if (!result.ok) {
      throw new Error(`Request failed: ${result.data.error || 'Unknown error'}`);
    }
    
    if (!result.data.conversationId) {
      throw new Error('No conversationId returned');
    }
    
    const newConvId = result.data.conversationId;
    logInfo(`New conversation created: ${newConvId}`);
    
    // Verify it's different from previous
    if (newConvId === conversationId) {
      throw new Error('Expected new conversationId, got same as before');
    }
    
    conversationId = newConvId;
  });
}

async function runAllTests() {
  console.log('\n' + '='.repeat(60));
  console.log('🚀 AI CHATBOT PLATFORM - AUTOMATED TEST SUITE');
  console.log('='.repeat(60));
  console.log(`📅 Date: ${new Date().toISOString()}`);
  console.log(`🔗 API URL: ${API_URL}`);
  console.log(`🆔 Session ID: ${sessionId}`);
  console.log('='.repeat(60));
  
  // Run tests in sequence
  await testHealthCheck();
  await testFirstMessage();
  await testSubsequentMessage();
  await testMultipleMessages();
  await testLanguageChange();
  await testInvalidConversationId();
  await testEmptyMessage();
  await testMessageTooLong();
  await testNewConversationAfterInvalid();
  
  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total Tests: ${stats.total}`);
  console.log(`✅ Passed: ${stats.passed}`);
  console.log(`❌ Failed: ${stats.failed}`);
  
  const passRate = ((stats.passed / stats.total) * 100).toFixed(1);
  console.log(`📈 Pass Rate: ${passRate}%`);
  console.log('='.repeat(60));
  
  if (stats.failed === 0) {
    console.log('\n🎉 ALL TESTS PASSED! 🎉');
    console.log('✅ Chatbot is ready for production!\n');
    process.exit(0);
  } else {
    console.log(`\n⚠️  ${stats.failed} TEST(S) FAILED`);
    console.log('❌ Please review and fix the issues above.\n');
    process.exit(1);
  }
}

// Run tests
runAllTests().catch((error) => {
  console.error('\n❌ FATAL ERROR:', error);
  process.exit(1);
});
