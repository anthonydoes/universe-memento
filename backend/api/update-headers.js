import { google } from 'googleapis';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../.env') });

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

    // Define the new headers
    const headers = [
      'Purchase Date',
      'Purchase Time',
      'Event Date',
      'Event Time',
      'Attendee Name',
      'Email',
      'Address',
      'Ticket Rate Name',    // Updated from 'Rate Name'
      'Add-On Rate Name',     // New column
      'Event Title',
      'Event Address',
      'Venue Name',           // New column
      'Host Name',
      'Event Start Time',
      'Event End Time',
      'Ticket ID',
      'Cost Item ID',
      'Ticket Status',
      'Payment Status',
      'Price',
      'Service Fee',          // New column
      'Currency',
      'Quantity'
    ];

    console.log('Updating Google Sheet headers...');
    console.log('Sheet ID:', SPREADSHEET_ID);
    console.log('Sheet Name:', SHEET_NAME);
    console.log('New headers count:', headers.length);

    // Update the first row with new headers
    const response = await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A1:X1`,
      valueInputOption: 'RAW',
      requestBody: {
        values: [headers],
      },
    });

    console.log('✅ Headers updated successfully!');
    console.log('Updated range:', response.data.updatedRange);
    console.log('Updated cells:', response.data.updatedCells);
    console.log('Updated rows:', response.data.updatedRows);
    console.log('Updated columns:', response.data.updatedColumns);

  } catch (error) {
    console.error('❌ Error updating headers:', error.message);
    if (error.response) {
      console.error('Error details:', error.response.data);
    }
    process.exit(1);
  }
}

// Run the update
updateSheetHeaders();