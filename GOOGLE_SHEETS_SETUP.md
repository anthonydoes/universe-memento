# Google Sheets Setup Guide

## Quick Setup for Your Sheet

Since you already have:
- ✅ Google Cloud service account created
- ✅ Sheets API enabled
- ✅ Sheet named "Universe-Webhook-Data" created
- ✅ Service account added as Editor

You just need to:

### 1. Add Headers to Your Sheet

Copy this entire line and paste it into cell A1 of your sheet:
```
purchaseDate	purchaseTime	eventDate	eventTime	attendeeName	email	address	rateName	eventTitle	eventStartTime	eventEndTime	ticketId	costItemId	ticketStatus	paymentStatus	price	currency	quantity
```

Then use "Data > Split text to columns" with Tab as the delimiter.

**OR** manually add these headers in row 1, columns A through R:
- A1: purchaseDate
- B1: purchaseTime
- C1: eventDate
- D1: eventTime
- E1: attendeeName
- F1: email
- G1: address
- H1: rateName
- I1: eventTitle
- J1: eventStartTime
- K1: eventEndTime
- L1: ticketId
- M1: costItemId
- N1: ticketStatus
- O1: paymentStatus
- P1: price
- Q1: currency
- R1: quantity

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