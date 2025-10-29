import { google } from 'googleapis';

function parseSheetData(values) {
  if (!values || values.length < 2) return [];
  
  const headers = values[0];
  return values.slice(1).map(row => {
    const ticket = {};
    headers.forEach((header, index) => {
      ticket[header] = row[index] || '';
    });
    return ticket;
  });
}

function extractLocation(address) {
  if (!address) return 'Unknown';
  
  // Common address pattern: "Street, City, State ZIP, Country"
  const parts = address.split(',').map(p => p.trim());
  
  if (parts.length >= 3) {
    // Extract city (second to last part)
    const city = parts[parts.length - 3];
    
    // Extract state and zip (second to last part)
    const stateZip = parts[parts.length - 2];
    const state = stateZip.split(' ')[0]; // Get state abbreviation
    
    // Extract country (last part)
    const country = parts[parts.length - 1];
    
    return `${city}, ${state}, ${country}`;
  } else if (parts.length === 2) {
    // Simpler format: "City, Country"
    return address;
  }
  
  return address; // Return as-is if we can't parse it
}

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
    const { 
      period = 'daily', 
      event_id, 
      event, 
      date_from, 
      date_to, 
      status 
    } = req.query;
    
    // Handle events parameter (can be array or single value)
    let events = req.query.events;
    if (events && !Array.isArray(events)) {
      events = [events]; // Convert single event to array
    }

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

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A:X`,
    });

    let tickets = parseSheetData(response.data.values);
    
    console.log('=== ANALYTICS DEBUG ===');
    console.log('Total tickets before filtering:', tickets.length);
    console.log('Event filter received:', event);
    console.log('Events array received:', events);
    
    // Apply filters
    if (date_from) {
      const fromDate = new Date(date_from);
      tickets = tickets.filter(t => {
        const ticketDate = new Date(t['Purchase Date']);
        return ticketDate >= fromDate;
      });
      console.log('After date_from filter:', tickets.length);
      console.log('Sample ticket dates:', tickets.slice(0, 3).map(t => t['Purchase Date']));
    }
    if (date_to) {
      const toDate = new Date(date_to);
      toDate.setHours(23, 59, 59, 999); // Include the entire end date
      tickets = tickets.filter(t => {
        const ticketDate = new Date(t['Purchase Date']);
        return ticketDate <= toDate;
      });
      console.log('After date_to filter:', tickets.length);
    }
    
    // Handle events filter (support both single event and multi-select events)
    if (events && Array.isArray(events) && events.length > 0) {
      console.log('Filtering by events array:', events);
      const before = tickets.length;
      tickets = tickets.filter(t => events.includes(t['Event Title']));
      console.log(`After events filter: ${tickets.length} (was ${before})`);
    } else if (event) {
      console.log('Filtering by single event:', event);
      console.log('Sample event titles before filter:', tickets.slice(0, 3).map(t => `"${t['Event Title']}"`));
      const before = tickets.length;
      tickets = tickets.filter(t => t['Event Title'] === event);
      console.log(`After event filter: ${tickets.length} (was ${before})`);
      if (tickets.length > 0) {
        console.log('Remaining event titles:', [...new Set(tickets.map(t => t['Event Title']))]);
      }
    }
    if (event_id) {
      tickets = tickets.filter(t => t['Event Title'] === event_id);
    }
    if (status) {
      tickets = tickets.filter(t => t['Ticket Status'] === status);
    }
    
    console.log('Final filtered tickets count:', tickets.length);
    console.log('=========================');

    // Calculate analytics from filtered data
    const totalTickets = tickets.length;
    const totalRevenue = tickets.reduce((sum, t) => sum + parseFloat(t['Total Ticket Price'] || 0), 0);
    
    // Calculate average tickets per order
    // Since ticket_id is actually the order ID in Universe, count unique ticket IDs
    const uniqueOrderIds = [...new Set(tickets.map(t => t['Ticket ID'] || ''))];
    const totalOrders = uniqueOrderIds.length;
    const averageTicketsPerOrder = totalOrders > 0 ? (totalTickets / totalOrders).toFixed(1) : 0;

    // Sales by day
    const salesByDay = {};
    tickets.forEach(ticket => {
      const date = ticket['Purchase Date'];
      if (!salesByDay[date]) {
        salesByDay[date] = { tickets: 0, revenue: 0 };
      }
      salesByDay[date].tickets += 1;
      salesByDay[date].revenue += parseFloat(ticket['Total Ticket Price'] || 0);
    });

    // Top events from filtered data
    const eventStats = {};
    tickets.forEach(ticket => {
      const eventName = ticket['Event Title'];
      if (!eventStats[eventName]) {
        eventStats[eventName] = { tickets: 0, revenue: 0 };
      }
      eventStats[eventName].tickets += 1;
      eventStats[eventName].revenue += parseFloat(ticket['Total Ticket Price'] || 0);
    });

    const topEvents = Object.entries(eventStats)
      .map(([name, stats]) => ({ name, ...stats }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    // Location distribution from filtered data
    const locations = {};
    tickets.forEach(ticket => {
      // Use Venue Address for location distribution
      const location = extractLocation(ticket['Venue Address'] || '');
      locations[location] = (locations[location] || 0) + 1;
    });

    const locationDistribution = Object.entries(locations)
      .map(([location, count]) => ({
        location,
        count,
        percentage: (count / totalTickets * 100).toFixed(1),
      }))
      .sort((a, b) => b.count - a.count);

    res.json({
      totalTickets,
      totalRevenue,
      averageTicketsPerOrder,
      totalOrders,
      growthRate: 0,
      topEvents,
      salesByDay: Object.entries(salesByDay).map(([date, data]) => ({
        date,
        ...data,
      })),
      locationDistribution,
      recentSales: tickets.slice(-10).reverse(),
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
}