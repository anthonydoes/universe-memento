import crypto from 'crypto';
import { google } from 'googleapis';
import fs from 'fs';

// Helper function to get raw body from request
function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', chunk => {
      chunks.push(chunk);
    });
    req.on('end', () => {
      const body = Buffer.concat(chunks).toString('utf8');
      resolve(body);
    });
    req.on('error', reject);
  });
}

// Verify webhook signature
function verifyWebhookSignature(payload, signature, secret) {
  const expectedSignature = crypto
    .createHmac('sha1', secret)
    .update(payload)
    .digest('hex');
  
  console.log('Expected SHA-1 signature:', expectedSignature);
  console.log('Received signature:', signature);
  
  return expectedSignature === signature;
}

// Disable body parsing to get raw body
export const config = {
  api: {
    bodyParser: false,
  },
};

// Debug webhook handler that logs everything
export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Universe-Signature');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get raw body for signature verification
    const rawBody = await getRawBody(req);
    
    const signature = req.headers['x-uniiverse-signature'];
    const secret = process.env.UNIVERSE_WEBHOOK_SECRET;
    
    console.log('=== DEBUG WEBHOOK RECEIVED ===');
    console.log('Timestamp:', new Date().toISOString());
    console.log('Headers:', JSON.stringify(req.headers, null, 2));
    console.log('Signature present:', !!signature);
    console.log('Secret present:', !!secret);
    console.log('Body length:', rawBody.length);
    
    // Save the raw payload for analysis
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `webhook-debug-${timestamp}.json`;
    
    try {
      const payload = JSON.parse(rawBody);
      
      // Save formatted payload
      fs.writeFileSync(`/tmp/${filename}`, JSON.stringify(payload, null, 2));
      console.log(`Payload saved to /tmp/${filename}`);
      
      // Log key structures
      console.log('\n=== PAYLOAD ANALYSIS ===');
      console.log('Tickets count:', payload.tickets?.length || 0);
      console.log('Cost items count:', payload.cost_items?.length || 0);
      console.log('Events count:', payload.events?.length || 0);
      console.log('Rates count:', payload.rates?.length || 0);
      
      if (payload.tickets) {
        payload.tickets.forEach((ticket, i) => {
          console.log(`\nTicket ${i + 1}:`, {
            id: ticket.id,
            created_at: ticket.created_at,
            event_id: ticket.event_id,
            cost_item_ids: ticket.cost_item_ids
          });
        });
      }
      
      if (payload.cost_items) {
        payload.cost_items.forEach((item, i) => {
          console.log(`\nCost Item ${i + 1}:`, {
            id: item.id,
            name: item.name,
            is_add_on: item.is_add_on,
            rate_type: item.rate_type,
            rate_id: item.rate_id,
            ticket_id: item.ticket_id
          });
        });
      }
      
      if (payload.rates) {
        payload.rates.forEach((rate, i) => {
          console.log(`\nRate ${i + 1}:`, {
            id: rate.id,
            name: rate.name,
            type: rate.type,
            price: rate.price,
            display_price: rate.display_price
          });
        });
      }
      
      if (payload.events) {
        payload.events.forEach((event, i) => {
          console.log(`\nEvent ${i + 1}:`, {
            id: event.id,
            start_stamp: event.start_stamp,
            tz: event.tz,
            start_time: event.start_time
          });
        });
      }
      
    } catch (parseError) {
      console.error('Failed to parse payload:', parseError);
      fs.writeFileSync(`/tmp/${filename}`, rawBody);
    }

    return res.status(200).json({ 
      status: 'debug_logged',
      message: 'Webhook payload logged for analysis',
      filename: filename
    });
    
  } catch (error) {
    console.error('Debug webhook error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
}