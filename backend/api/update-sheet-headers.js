import { google } from 'googleapis';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Updated headers matching the new data structure
const NEW_HEADERS = [
  'Purchase Date',
  'Purchase Time', 
  'Event Date',
  'Event Time',
  'Attendee Name',
  'Email',
  'Phone',
  'Address',
  'City',
  'State', 
  'ZIP',
  'Ticket Name',      // Primary ticket only
  'Add-on Name',      // Add-ons only, comma-separated
  'Event Title',
  'Venue Name',       // New field
  'Venue Address',    // New field
  'Event Start Time',
  'Event End Time',
  'Ticket ID',
  'Cost Item ID',     // Used for updates
  'QR Code',
  'Ticket Status',
  'Payment Status',
  'Price',
  'Currency'
];

async function updateSheetHeaders() {
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

    console.log('Updating headers in Google Sheet...');
    console.log(`Sheet ID: ${SPREADSHEET_ID}`);
    console.log(`Sheet Name: ${SHEET_NAME}`);

    // Update the headers
    const response = await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A1:Z1`,
      valueInputOption: 'USER_ENTERED',
      resource: {
        values: [NEW_HEADERS]
      }
    });

    console.log('Headers updated successfully!');
    console.log(`Updated ${response.data.updatedCells} cells`);
    console.log('\nNew column structure:');
    NEW_HEADERS.forEach((header, index) => {
      console.log(`  ${String.fromCharCode(65 + index)}: ${header}`);
    });

  } catch (error) {
    console.error('Error updating headers:', error.message);
    if (error.response) {
      console.error('API Error:', error.response.data);
    }
  }
}

// Run the update
updateSheetHeaders();