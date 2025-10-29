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
    
    // Separate primary tickets from add-ons
    const primaryTickets = costItems.filter(item => 
      item.is_add_on === false || item.rate_type === 'Rate'
    );
    const addOns = costItems.filter(item => 
      item.is_add_on === true || item.rate_type === 'AddOnRate'
    );
    
    // Check if this ticket has the target add-on
    const targetTicketType = process.env.TARGET_TICKET_TYPE;
    console.log(`\nChecking ticket ${ticket.id} for add-on "${targetTicketType}"`);
    
    const hasTargetAddon = addOns.some(item => {
      const rate = payload.rates?.find(r => r.id === item.rate_id);
      const itemName = rate?.name || item.name || '';
      console.log(`  Add-on: "${itemName}", is_add_on: ${item.is_add_on}, rate_type: ${item.rate_type}`);
      
      // Check if it contains "Memento Ticket" (case-insensitive)
      const containsMementoTicket = itemName.toLowerCase().includes('memento ticket');
      console.log(`  Contains "memento ticket": ${containsMementoTicket}`);
      return containsMementoTicket;
    });
    
    console.log(`Ticket ${ticket.id} has target add-on: ${hasTargetAddon}`);
    
    // If we're looking for a specific add-on and this ticket doesn't have it, skip
    if (targetTicketType !== 'ALL' && !hasTargetAddon) {
      continue;
    }
    
    // Get primary ticket (non-add-on) for primary info
    const primaryTicket = primaryTickets[0] || costItems[0];
    console.log(`Primary ticket found: ${primaryTicket?.name}, is_add_on: ${primaryTicket?.is_add_on}`);
    
    // Find address from host_fields
    let address = '';
    let city = '';
    let state = '';
    let zip = '';
    if (payload.host_fields && ticket.host_field_ids) {
      const addressField = payload.host_fields.find(hf => 
        ticket.host_field_ids.includes(hf.id) && 
        hf.name === 'Address'
      );
      if (addressField?.value) {
        address = addressField.value;
        // Parse address components
        const addressParts = address.split(',').map(s => s.trim());
        if (addressParts.length >= 3) {
          // Assumes format: "Street, City, State ZIP, Country"
          city = addressParts[addressParts.length - 3] || '';
          const stateZip = addressParts[addressParts.length - 2] || '';
          const stateZipMatch = stateZip.match(/([A-Z]{2})\s+(\d{5}(?:-\d{4})?)/);
          if (stateZipMatch) {
            state = stateZipMatch[1];
            zip = stateZipMatch[2];
          }
        }
      }
    }

    // Get primary ticket rate info
    const primaryRate = payload.rates?.find(r => r.id === primaryTicket.rate_id);
    const primaryTicketName = primaryRate?.name || primaryTicket.name || '';
    console.log(`Primary rate: ${primaryRate?.name}, primary ticket name: ${primaryTicket?.name}`);
    
    // Get all add-on names
    const addOnNames = addOns.map(addon => {
      const rate = payload.rates?.find(r => r.id === addon.rate_id);
      return rate?.name || addon.name || '';
    }).filter(name => name).join(', ');
    
    // Find venue information
    const venueName = payload.listings?.[0]?.venue_name || '';
    const venueAddress = payload.listings?.[0]?.address || '';
    
    // Calculate total price (for now, just use primary ticket price)
    const price = parseFloat(primaryRate?.price || primaryRate?.src_price || primaryTicket?.src_price || 0);
    
    // Create one record per ticket
    const ticketData = {
      purchaseDate: new Date(ticket.created_at).toLocaleDateString('en-US', { timeZone: 'America/New_York' }),
      purchaseTime: new Date(ticket.created_at).toLocaleTimeString('en-US', { timeZone: 'America/New_York' }),
      eventDate: new Date(event.start_stamp * 1000).toLocaleDateString(),
      eventTime: new Date(event.start_stamp * 1000).toLocaleTimeString(),
      attendeeName: `${primaryTicket.first_name || primaryTicket.guest_first_name || ''} ${primaryTicket.last_name || primaryTicket.guest_last_name || ''}`.trim(),
      email: primaryTicket.guest_email || ticket.buyer_email || '',
      address: address,
      city: city,
      state: state,
      zip: zip,
      ticketName: primaryTicketName, // Primary ticket only
      addOnName: addOnNames, // Add-ons only, comma-separated
      eventTitle: payload.listings?.[0]?.title || '',
      venueName: venueName,
      venueAddress: venueAddress,
      eventStartTime: new Date(event.start_stamp * 1000).toISOString(),
      eventEndTime: new Date(event.end_stamp * 1000).toISOString(),
      ticketId: ticket.id,
      costItemId: primaryTicket.id, // Use primary ticket's cost item ID
      qrCode: primaryTicket.qr_code || '',
      ticketStatus: primaryTicket.state || ticket.state || '',
      paymentStatus: ticket.payment_state || '',
      price: price,
      currency: ticket.src_currency || 'USD',
    };

    console.log(`Adding ticket record: ${ticketData.ticketId}`);
    console.log(`Primary ticket: "${ticketData.ticketName}", Add-ons: "${ticketData.addOnName}"`);
    console.log(`Venue: ${ticketData.venueName} at ${ticketData.venueAddress}`);
    console.log(`DEBUG - Row data mapping:`, {
      ticketName: ticketData.ticketName,
      addOnName: ticketData.addOnName,
      primaryTicketName,
      addOnNames
    });
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

// Vercel serverless function handler  
// Deploy timestamp: 2025-10-29T00:52:00.000Z
export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Uniiverse-Signature');
  
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
    
    console.log('=== WEBHOOK RECEIVED (v2.0 - Fixed Field Mapping) ===');
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
        ticketName: t.ticketName,
        addOnName: t.addOnName,
        attendee: t.attendeeName,
        ticketId: t.ticketId 
      })));
    } else {
      console.log('No tickets found with the target add-on');
    }

    if (filteredTicketData.length > 0) {
      // Check event type
      const eventType = payload.event || 'ticket_purchase';
      console.log(`Event type: ${eventType}`);
      
      if (eventType === 'ticket_update') {
        // Update existing rows
        console.log('Processing ticket update event');
        
        for (const data of filteredTicketData) {
          // Read all rows to find the one to update
          const response = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: `${SHEET_NAME}!A:Z`,
          });
          
          const rows = response.data.values || [];
          const headers = rows[0] || [];
          const costItemIdIndex = headers.indexOf('Cost Item ID');
          
          if (costItemIdIndex === -1) {
            console.error('Cost Item ID column not found in sheet');
            continue;
          }
          
          // Find row with matching cost item ID
          let rowIndex = -1;
          for (let i = 1; i < rows.length; i++) {
            if (rows[i][costItemIdIndex] === data.costItemId) {
              rowIndex = i;
              break;
            }
          }
          
          if (rowIndex > 0) {
            console.log(`Found existing row at index ${rowIndex + 1} for cost item ${data.costItemId}`);
            
            // Prepare updated row data
            const updatedRow = [
              data.purchaseDate,
              data.purchaseTime,
              data.eventDate,
              data.eventTime,
              data.attendeeName,
              data.email,
              data.address,
              data.city,
              data.state,
              data.zip,
              data.ticketName,
              data.addOnName,
              data.eventTitle,
              data.venueName,
              data.venueAddress,
              data.eventStartTime,
              data.eventEndTime,
              data.ticketId,
              data.costItemId,
              data.qrCode,
              data.ticketStatus,
              data.paymentStatus,
              data.price,
              data.currency,
            ];
            
            // Update the specific row
            await sheets.spreadsheets.values.update({
              spreadsheetId: SPREADSHEET_ID,
              range: `${SHEET_NAME}!A${rowIndex + 1}:Z${rowIndex + 1}`,
              valueInputOption: 'USER_ENTERED',
              resource: { values: [updatedRow] },
            });
            
            console.log(`Updated row ${rowIndex + 1} successfully`);
          } else {
            console.log(`No existing row found for cost item ${data.costItemId}, appending new row`);
            
            // Append as new row if not found
            const values = [[
              data.purchaseDate,
              data.purchaseTime,
              data.eventDate,
              data.eventTime,
              data.attendeeName,
              data.email,
              data.address,
              data.city,
              data.state,
              data.zip,
              data.ticketName,
              data.addOnName,
              data.eventTitle,
              data.venueName,
              data.venueAddress,
              data.eventStartTime,
              data.eventEndTime,
              data.ticketId,
              data.costItemId,
              data.qrCode,
              data.ticketStatus,
              data.paymentStatus,
              data.price,
              data.currency,
            ]];
            
            await sheets.spreadsheets.values.append({
              spreadsheetId: SPREADSHEET_ID,
              range: `${SHEET_NAME}!A:Z`,
              valueInputOption: 'USER_ENTERED',
              requestBody: { values },
            });
          }
        }
        
        console.log(`Processed ${filteredTicketData.length} ticket update(s)`);
      } else {
        // Append new data for ticket_purchase events
        const values = filteredTicketData.map(data => [
          data.purchaseDate,
          data.purchaseTime,
          data.eventDate,
          data.eventTime,
          data.attendeeName,
          data.email,
          data.address,
          data.city,
          data.state,
          data.zip,
          data.ticketName,
          data.addOnName,
          data.eventTitle,
          data.venueName,
          data.venueAddress,
          data.eventStartTime,
          data.eventEndTime,
          data.ticketId,
          data.costItemId,
          data.qrCode,
          data.ticketStatus,
          data.paymentStatus,
          data.price,
          data.currency,
        ]);

        await sheets.spreadsheets.values.append({
          spreadsheetId: SPREADSHEET_ID,
          range: `${SHEET_NAME}!A:Z`,
          valueInputOption: 'USER_ENTERED',
          requestBody: { values },
        });
        
        console.log(`${values.length} row(s) appended to sheet successfully`);
      }
      
      return res.status(200).json({ 
        status: 'success', 
        message: `Processed ${filteredTicketData.length} ticket(s) (${eventType})` 
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