import fetch from 'node-fetch';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

const WEBHOOK_URL = 'http://localhost:3001/api/webhook';
const WEBHOOK_SECRET = process.env.UNIVERSE_WEBHOOK_SECRET || 'gj5Ghy&x';

// Helper to create signature
function createSignature(payload, secret) {
  return crypto
    .createHmac('sha1', secret)
    .update(JSON.stringify(payload))
    .digest('hex');
}

// Test payload for ticket purchase with add-on
const purchasePayload = {
  event: 'ticket_purchase',
  listings: [{
    id: '123',
    title: 'Test Event 2024',
    address: '123 Main St, Los Angeles, CA 90001, USA',
    venue_name: 'The Test Venue',
    host_name: 'Test Host'
  }],
  events: [{
    id: 'event123',
    start_stamp: Math.floor(Date.now() / 1000) + 86400, // Tomorrow
    end_stamp: Math.floor(Date.now() / 1000) + 90000,   // Tomorrow + 25 hours
  }],
  tickets: [{
    id: 'ticket123',
    event_id: 'event123',
    created_at: new Date().toISOString(),
    state: 'active',
    payment_state: 'success',
    buyer_email: 'buyer@example.com',
    src_currency: 'USD',
    cost_item_ids: ['cost123', 'cost456'],
    host_field_ids: ['field123']
  }],
  cost_items: [
    {
      id: 'cost123',
      name: 'General Admission',
      rate_id: 'rate123',
      is_add_on: false,
      rate_type: 'Rate',
      src_price: 50,
      state: 'active',
      first_name: 'John',
      last_name: 'Doe',
      guest_email: 'john.doe@example.com',
      qr_code: 'QR123456'
    },
    {
      id: 'cost456',
      name: 'Memento Ticket 🎟️',
      rate_id: 'rate456',
      is_add_on: true,
      rate_type: 'AddOnRate',
      src_price: 10,
      state: 'active'
    }
  ],
  rates: [
    {
      id: 'rate123',
      name: 'General Admission',
      price: 50
    },
    {
      id: 'rate456',
      name: 'Memento Ticket 🎟️',
      price: 10
    }
  ],
  host_fields: [{
    id: 'field123',
    name: 'Address',
    context: 'Ticket',
    value: '456 Oak Street, Suite 200, San Francisco, CA 94102'
  }]
};

// Test payload for ticket update (cancellation)
const updatePayload = {
  event: 'ticket_update',
  listings: [{
    id: '123',
    title: 'Test Event 2024',
    address: '123 Main St, Los Angeles, CA 90001, USA',
    venue_name: 'The Test Venue',
    host_name: 'Test Host'
  }],
  events: [{
    id: 'event123',
    start_stamp: Math.floor(Date.now() / 1000) + 86400,
    end_stamp: Math.floor(Date.now() / 1000) + 90000,
  }],
  tickets: [{
    id: 'ticket123',
    event_id: 'event123',
    created_at: new Date().toISOString(),
    state: 'cancelled',
    payment_state: 'refunded',
    buyer_email: 'buyer@example.com',
    src_currency: 'USD',
    cost_item_ids: ['cost123', 'cost456'],
    host_field_ids: ['field123']
  }],
  cost_items: [
    {
      id: 'cost123',
      name: 'General Admission',
      rate_id: 'rate123',
      is_add_on: false,
      rate_type: 'Rate',
      src_price: 50,
      state: 'cancelled',
      first_name: 'John',
      last_name: 'Doe',
      guest_email: 'john.doe@example.com',
      qr_code: 'QR123456'
    },
    {
      id: 'cost456',
      name: 'Memento Ticket 🎟️',
      rate_id: 'rate456',
      is_add_on: true,
      rate_type: 'AddOnRate',
      src_price: 10,
      state: 'cancelled'
    }
  ],
  rates: [
    {
      id: 'rate123',
      name: 'General Admission',
      price: 50
    },
    {
      id: 'rate456',
      name: 'Memento Ticket 🎟️',
      price: 10
    }
  ],
  host_fields: [{
    id: 'field123',
    name: 'Address',
    context: 'Ticket',
    value: '456 Oak Street, Suite 200, San Francisco, CA 94102'
  }]
};

async function testWebhook(payload, description) {
  console.log(`\n=== Testing ${description} ===`);
  
  const signature = createSignature(payload, WEBHOOK_SECRET);
  
  try {
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Universe-Signature': signature
      },
      body: JSON.stringify(payload)
    });
    
    const result = await response.json();
    console.log('Response status:', response.status);
    console.log('Response:', result);
    
    if (response.ok) {
      console.log('✅ Test passed!');
    } else {
      console.log('❌ Test failed!');
    }
  } catch (error) {
    console.error('Error:', error.message);
    console.log('❌ Test failed!');
  }
}

async function runTests() {
  console.log('Starting webhook integration tests...');
  console.log('Webhook URL:', WEBHOOK_URL);
  console.log('Using secret:', WEBHOOK_SECRET ? 'Yes' : 'No');
  
  // Test 1: Purchase event
  await testWebhook(purchasePayload, 'Ticket Purchase Event');
  
  // Wait 2 seconds between tests
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Test 2: Update event (should update existing row)
  await testWebhook(updatePayload, 'Ticket Update Event (Cancellation)');
  
  console.log('\n=== Tests Complete ===');
  console.log('Check your Google Sheet to verify:');
  console.log('1. First test should create a new row with status "active"');
  console.log('2. Second test should update the same row to status "cancelled"');
  console.log('3. Ticket Name column should only show "General Admission"');
  console.log('4. Add-on Name column should show "Memento Ticket 🎟️"');
  console.log('5. Venue Name and Address should be populated');
}

// Run the tests
runTests().catch(console.error);