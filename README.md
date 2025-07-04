# Universe Analytics Dashboard

A complete ticketing analytics system that receives Universe webhooks, stores data in Google Sheets, and provides a modern web dashboard for viewing, filtering, sorting, and analyzing ticket sales data.

## Features

- 🎫 Real-time webhook integration with Universe
- 📊 Interactive analytics dashboard with charts and insights
- 🔍 Advanced filtering and search capabilities
- 📈 Sales trends and revenue analysis
- 📱 Responsive design for all devices
- 💾 Google Sheets as primary database
- 📤 Export data to CSV format
- 🔐 Secure webhook signature verification

## Quick Start

### Prerequisites

- Node.js 18+ 
- Google Cloud service account with Sheets API access
- Universe webhook configuration
- Vercel account for deployment (optional)

### Backend Setup

1. Navigate to the backend directory:
```bash
cd universe-analytics/backend
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file:
```bash
cp ../.env.example .env
```

4. Configure environment variables:
```
GOOGLE_SHEETS_ID=your-google-sheet-id
GOOGLE_SERVICE_ACCOUNT_EMAIL=service-account@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
UNIVERSE_WEBHOOK_SECRET=your-webhook-secret
TARGET_TICKET_TYPE=General Admission - (Souvenir Ticket)
SHEET_NAME=Universe-Webhook-Data
```

5. Set up Google Sheets:
   - Create a new Google Sheet named "Universe-Webhook-Data"
   - **IMPORTANT**: Add these headers in row 1 (copy and paste exactly):
     ```
     purchaseDate, purchaseTime, eventDate, eventTime, attendeeName, email, address, rateName, eventTitle, eventStartTime, eventEndTime, ticketId, costItemId, ticketStatus, paymentStatus, price, currency, quantity
     ```
   - Share the sheet with your service account email (as Editor)
   - Copy the Sheet ID from the URL: `https://docs.google.com/spreadsheets/d/[SHEET_ID]/edit`

6. Run the backend:
```bash
npm run dev
```

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd universe-analytics/frontend
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file:
```bash
cp .env.example .env
```

4. Configure environment variables:
```
VITE_API_BASE_URL=http://localhost:3000
VITE_ENVIRONMENT=development
```

5. Run the frontend:
```bash
npm run dev
```

## Deployment

### Backend Deployment (Vercel)

1. Install Vercel CLI:
```bash
npm i -g vercel
```

2. Deploy from backend directory:
```bash
cd backend
vercel
```

3. Set environment variables in Vercel dashboard

### Frontend Deployment (Vercel)

1. Deploy from frontend directory:
```bash
cd frontend
vercel
```

2. Update environment variables:
```
VITE_API_BASE_URL=https://your-backend-url.vercel.app
VITE_ENVIRONMENT=production
```

## Universe Webhook Configuration

1. Log into your Universe account
2. Navigate to Settings → Webhooks
3. Add new webhook:
   - **URL**: `https://your-backend-url.vercel.app/api/webhook`
   - **Secret**: Same value as `UNIVERSE_WEBHOOK_SECRET`
   - **Events**: Enable `ticket_purchase` and `ticket_update`
   - **Active**: Check to enable

## API Endpoints

### Webhook Endpoint
- `POST /api/webhook` - Receives Universe webhook events

### Data API Endpoints
- `GET /api/tickets` - Get paginated ticket data with filters
- `GET /api/tickets/analytics` - Get analytics and KPIs
- `GET /api/events` - Get list of all events
- `GET /api/ticket-types` - Get list of all ticket types
- `GET /api/export/csv` - Export data as CSV

### Query Parameters
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 50)
- `date_from` - Start date filter (YYYY-MM-DD)
- `date_to` - End date filter (YYYY-MM-DD)
- `event` - Filter by event name
- `status` - Filter by ticket status
- `search` - Search by name, email, or event

## Development

### Project Structure
```
universe-analytics/
├── backend/          # Node.js webhook handler and API
├── frontend/         # React dashboard application
├── shared/           # Shared types and utilities
└── README.md         # This file
```

### Testing Webhooks Locally

Use ngrok to expose your local server:
```bash
ngrok http 3000
```

Then use the ngrok URL as your webhook endpoint in Universe.

### Sample Webhook Payload

```json
{
  "type": "ticket_purchase",
  "order": {
    "id": "123456",
    "created_at": "2024-01-15T10:30:00Z",
    "buyer_first_name": "John",
    "buyer_last_name": "Doe",
    "buyer_email": "john@example.com",
    "state": "paid"
  },
  "ticket": {
    "id": "789012",
    "rate_name": "General Admission",
    "face_price": "50.00",
    "state": "active"
  },
  "event": {
    "title": "Summer Music Festival",
    "start_stamp": "2024-06-15T18:00:00Z",
    "end_stamp": "2024-06-15T23:00:00Z"
  }
}
```

## Troubleshooting

### Common Issues

1. **Webhook signature verification fails**
   - Ensure `UNIVERSE_WEBHOOK_SECRET` matches exactly
   - Check that raw body is used for signature verification

2. **Google Sheets API errors**
   - Verify service account has edit access to the sheet
   - Check that private key format is correct (newlines)
   - Ensure sheet name matches `SHEET_NAME` env variable

3. **Frontend can't connect to backend**
   - Check CORS configuration
   - Verify `VITE_API_BASE_URL` is correct
   - Ensure backend is running

## License

MIT