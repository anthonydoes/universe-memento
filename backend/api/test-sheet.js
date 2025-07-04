import { google } from 'googleapis';

export default async function handler(req, res) {
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

    // Test data
    const testData = [
      new Date().toLocaleDateString('en-US', { timeZone: 'America/New_York' }), // purchaseDate
      new Date().toLocaleTimeString('en-US', { timeZone: 'America/New_York' }), // purchaseTime
      new Date().toLocaleDateString('en-US', { timeZone: 'America/New_York' }), // eventDate
      new Date().toLocaleTimeString('en-US', { timeZone: 'America/New_York' }), // eventTime
      'Test User', // attendeeName
      'test@example.com', // email
      '123 Test St, Test City, TC', // address
      'General Admission - (Souvenir Ticket)', // rateName
      'Test Event', // eventTitle
      new Date().toISOString(), // eventStartTime
      new Date().toISOString(), // eventEndTime
      'test-ticket-123', // ticketId
      'test-cost-123', // costItemId
      'active', // ticketStatus
      'success', // paymentStatus
      25.00, // price
      'USD', // currency
      1, // quantity
    ];

    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A:R`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [testData] },
    });

    res.json({ 
      status: 'success', 
      message: 'Test data added to sheet',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error adding test data:', error);
    res.status(500).json({ 
      error: 'Failed to add test data',
      details: error.message,
      stack: error.stack 
    });
  }
}