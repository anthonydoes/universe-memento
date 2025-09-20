import crypto from 'crypto';
import { google } from 'googleapis';

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
  // Universe uses SHA-1 for their HMAC signatures
  const expectedSignature = crypto
    .createHmac('sha1', secret)
    .update(payload)
    .digest('hex');
  
  console.log('Expected SHA-1 signature:', expectedSignature);
  console.log('Received signature:', signature);
  
  return expectedSignature === signature;
}

// Extract ticket data from webhook payload
function extractTicketData(payload) {
  console.log('=== EXTRACT TICKET DATA CALLED ===');
  const results = [];
  
  // Process each ticket in the tickets array
  if (!payload.tickets || !Array.isArray(payload.tickets)) {
    console.error('No tickets array found in payload');
    return results;
  }
  
  console.log(`Processing ${payload.tickets.length} ticket(s) from payload`);

  for (const ticket of payload.tickets) {
    // Find the related event
    const event = payload.events?.find(e => e.id === ticket.event_id);
    if (!event) {
      console.error(`Event not found for ticket ${ticket.id}`);
      continue;
    }

    // Get all cost items for this ticket
    const costItems = payload.cost_items?.filter(ci => ticket.cost_item_ids?.includes(ci.id)) || [];
    
    // Check if this ticket has the target add-on
    const targetTicketType = process.env.TARGET_TICKET_TYPE;
    console.log(`\nChecking ticket ${ticket.id} for add-on "${targetTicketType}"`);
    
    const hasTargetAddon = costItems.some(item => {
      const rate = payload.rates?.find(r => r.id === item.rate_id);
      const itemName = rate?.name || item.name || '';
      console.log(`  Cost item: "${itemName}", is_add_on: ${item.is_add_on}, rate_type: ${item.rate_type}`);
      
      // Check if it's an add-on that contains "Memento Ticket" (case-insensitive)
      const containsMementoTicket = itemName.toLowerCase().includes('memento ticket');
      console.log(`  Contains "memento ticket": ${containsMementoTicket}`);
      console.log(`  Match check: contains("memento ticket") && ${item.is_add_on} === true`);
      const matches = containsMementoTicket && item.is_add_on === true;
      console.log(`  Result: ${matches}`);
      return matches;
    });
    
    console.log(`Ticket ${ticket.id} has target add-on: ${hasTargetAddon}`);
    
    // If we're looking for a specific add-on and this ticket doesn't have it, skip
    if (targetTicketType !== 'ALL' && !hasTargetAddon) {
      continue;
    }
    
    // Find the main ticket (non-add-on) for primary info
    const mainTicket = costItems.find(item => !item.is_add_on) || costItems[0];
    console.log(`Main ticket found: ${mainTicket?.name}, is_add_on: ${mainTicket?.is_add_on}`);
    
    // Find address from host_fields
    let address = '';
    if (payload.host_fields && ticket.host_field_ids) {
      const addressField = payload.host_fields.find(hf => 
        ticket.host_field_ids.includes(hf.id) && 
        hf.name === 'Address'
      );
      address = addressField?.value || '';
    }

    // Get main ticket rate info
    const mainRate = payload.rates?.find(r => r.id === mainTicket.rate_id);
    console.log(`Main rate: ${mainRate?.name}, main ticket name: ${mainTicket?.name}`);
    
    // Find the Memento Ticket add-on for display
    const mementoAddon = costItems.find(item => {
      const rate = payload.rates?.find(r => r.id === item.rate_id);
      const itemName = rate?.name || item.name || '';
      return itemName.toLowerCase().includes('memento ticket') && item.is_add_on === true;
    });
    const mementoRate = mementoAddon ? payload.rates?.find(r => r.id === mementoAddon.rate_id) : null;
    const mementoName = mementoRate?.name || mementoAddon?.name || 'Memento Ticket';
    console.log(`Memento add-on: ${mementoName}`);
    
    // Create one record per ticket (not per cost item)
    const ticketData = {
      purchaseDate: new Date(ticket.created_at).toLocaleDateString('en-US', { timeZone: 'America/New_York' }),
      purchaseTime: new Date(ticket.created_at).toLocaleTimeString('en-US', { timeZone: 'America/New_York' }),
      eventDate: new Date(event.start_stamp * 1000).toLocaleDateString(),
      eventTime: new Date(event.start_stamp * 1000).toLocaleTimeString(),
      attendeeName: `${mainTicket.first_name || mainTicket.guest_first_name || ''} ${mainTicket.last_name || mainTicket.guest_last_name || ''}`.trim(),
      email: mainTicket.guest_email || ticket.buyer_email || '',
      address: address,
      rateName: `${mainRate?.name || mainTicket.name || ''} + ${mementoName}`,
      eventTitle: payload.listings?.[0]?.title || '',
      eventAddress: payload.listings?.[0]?.address || '',
      hostName: payload.listings?.[0]?.host_name || '',
      eventStartTime: new Date(event.start_stamp * 1000).toISOString(),
      eventEndTime: new Date(event.end_stamp * 1000).toISOString(),
      ticketId: ticket.id,
      costItemId: mainTicket.id,
      ticketStatus: mainTicket.state || ticket.state || '',
      paymentStatus: ticket.payment_state || '',
      price: parseFloat(mainRate?.price || mainRate?.src_price || mainTicket.src_price || 0),
      currency: ticket.src_currency || 'USD',
      quantity: mainRate?.qty || 1,
    };

    console.log(`Adding ticket record: ${ticketData.ticketId} - ${ticketData.rateName}`);
    console.log(`Record details: attendee=${ticketData.attendeeName}, cost_item_id=${ticketData.costItemId}`);
    results.push(ticketData);
  }

  return results;
}


// Disable body parsing to get raw body
export const config = {
  api: {
    bodyParser: false,
  },
};

// Serverless function handler
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
    // Google Sheets setup
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_ID;
    const SHEET_NAME = process.env.SHEET_NAME || 'Universe-Webhook-Data';

    // Get raw body for signature verification
    const rawBody = await getRawBody(req);
    
    const signature = req.headers['x-uniiverse-signature'];
    const secret = process.env.UNIVERSE_WEBHOOK_SECRET;
    
    console.log('=== WEBHOOK RECEIVED ===');
    console.log('Timestamp:', new Date().toISOString());
    console.log('Headers:', JSON.stringify(req.headers, null, 2));
    console.log('Signature present:', !!signature);
    console.log('Secret present:', !!secret);
    console.log('Body length:', rawBody.length);
    console.log('TARGET_TICKET_TYPE:', process.env.TARGET_TICKET_TYPE);

    if (!signature || !secret) {
      console.error('Missing signature or secret');
      return res.status(401).json({ error: 'Missing signature or secret' });
    }

    // Verify signature
    const isValid = verifyWebhookSignature(rawBody, signature, secret);
    if (!isValid) {
      console.error('Invalid signature - check secret configuration');
      console.error('Make sure the secret in Universe matches:', secret);
      return res.status(401).json({ error: 'Invalid signature' });
    }

    const payload = JSON.parse(rawBody);
    console.log('Payload parsed successfully, tickets:', payload.tickets?.length || 0);
    
    // Extract ticket data from the payload (already filtered for target add-on)
    const filteredTicketData = extractTicketData(payload);
    console.log('Tickets with target add-on count:', filteredTicketData.length);
    console.log('Target add-on type:', process.env.TARGET_TICKET_TYPE);
    
    // Log details about what was found
    if (filteredTicketData.length > 0) {
      console.log('Matching tickets:', filteredTicketData.map(t => ({ 
        rateName: t.rateName, 
        attendee: t.attendeeName,
        ticketId: t.ticketId 
      })));
    } else {
      console.log('No tickets found with the target add-on');
    }

    if (filteredTicketData.length > 0) {
      // Append data to Google Sheets
      const values = filteredTicketData.map(data => [
        data.purchaseDate,
        data.purchaseTime,
        data.eventDate,
        data.eventTime,
        data.attendeeName,
        data.email,
        data.address,
        data.rateName,
        data.eventTitle,
        data.eventAddress,
        data.hostName,
        data.eventStartTime,
        data.eventEndTime,
        data.ticketId,
        data.costItemId,
        data.ticketStatus,
        data.paymentStatus,
        data.price,
        data.currency,
        data.quantity,
      ]);

      await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: `${SHEET_NAME}!A:T`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values },
      });
      
      console.log(`${values.length} row(s) appended to sheet successfully`);
      return res.status(200).json({ 
        status: 'success', 
        message: `Processed ${filteredTicketData.length} ticket(s)` 
      });
    }
    
    return res.status(200).json({ 
      status: 'ignored', 
      message: `No tickets matched target add-on: ${process.env.TARGET_TICKET_TYPE}` 
    });
  } catch (error) {
    console.error('Webhook error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
}