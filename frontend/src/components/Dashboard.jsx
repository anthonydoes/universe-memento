import React, { useState } from 'react';
import { useAnalytics } from '../hooks/useAnalytics';
import { formatCurrency } from '../utils/dateUtils';
import { TrendingUp, TrendingDown, Users, DollarSign, Calendar, BarChart, LogOut } from 'lucide-react';
import Filters from './Filters';
import TicketTable from './TicketTable';
import Analytics from './Analytics';

export default function Dashboard({ onLogout }) {
  const [activeTab, setActiveTab] = useState('analytics');
  const [filters, setFilters] = useState({});
  const { analytics, loading } = useAnalytics(filters);

  const kpiCards = [
    {
      title: 'Total Tickets',
      value: analytics.totalTickets,
      icon: Users,
      trend: '+12%',
      trendUp: true,
    },
    {
      title: 'Total Revenue',
      value: formatCurrency(analytics.totalRevenue),
      icon: DollarSign,
      trend: '+8%',
      trendUp: true,
    },
    {
      title: 'Avg Tickets/Order',
      value: analytics.averageTicketsPerOrder,
      icon: BarChart,
      trend: '+5%',
      trendUp: true,
    },
    {
      title: 'Events',
      value: analytics.topEvents.length,
      icon: Calendar,
      trend: '+5%',
      trendUp: true,
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">Universe Memento 🎟️</h1>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-500">Last updated: {new Date().toLocaleTimeString()}</span>
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              {onLogout && (
                <button
                  onClick={onLogout}
                  className="flex items-center px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
                  title="Logout"
                >
                  <LogOut className="h-4 w-4 mr-1" />
                  Logout
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* KPI Cards */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {kpiCards.map((card, index) => (
            <div key={index} className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <card.icon className="h-8 w-8 text-gray-400" />
                <div className={`flex items-center text-sm ${card.trendUp ? 'text-green-600' : 'text-red-600'}`}>
                  {card.trendUp ? <TrendingUp className="h-4 w-4 mr-1" /> : <TrendingDown className="h-4 w-4 mr-1" />}
                  {card.trend}
                </div>
              </div>
              <h3 className="text-sm text-gray-600 mb-1">{card.title}</h3>
              <p className="text-2xl font-bold text-gray-900">{loading ? '...' : card.value}</p>
            </div>
          ))}
        </div>

        {/* Horizontal Filters */}
        <Filters onFiltersChange={setFilters} />

        {/* Main Content Area */}
        <div className="w-full">
          {/* Tabs */}
          <div className="bg-white rounded-lg shadow mb-6">
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex">
                <button
                  onClick={() => setActiveTab('analytics')}
                  className={`px-6 py-3 border-b-2 font-medium text-sm ${
                    activeTab === 'analytics'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Analytics
                </button>
                <button
                  onClick={() => setActiveTab('table')}
                  className={`px-6 py-3 border-b-2 font-medium text-sm ${
                    activeTab === 'table'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Ticket Data
                </button>
              </nav>
            </div>

            {/* Tab Content */}
            <div className="p-6">
              {activeTab === 'analytics' ? (
                <Analytics analytics={analytics} loading={loading} filters={filters} />
              ) : (
                <TicketTable filters={filters} />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}