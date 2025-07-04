import React, { useState, useEffect, useRef } from 'react';
import { useEvents, useTicketTypes } from '../hooks/useTicketData';
import { getDateRangePresets } from '../utils/dateUtils';
import { X, ChevronDown, Filter } from 'lucide-react';

export default function Filters({ onFiltersChange }) {
  const { events } = useEvents();
  const { ticketTypes } = useTicketTypes();
  const datePresets = getDateRangePresets();
  
  const [filters, setFilters] = useState({
    date_from: '',
    date_to: '',
    events: [], // Changed to array for multi-select
    status: '',
  });
  const [showEventDropdown, setShowEventDropdown] = useState(false);
  const [selectedDatePreset, setSelectedDatePreset] = useState('');
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowEventDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleFilterChange = (key, value) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const handleEventToggle = (eventName) => {
    const currentEvents = filters.events;
    const newEvents = currentEvents.includes(eventName)
      ? currentEvents.filter(e => e !== eventName)
      : [...currentEvents, eventName];
    
    const newFilters = { ...filters, events: newEvents };
    setFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const clearAllEvents = () => {
    const newFilters = { ...filters, events: [] };
    setFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const handlePresetClick = (preset, presetKey) => {
    let newFilters;
    
    if (presetKey === 'allTime') {
      // For "All Time", clear date filters entirely
      newFilters = {
        ...filters,
        date_from: '',
        date_to: '',
      };
    } else {
      // For other presets, set the date range
      newFilters = {
        ...filters,
        date_from: preset.start.toISOString().split('T')[0],
        date_to: preset.end.toISOString().split('T')[0],
      };
    }
    
    setFilters(newFilters);
    setSelectedDatePreset(presetKey);
    onFiltersChange(newFilters);
  };

  const clearFilters = () => {
    const clearedFilters = {
      date_from: '',
      date_to: '',
      events: [],
      status: '',
    };
    setFilters(clearedFilters);
    setSelectedDatePreset('');
    onFiltersChange(clearedFilters);
  };

  const hasActiveFilters = Object.entries(filters).some(([key, value]) => {
    if (key === 'events') return value.length > 0;
    return value !== '';
  });

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5 mb-6">
      <div className="flex flex-wrap items-center gap-8">
        {/* Date Range Section */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-slate-500" />
            <span className="text-sm font-medium text-slate-700">Date Range</span>
          </div>
          <select
            value={selectedDatePreset}
            onChange={(e) => {
              if (e.target.value) {
                const preset = datePresets[e.target.value];
                handlePresetClick(preset, e.target.value);
              } else {
                setSelectedDatePreset('');
              }
            }}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200"
          >
            <option value="">Custom Range</option>
            {Object.entries(datePresets).map(([key, preset]) => (
              <option key={key} value={key}>
                {preset.label}
              </option>
            ))}
          </select>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={filters.date_from}
              onChange={(e) => {
                handleFilterChange('date_from', e.target.value);
                setSelectedDatePreset('');
              }}
              className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200"
            />
            <span className="text-slate-400">→</span>
            <input
              type="date"
              value={filters.date_to}
              onChange={(e) => {
                handleFilterChange('date_to', e.target.value);
                setSelectedDatePreset('');
              }}
              className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200"
            />
          </div>
        </div>

        {/* Event Filter */}
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-slate-700">Events</span>
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setShowEventDropdown(!showEventDropdown)}
              className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 min-w-[200px] flex items-center justify-between hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200"
            >
              <span className="truncate">
                {filters.events.length === 0 
                  ? 'All Events' 
                  : filters.events.length === 1 
                    ? filters.events[0]
                    : `${filters.events.length} Selected`
                }
              </span>
              <ChevronDown className={`h-4 w-4 ml-2 text-slate-400 transition-transform duration-200 ${showEventDropdown ? 'rotate-180' : ''}`} />
            </button>
            
            {showEventDropdown && (
              <div className="absolute top-full left-0 mt-2 w-full bg-white border border-slate-200 rounded-xl shadow-lg z-20 max-h-60 overflow-hidden">
                <div className="p-3 border-b border-slate-100 bg-slate-50">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                      {filters.events.length} of {events.length} selected
                    </span>
                    {filters.events.length > 0 && (
                      <button
                        onClick={clearAllEvents}
                        className="text-xs font-medium text-blue-600 hover:text-blue-700 px-2 py-1 rounded hover:bg-blue-50 transition-colors duration-200"
                      >
                        Clear All
                      </button>
                    )}
                  </div>
                </div>
                <div className="max-h-44 overflow-y-auto">
                  {events.map((event) => (
                    <label key={event} className="flex items-center px-4 py-3 hover:bg-slate-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={filters.events.includes(event)}
                        onChange={() => handleEventToggle(event)}
                        className="mr-3 w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm text-slate-800 truncate">{event}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-slate-700">Status</span>
          <select
            value={filters.status}
            onChange={(e) => handleFilterChange('status', e.target.value)}
            className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200"
          >
            <option value="">All Statuses</option>
            <option value="paid">Paid</option>
            <option value="pending">Pending</option>
            <option value="cancelled">Cancelled</option>
            <option value="refunded">Refunded</option>
          </select>
        </div>

        {/* Clear All Button */}
        {hasActiveFilters && (
          <div className="ml-auto">
            <button
              onClick={clearFilters}
              className="px-4 py-2 bg-red-50 text-red-700 hover:bg-red-100 text-sm font-medium rounded-lg flex items-center transition-all duration-200"
            >
              <X className="h-4 w-4 mr-2" />
              Clear All
            </button>
          </div>
        )}
      </div>
    </div>
  );
}