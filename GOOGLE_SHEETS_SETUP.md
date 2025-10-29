# Google Sheets Setup Guide

## Quick Setup for Your Sheet

Since you already have:
- ✅ Google Cloud service account created
- ✅ Sheets API enabled
- ✅ Sheet named "Universe-Webhook-Data" created
- ✅ Service account added as Editor

You just need to:

### 1. Add Headers to Your Sheet

**Option 1: Run the header update script**
```bash
cd backend
node api/update-sheet-headers.js
```

**Option 2: Copy and paste this line into cell A1:**
```
Purchase Date	Purchase Time	Event Date	Event Time	Attendee Name	Email	Phone	Address	City	State	ZIP	Ticket Name	Add-on Name	Event Title	Venue Name	Venue Address	Event Start Time	Event End Time	Ticket ID	Cost Item ID	QR Code	Ticket Status	Payment Status	Price	Currency
```

Then use "Data > Split text to columns" with Tab as the delimiter.

**Option 3: Manually add these headers in row 1, columns A through Y:**
- A1: Purchase Date
- B1: Purchase Time
- C1: Event Date
- D1: Event Time
- E1: Attendee Name
- F1: Email
- G1: Phone
- H1: Address
- I1: City
- J1: State
- K1: ZIP
- L1: Ticket Name (Primary ticket only)
- M1: Add-on Name (Add-ons only, comma-separated)
- N1: Event Title
- O1: Venue Name
- P1: Venue Address
- Q1: Event Start Time
- R1: Event End Time
- S1: Ticket ID
- T1: Cost Item ID (Used for updates)
- U1: QR Code
- V1: Ticket Status
- W1: Payment Status
- X1: Price
- Y1: Currency

### 2. Get Your Sheet ID

From your Google Sheet URL:
```
https://docs.google.com/spreadsheets/d/[THIS-IS-YOUR-SHEET-ID]/edit
```

Copy the long string between `/d/` and `/edit`.

### 3. Update Your .env File

```
GOOGLE_SHEETS_ID=your-sheet-id-here
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service-account@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
UNIVERSE_WEBHOOK_SECRET=your-webhook-secret
TARGET_TICKET_TYPE=General Admission - (Souvenir Ticket)
SHEET_NAME=Universe-Webhook-Data
```

### Important Notes

1. **Headers must be exactly as shown** - The code looks for these specific column names
2. **Sheet name must match** - "Universe-Webhook-Data" (case-sensitive)
3. **Ticket filtering** - Only tickets with rate_name "General Admission - (Souvenir Ticket)" will be recorded

### Testing

Once headers are added, you can test by:
1. Running the backend server
2. Using the health check endpoint: `http://localhost:3000/api/health`
3. Sending a test webhook or waiting for a real ticket purchase

The system will automatically create new rows for each ticket purchase!