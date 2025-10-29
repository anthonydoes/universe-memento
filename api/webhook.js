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
  const processedTicketIds = new Set(); // Track processed tickets to prevent duplicates
  
  // Process each ticket in the tickets array
  if (!payload.tickets || !Array.isArray(payload.tickets)) {
    console.error('No tickets array found in payload');
    return results;
  }
  
  console.log(`Processing ${payload.tickets.length} ticket(s) from payload`);

  for (const ticket of payload.tickets) {
    // Check for duplicate tickets
    if (processedTicketIds.has(ticket.id)) {
      console.log(`Skipping duplicate ticket ${ticket.id}`);
      continue;
    }
    processedTicketIds.add(ticket.id);
    
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
    
    // Find mailing address from host_fields
    let mailingAddress = '';
    if (payload.host_fields && ticket.host_field_ids) {
      const addressField = payload.host_fields.find(hf => 
        ticket.host_field_ids.includes(hf.id) && 
        (hf.name === 'Mailing Address' || hf.name === 'Address') // Support both for transition
      );
      if (addressField?.value) {
        mailingAddress = addressField.value;
      }
    }

    // Get primary ticket rate info
    const primaryRate = payload.rates?.find(r => r.id === primaryTicket.rate_id);
    const primaryTicketName = primaryRate?.name || primaryTicket.name || '';
    console.log(`Primary rate: ${primaryRate?.name}, primary ticket name: ${primaryTicket?.name}`);
    
    // Get all add-on names with quantities
    const addOnCounts = {};
    addOns.forEach(addon => {
      const rate = payload.rates?.find(r => r.id === addon.rate_id);
      const name = rate?.name || addon.name || '';
      if (name) {
        addOnCounts[name] = (addOnCounts[name] || 0) + 1;
      }
    });
    
    const addOnNames = Object.entries(addOnCounts)
      .map(([name, count]) => count > 1 ? `${name} (${count})` : name)
      .join(', ');
    
    // Find venue information
    const venueName = payload.listings?.[0]?.venue_name || '';
    const venueAddress = payload.listings?.[0]?.address || '';
    
    // Calculate pricing breakdown for ALL cost items in this ticket
    const totalFaceValue = costItems.reduce((sum, item) => {
      const rate = payload.rates?.find(r => r.id === item.rate_id);
      const price = parseFloat(rate?.src_price || item.src_price || 0);
      return sum + price;
    }, 0);
    
    const totalOrderPrice = parseFloat(ticket.price || ticket.src_price || 0);
    const totalFees = Math.max(0, totalOrderPrice - totalFaceValue);
    
    console.log(`Pricing breakdown for ticket ${ticket.id} (${costItems.length} items):`);
    console.log(`  Total face value: $${totalFaceValue} (sum of all ${costItems.length} items)`);
    console.log(`  Total order price: $${totalOrderPrice}`);
    console.log(`  Total fees: $${totalFees}`);
    
    // Create one record per ticket
    const ticketData = {
      purchaseDate: new Date(ticket.created_at).toLocaleDateString('en-US', { timeZone: 'America/New_York' }),
      purchaseTime: new Date(ticket.created_at).toLocaleTimeString('en-US', { timeZone: 'America/New_York' }),
      eventDate: new Date(event.start_stamp * 1000).toLocaleDateString(),
      eventTime: new Date(event.start_stamp * 1000).toLocaleTimeString(),
      attendeeName: `${primaryTicket.first_name || primaryTicket.guest_first_name || ''} ${primaryTicket.last_name || primaryTicket.guest_last_name || ''}`.trim(),
      email: primaryTicket.guest_email || ticket.buyer_email || '',
      mailingAddress: mailingAddress,
      ticketName: primaryTicketName, // Primary ticket only
      addOnName: addOnNames, // Add-ons with quantities, comma-separated
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
      totalTicketPrice: totalOrderPrice,
      faceValuePrice: totalFaceValue,
      fees: totalFees,
      currency: ticket.src_currency || 'USD',
    };

    console.log(`Adding ticket record: ${ticketData.ticketId}`);
    console.log(`Primary ticket: "${ticketData.ticketName}", Add-ons: "${ticketData.addOnName}"`);
    console.log(`Venue: ${ticketData.venueName} at ${ticketData.venueAddress}`);
    console.log(`Pricing: Total=$${ticketData.totalTicketPrice}, Face=$${ticketData.faceValuePrice}, Fees=$${ticketData.fees}`);
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
// Deploy timestamp: 2025-10-29T02:15:00.000Z
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
    
    console.log('=== WEBHOOK RECEIVED (v7.0 - Fix Ticket ID Lookup) ===');
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
        ticketId: t.ticketId,
        totalPrice: t.totalTicketPrice,
        faceValue: t.faceValuePrice,
        fees: t.fees
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
        console.log('Full payload cost_items:', JSON.stringify(payload.cost_items, null, 2));
        console.log('Full payload tickets:', JSON.stringify(payload.tickets, null, 2));
        
        console.log(`Processing ${filteredTicketData.length} ticket update(s):`);
        filteredTicketData.forEach((data, index) => {
          console.log(`  Ticket ${index + 1}: ID=${data.ticketId}, Cost Item ID=${data.costItemId}`);
        });
        
        // Group by ticket ID to avoid duplicate processing
        const ticketGroups = {};
        filteredTicketData.forEach(data => {
          if (!ticketGroups[data.ticketId]) {
            ticketGroups[data.ticketId] = data; // Use first occurrence for update data
          }
        });
        
        console.log(`Found ${Object.keys(ticketGroups).length} unique ticket IDs to update`);
        
        for (const [ticketId, data] of Object.entries(ticketGroups)) {
          // Read all rows to find the one to update
          const response = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: `${SHEET_NAME}!A:Z`,
          });
          
          const rows = response.data.values || [];
          const headers = rows[0] || [];
          const ticketIdIndex = headers.indexOf('Ticket ID');
          
          console.log('DEBUG - Row lookup:');
          console.log('  Sheet headers:', headers);
          console.log('  Ticket ID column index:', ticketIdIndex);
          console.log('  Looking for Ticket ID:', data.ticketId);
          console.log('  Total rows in sheet:', rows.length);
          
          if (ticketIdIndex === -1) {
            console.error('Ticket ID column not found in sheet');
            console.error('Available headers:', headers);
            continue;
          }
          
          // Find ALL rows with matching ticket ID (there can be multiple for one order)
          let matchingRowIndices = [];
          for (let i = 1; i < rows.length; i++) {
            const cellValue = rows[i][ticketIdIndex];
            console.log(`  Row ${i + 1}: Ticket ID = "${cellValue}" (type: ${typeof cellValue}) (comparing to "${data.ticketId}" type: ${typeof data.ticketId})`);
            // Try both string comparison and trimmed comparison
            if (cellValue === data.ticketId || String(cellValue).trim() === String(data.ticketId).trim()) {
              matchingRowIndices.push(i);
              console.log(`  ✅ MATCH found at row ${i + 1}`);
            }
          }
          
          if (matchingRowIndices.length === 0) {
            console.log('  ❌ NO MATCH found in any row');
          } else {
            console.log(`  Found ${matchingRowIndices.length} matching rows for ticket ${data.ticketId}`);
          }
          
          if (matchingRowIndices.length > 0) {
            // Update ALL rows for this ticket ID
            for (const rowIndex of matchingRowIndices) {
              console.log(`Updating existing row at index ${rowIndex + 1} for ticket ${data.ticketId}`);
              
              // Get the existing row to preserve cost_item_id (since we're updating by ticket_id)
              const existingRow = rows[rowIndex];
              const existingCostItemId = existingRow[headers.indexOf('Cost Item ID')] || '';
              
              // Prepare updated row data (23 columns) - preserve the original cost item ID
              const updatedRow = [
                data.purchaseDate,
                data.purchaseTime,
                data.eventDate,
                data.eventTime,
                data.attendeeName,
                data.email,
                data.mailingAddress,
                data.ticketName,
                data.addOnName,
                data.eventTitle,
                data.venueName,
                data.venueAddress,
                data.eventStartTime,
                data.eventEndTime,
                data.ticketId,
                existingCostItemId, // Keep the original cost item ID for this specific row
                data.qrCode,
                data.ticketStatus,
                data.paymentStatus,
                data.totalTicketPrice,
                data.faceValuePrice,
                data.fees,
                data.currency,
              ];
              
              // Update the specific row
              await sheets.spreadsheets.values.update({
                spreadsheetId: SPREADSHEET_ID,
                range: `${SHEET_NAME}!A${rowIndex + 1}:W${rowIndex + 1}`,
                valueInputOption: 'USER_ENTERED',
                resource: { values: [updatedRow] },
              });
              
              console.log(`Updated row ${rowIndex + 1} successfully`);
            }
          } else {
            console.log(`No existing rows found for ticket ${data.ticketId}, appending new row`);
            
            // Append as new row if not found (23 columns)
            const values = [[
              data.purchaseDate,
              data.purchaseTime,
              data.eventDate,
              data.eventTime,
              data.attendeeName,
              data.email,
              data.mailingAddress,
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
              data.totalTicketPrice,
              data.faceValuePrice,
              data.fees,
              data.currency,
            ]];
            
            await sheets.spreadsheets.values.append({
              spreadsheetId: SPREADSHEET_ID,
              range: `${SHEET_NAME}!A:W`,
              valueInputOption: 'USER_ENTERED',
              requestBody: { values },
            });
          }
        }
        
        console.log(`Processed ${filteredTicketData.length} ticket update(s)`);
      } else {
        // Append new data for ticket_purchase events (23 columns)
        const values = filteredTicketData.map(data => [
          data.purchaseDate,
          data.purchaseTime,
          data.eventDate,
          data.eventTime,
          data.attendeeName,
          data.email,
          data.mailingAddress,
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
          data.totalTicketPrice,
          data.faceValuePrice,
          data.fees,
          data.currency,
        ]);

        await sheets.spreadsheets.values.append({
          spreadsheetId: SPREADSHEET_ID,
          range: `${SHEET_NAME}!A:W`,
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