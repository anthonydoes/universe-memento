import { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

export function useAnalytics(filters = {}) {
  const [analytics, setAnalytics] = useState({
    totalTickets: 0,
    totalRevenue: 0,
    averageTicketsPerOrder: 0,
    totalOrders: 0,
    growthRate: 0,
    topEvents: [],
    salesByDay: [],
    locationDistribution: [],
    recentSales: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAnalytics = async () => {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams();
        
        // Handle events array properly
        Object.entries(filters).forEach(([key, value]) => {
          if (key === 'events' && Array.isArray(value)) {
            // Send each event as a separate parameter
            value.forEach(event => params.append('events', event));
          } else if (value !== '' && value != null) {
            params.append(key, value);
          }
        });
        
        const response = await axios.get(`${API_BASE_URL}/api/analytics?${params}`);
        setAnalytics(response.data);
      } catch (err) {
        setError(err.message);
        console.error('Error fetching analytics:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [filters]);

  return { analytics, loading, error };
}