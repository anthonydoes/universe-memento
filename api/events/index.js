import { google } from 'googleapis';

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

    // Get unique events from column J (Event Title)
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!J2:J`, // Column J, starting from row 2
    });

    const rows = response.data.values || [];
    
    // Extract unique event titles
    const uniqueEvents = [...new Set(rows.flat().filter(Boolean))].sort();

    res.status(200).json(uniqueEvents);
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({ 
      error: 'Failed to fetch events',
      details: error.message 
    });
  }
}