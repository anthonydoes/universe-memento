import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

export function useTicketData(filters = {}) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 50,
    pages: 1,
  });

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams({
        page: filters.page || 1,
        limit: filters.limit || 50,
      });
      
      // Handle events array and other filters properly
      Object.entries(filters).forEach(([key, value]) => {
        if (key === 'events' && Array.isArray(value)) {
          // Send each event as a separate parameter
          value.forEach(event => params.append('events', event));
        } else if (key !== 'page' && key !== 'limit' && value !== '' && value != null) {
          params.append(key, value);
        }
      });

      const response = await axios.get(`${API_BASE_URL}/api/tickets?${params}`);
      setData(response.data.data);
      setPagination(response.data.pagination);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching tickets:', err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  return { data, loading, error, pagination, refetch: fetchTickets };
}

export function useEvents() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/api/events`);
        setEvents(response.data);
      } catch (error) {
        console.error('Error fetching events:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, []);

  return { events, loading };
}

export function useTicketTypes() {
  const [ticketTypes, setTicketTypes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTicketTypes = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/api/ticket-types`);
        setTicketTypes(response.data);
      } catch (error) {
        console.error('Error fetching ticket types:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTicketTypes();
  }, []);

  return { ticketTypes, loading };
}