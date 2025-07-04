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

// Helper function to escape CSV values
function escapeCSV(value) {
  if (value === null || value === undefined) return '';
  const stringValue = String(value);
  // Escape quotes and wrap in quotes if contains comma, quote, or newline
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
}

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { 
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

    // Apply same filters as tickets endpoint
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

    // Get headers from the first row of sheet data
    const headers = response.data.values?.[0] || [];
    
    // Create CSV content
    const csvHeaders = headers.map(escapeCSV).join(',');
    const csvRows = tickets.map(ticket => 
      headers.map(header => escapeCSV(ticket[header] || '')).join(',')
    );
    
    const csvContent = [csvHeaders, ...csvRows].join('\n');

    // Set CSV headers
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-');
    const filename = `universe-tickets-export-${timestamp}.csv`;
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    
    res.send(csvContent);
  } catch (error) {
    console.error('Error exporting CSV:', error);
    res.status(500).json({ error: 'Failed to export CSV' });
  }
}