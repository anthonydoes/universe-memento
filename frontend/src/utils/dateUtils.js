import { format, parseISO, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';

export function formatDate(date, formatString = 'MMM dd, yyyy') {
  if (!date) return '';
  try {
    const parsedDate = typeof date === 'string' ? parseISO(date) : date;
    return format(parsedDate, formatString);
  } catch (error) {
    return date;
  }
}

export function formatCurrency(amount, currency = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
  }).format(amount);
}

export function getDateRangePresets() {
  // Get today in Eastern timezone to match purchase dates
  const todayEST = new Date().toLocaleDateString('en-US', { timeZone: 'America/New_York' });
  const todayDate = new Date(todayEST);
  
  // Use local timezone for other calculations but base on EST today
  const today = new Date();
  
  return {
    allTime: {
      label: 'All Time',
      start: new Date('2020-01-01'), // Far back date to capture all data
      end: new Date('2030-12-31'),   // Far future date to capture all data
    },
    today: {
      label: 'Today',
      start: todayDate,
      end: todayDate,
    },
    thisWeek: {
      label: 'This Week',
      start: startOfWeek(today),
      end: endOfWeek(today),
    },
    thisMonth: {
      label: 'This Month',
      start: startOfMonth(today),
      end: endOfMonth(today),
    },
    last7Days: {
      label: 'Last 7 Days',
      start: new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000),
      end: today,
    },
    last30Days: {
      label: 'Last 30 Days',
      start: new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000),
      end: today,
    },
  };
}