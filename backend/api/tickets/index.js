import { google } from 'googleapis';

// Helper function to parse sheet data
function parseSheetData(values) {
  if (!values || values.length <= 1) return [];
  
  const headers = values[0];
  return values.slice(1).map(row => {
    const ticket = {};
    headers.forEach((header, index) => {
      ticket[header] = row[index] || '';
    });
    return ticket;
  });
}

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { 
      page = 1, 
      limit = 50, 
      date_from, 
      date_to, 
      event, 
      status 
    } = req.query;
    
    // Handle events parameter (can be array or single value)
    let events = req.query.events;
    if (events && !Array.isArray(events)) {
      events = [events]; // Convert single event to array
    }

    // Google Sheets setup
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_ID;
    const SHEET_NAME = process.env.SHEET_NAME || 'Universe-Webhook-Data';

    // Fetch all data from sheet
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A:T`,
    });

    let tickets = parseSheetData(response.data.values);

    // Apply filters
    if (date_from) {
      const fromDate = new Date(date_from);
      tickets = tickets.filter(t => {
        const ticketDate = new Date(t.purchaseDate);
        return ticketDate >= fromDate;
      });
    }
    if (date_to) {
      const toDate = new Date(date_to);
      toDate.setHours(23, 59, 59, 999); // Include the entire end date
      tickets = tickets.filter(t => {
        const ticketDate = new Date(t.purchaseDate);
        return ticketDate <= toDate;
      });
    }
    
    // Handle events filter (support both single event and multi-select events)
    if (events && Array.isArray(events) && events.length > 0) {
      tickets = tickets.filter(t => events.includes(t.eventTitle));
    } else if (event) {
      tickets = tickets.filter(t => t.eventTitle === event);
    }
    if (status) {
      tickets = tickets.filter(t => t.ticketStatus === status);
    }

    // Pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    const paginatedTickets = tickets.slice(startIndex, endIndex);

    res.json({
      data: paginatedTickets,
      pagination: {
        total: tickets.length,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(tickets.length / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching tickets:', error);
    res.status(500).json({ error: 'Failed to fetch tickets' });
  }
}