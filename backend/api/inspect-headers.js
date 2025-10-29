import { google } from 'googleapis';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../.env') });

async function inspectHeaders() {
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

    console.log('Reading current Google Sheet headers...');
    console.log('Sheet ID:', SPREADSHEET_ID);
    console.log('Sheet Name:', SHEET_NAME);

    // Read the first row to see current headers
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!1:1`,
    });

    const headers = response.data.values?.[0] || [];
    console.log('\nCurrent headers:', headers.length, 'columns');
    
    headers.forEach((header, index) => {
      const letter = String.fromCharCode(65 + index);
      console.log(`  ${letter}: ${header}`);
    });

    // Check for duplicates
    const headerCounts = {};
    headers.forEach((header, index) => {
      if (headerCounts[header]) {
        headerCounts[header].push(index);
      } else {
        headerCounts[header] = [index];
      }
    });

    console.log('\nDuplicate analysis:');
    const duplicates = Object.entries(headerCounts).filter(([_, indices]) => indices.length > 1);
    
    if (duplicates.length > 0) {
      console.log('Found duplicates:');
      duplicates.forEach(([header, indices]) => {
        const letters = indices.map(i => String.fromCharCode(65 + i));
        console.log(`  "${header}" appears in columns: ${letters.join(', ')}`);
      });
      
      // Suggest cleanup
      console.log('\nSuggested cleanup:');
      duplicates.forEach(([header, indices]) => {
        if (indices.length > 1) {
          const keepIndex = indices[0];
          const removeIndices = indices.slice(1);
          const removeLetters = removeIndices.map(i => String.fromCharCode(65 + i));
          console.log(`  Keep "${header}" in column ${String.fromCharCode(65 + keepIndex)}, remove from: ${removeLetters.join(', ')}`);
        }
      });
    } else {
      console.log('No duplicate headers found! ✅');
    }

    // Check if we have extra columns beyond our expected 21
    if (headers.length > 21) {
      console.log(`\nWarning: Found ${headers.length} columns, expected 21`);
      console.log('Extra columns:');
      for (let i = 21; i < headers.length; i++) {
        const letter = String.fromCharCode(65 + i);
        console.log(`  ${letter}: ${headers[i] || '(empty)'}`);
      }
    }

  } catch (error) {
    console.error('❌ Error inspecting headers:', error.message);
    if (error.response) {
      console.error('Error details:', error.response.data);
    }
    process.exit(1);
  }
}

// Run the inspection
inspectHeaders();