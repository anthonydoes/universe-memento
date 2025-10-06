// Ticket data structure
export const TicketRecord = {
  id: '',
  purchaseDate: '',
  purchaseTime: '',
  eventDate: '',
  eventTime: '',
  attendeeName: '',
  email: '',
  address: '',
  ticketRateName: '',
  addOnRateName: '',
  eventTitle: '',
  eventAddress: '',
  venueName: '',
  hostName: '',
  eventStartTime: '',
  eventEndTime: '',
  ticketId: '',
  costItemId: '',
  ticketStatus: '',
  paymentStatus: '',
  price: 0,
  serviceFee: 0,
  currency: 'USD',
  quantity: 1
};

// Analytics data structure
export const AnalyticsData = {
  totalTickets: 0,
  totalRevenue: 0,
  averageTicketPrice: 0,
  growthRate: 0,
  topEvents: [], // Array<{name: string, tickets: number, revenue: number}>
  salesByDay: [], // Array<{date: string, tickets: number, revenue: number}>
  ticketTypeDistribution: [], // Array<{type: string, count: number, percentage: number}>
  recentSales: [] // Array<TicketRecord>
};

// Universe webhook event types
export const WebhookEventTypes = {
  TICKET_PURCHASE: 'ticket_purchase',
  TICKET_UPDATE: 'ticket_update',
  ORDER_UPDATE: 'order_update'
};

// Ticket status types
export const TicketStatus = {
  PAID: 'paid',
  PENDING: 'pending',
  CANCELLED: 'cancelled',
  REFUNDED: 'refunded'
};