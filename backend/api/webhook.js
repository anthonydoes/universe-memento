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
  const results = [];
  
  // Process each ticket in the tickets array
  if (!payload.tickets || !Array.isArray(payload.tickets)) {
    console.error('No tickets array found in payload');
    return results;
  }

  for (const ticket of payload.tickets) {
    // Find the related event
    const event = payload.events?.find(e => e.id === ticket.event_id);
    if (!event) {
      console.error(`Event not found for ticket ${ticket.id}`);
      continue;
    }

    // Process each cost item for this ticket
    const costItems = payload.cost_items?.filter(ci => ticket.cost_item_ids?.includes(ci.id)) || [];
    
    for (const costItem of costItems) {
      // Find the rate information
      const rate = payload.rates?.find(r => r.id === costItem.rate_id);
      
      // Find address from host_fields
      let address = '';
      if (payload.host_fields && ticket.host_field_ids) {
        const addressField = payload.host_fields.find(hf => 
          ticket.host_field_ids.includes(hf.id) && 
          hf.name === 'Address'
        );
        address = addressField?.value || '';
      }

      // Extract ticket data
      const ticketData = {
        purchaseDate: new Date(ticket.created_at).toLocaleDateString('en-US', { timeZone: 'America/New_York' }),
        purchaseTime: new Date(ticket.created_at).toLocaleTimeString('en-US', { timeZone: 'America/New_York' }),
        eventDate: new Date(event.start_stamp * 1000).toLocaleDateString(),
        eventTime: new Date(event.start_stamp * 1000).toLocaleTimeString(),
        attendeeName: `${costItem.first_name || costItem.guest_first_name || ''} ${costItem.last_name || costItem.guest_last_name || ''}`.trim(),
        email: costItem.guest_email || ticket.buyer_email || '',
        address: address,
        rateName: rate?.name || costItem.name || '',
        eventTitle: payload.listings?.[0]?.title || '',
        eventAddress: payload.listings?.[0]?.address || '',
        hostName: payload.listings?.[0]?.host_name || '',
        eventStartTime: new Date(event.start_stamp * 1000).toISOString(),
        eventEndTime: new Date(event.end_stamp * 1000).toISOString(),
        ticketId: ticket.id,
        costItemId: costItem.id,
        ticketStatus: costItem.state || ticket.state || '',
        paymentStatus: ticket.payment_state || '',
        price: parseFloat(rate?.price || rate?.src_price || costItem.src_price || 0),
        currency: ticket.src_currency || 'USD',
        quantity: rate?.qty || 1,
      };

      results.push(ticketData);
    }
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
    
    console.log('Webhook received:', {
      hasSignature: !!signature,
      hasSecret: !!secret,
      bodyLength: rawBody.length,
      method: req.method,
      contentType: req.headers['content-type'],
      userAgent: req.headers['user-agent']
    });

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
    
    // Extract all ticket data from the payload
    const allTicketData = extractTicketData(payload);
    console.log('Extracted ticket data count:', allTicketData.length);
    
    // Filter by target ticket type
    const targetTicketType = process.env.TARGET_TICKET_TYPE;
    const filteredTicketData = allTicketData.filter(ticket => 
      targetTicketType === 'ALL' || ticket.rateName === targetTicketType
    );

    console.log('Filtered ticket data count:', filteredTicketData.length);
    console.log('Target ticket type:', targetTicketType);

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
      message: `No tickets matched target type: ${targetTicketType}` 
    });
  } catch (error) {
    console.error('Webhook error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
}