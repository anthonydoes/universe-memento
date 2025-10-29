import { google } from 'googleapis';

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

export default async function handler(req, res) {
  try {
    const { event_id } = req.query;

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A:R`,
    });

    const tickets = parseSheetData(response.data.values);
    
    // Filter by event if specified
    let filteredTickets = tickets;
    if (event_id) {
      filteredTickets = tickets.filter(t => t.eventTitle === event_id);
    }

    // Calculate analytics
    const totalTickets = filteredTickets.length;
    const totalRevenue = filteredTickets.reduce((sum, t) => sum + parseFloat(t.price || 0), 0);
    const averageTicketPrice = totalTickets > 0 ? totalRevenue / totalTickets : 0;

    // Sales by day
    const salesByDay = {};
    filteredTickets.forEach(ticket => {
      const date = ticket.purchaseDate;
      if (!salesByDay[date]) {
        salesByDay[date] = { tickets: 0, revenue: 0 };
      }
      salesByDay[date].tickets += 1;
      salesByDay[date].revenue += parseFloat(ticket.price || 0);
    });

    // Top events
    const eventStats = {};
    tickets.forEach(ticket => {
      const event = ticket.eventTitle;
      if (!eventStats[event]) {
        eventStats[event] = { tickets: 0, revenue: 0 };
      }
      eventStats[event].tickets += 1;
      eventStats[event].revenue += parseFloat(ticket.price || 0);
    });

    const topEvents = Object.entries(eventStats)
      .map(([name, stats]) => ({ name, ...stats }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    // Ticket type distribution
    const ticketTypes = {};
    filteredTickets.forEach(ticket => {
      const type = ticket.rateName || 'Unknown';
      ticketTypes[type] = (ticketTypes[type] || 0) + 1;
    });

    const ticketTypeDistribution = Object.entries(ticketTypes)
      .map(([type, count]) => ({
        type,
        count,
        percentage: (count / totalTickets * 100).toFixed(1),
      }));

    res.json({
      totalTickets,
      totalRevenue,
      averageTicketPrice,
      growthRate: 0, // Calculate based on previous period
      topEvents,
      salesByDay: Object.entries(salesByDay).map(([date, data]) => ({
        date,
        ...data,
      })),
      ticketTypeDistribution,
      recentSales: filteredTickets.slice(-10).reverse(),
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
}