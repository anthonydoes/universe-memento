import { google } from 'googleapis';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../.env') });

async function cleanupDuplicates() {
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

    console.log('Cleaning up duplicate columns in Google Sheet...');
    console.log('Sheet ID:', SPREADSHEET_ID);
    console.log('Sheet Name:', SHEET_NAME);

    // Read current headers
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!1:1`,
    });

    const currentHeaders = response.data.values?.[0] || [];
    console.log(`Current headers: ${currentHeaders.length} columns`);

    // Clear columns V through Y (indices 21-24, which are V, W, X, Y)
    console.log('Clearing duplicate columns V, W, X, Y...');
    
    await sheets.spreadsheets.values.clear({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!V:Y`,
    });

    console.log('✅ Duplicate columns cleared successfully!');

    // Verify the cleanup
    const verifyResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!1:1`,
    });

    const cleanHeaders = verifyResponse.data.values?.[0] || [];
    console.log(`\nAfter cleanup: ${cleanHeaders.length} columns`);
    
    if (cleanHeaders.length === 21) {
      console.log('✅ Perfect! Now have exactly 21 columns as expected.');
    } else {
      console.log(`⚠️  Still have ${cleanHeaders.length} columns. Expected 21.`);
    }

    // Show final headers
    console.log('\nFinal headers:');
    cleanHeaders.forEach((header, index) => {
      const letter = String.fromCharCode(65 + index);
      console.log(`  ${letter}: ${header}`);
    });

  } catch (error) {
    console.error('❌ Error cleaning up duplicates:', error.message);
    if (error.response) {
      console.error('Error details:', error.response.data);
    }
    process.exit(1);
  }
}

// Run the cleanup
cleanupDuplicates();