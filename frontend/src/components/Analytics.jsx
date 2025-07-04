import React from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { formatCurrency } from '../utils/dateUtils';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

export default function Analytics({ analytics, loading, filters = {} }) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-gray-100 animate-pulse h-64 rounded-lg"></div>
        ))}
      </div>
    );
  }

  const { salesByDay, topEvents, locationDistribution } = analytics;
  const isFiltered = Object.entries(filters).some(([key, value]) => {
    if (key === 'events') return Array.isArray(value) && value.length > 0;
    return value !== '' && value !== undefined;
  });
  const isSingleEvent = (filters.events && filters.events.length === 1) || (filters.event && filters.event !== '');
  const selectedEventName = filters.events && filters.events.length === 1 
    ? filters.events[0] 
    : (filters.event || '');

  // Prepare data for charts
  const salesTrendData = salesByDay.slice(-30).map((day) => ({
    date: new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    tickets: day.tickets,
    revenue: day.revenue,
  }));

  const eventData = topEvents.map((event) => ({
    name: event.name.length > 20 ? event.name.substring(0, 20) + '...' : event.name,
    tickets: event.tickets,
    revenue: event.revenue,
  }));

  return (
    <div className="space-y-6">
      {/* Sales Trend Chart */}
      <div className="bg-white rounded-lg shadow p-4 sm:p-6">
        <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">Sales Trend (Last 30 Days)</h3>
        <div className="h-64 sm:h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={salesTrendData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 12 }}
                interval="preserveStartEnd"
              />
              <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
              <Tooltip
                formatter={(value, name) =>
                  name === 'revenue' ? formatCurrency(value) : value
                }
              />
              <Legend />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="tickets"
                stroke="#3B82F6"
                strokeWidth={2}
                name="Tickets"
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="revenue"
                stroke="#10B981"
                strokeWidth={2}
                name="Revenue"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Show Top Events Chart only if not filtering by single event */}
        {!isSingleEvent && (
          <div className="bg-white rounded-lg shadow p-4 sm:p-6">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">
              {isFiltered ? 'Filtered Events by Revenue' : 'Top Events by Revenue'}
            </h3>
            <div className="h-64 sm:h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={eventData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" tick={{ fontSize: 12 }} />
                  <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 10 }} />
                  <Tooltip formatter={(value) => formatCurrency(value)} />
                  <Bar dataKey="revenue" fill="#3B82F6" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Show filtered summary when single event is selected */}
        {isSingleEvent && (
          <div className="bg-white rounded-lg shadow p-4 sm:p-6">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">Event Summary</h3>
            <div className="space-y-4">
              <div className="text-center p-4 sm:p-6 bg-blue-50 rounded-lg">
                <h4 className="text-lg sm:text-xl font-bold text-blue-900 break-words">{selectedEventName}</h4>
                <p className="text-blue-700 mt-2 text-sm sm:text-base">Selected Event</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 sm:p-4 bg-gray-50 rounded-lg">
                  <p className="text-xl sm:text-2xl font-bold text-gray-900">{analytics.totalTickets}</p>
                  <p className="text-xs sm:text-sm text-gray-600">Total Tickets</p>
                </div>
                <div className="text-center p-3 sm:p-4 bg-gray-50 rounded-lg">
                  <p className="text-xl sm:text-2xl font-bold text-gray-900">{formatCurrency(analytics.totalRevenue)}</p>
                  <p className="text-xs sm:text-sm text-gray-600">Total Revenue</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Show Location Distribution */}
        {locationDistribution && locationDistribution.length > 0 && (
          <div className="bg-white rounded-lg shadow p-4 sm:p-6">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">
              Location Distribution
            </h3>
            {locationDistribution.length > 1 ? (
              <div className="h-64 sm:h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={locationDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ percentage }) => `${percentage}%`}
                      outerRadius="80%"
                      fill="#8884d8"
                      dataKey="count"
                      nameKey="location"
                    >
                      {locationDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value, name) => [value, 'Tickets']}
                      label={false}
                    />
                    <Legend 
                      formatter={(value, entry) => entry.payload.location}
                      wrapperStyle={{ fontSize: '12px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="text-center p-6 sm:p-8 text-gray-500">
                <p className="text-sm sm:text-base">All tickets from one location</p>
                {locationDistribution[0] && (
                  <p className="mt-2 text-base sm:text-lg font-semibold break-words">{locationDistribution[0].location}</p>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Recent Sales Activity */}
      <div className="bg-white rounded-lg shadow p-4 sm:p-6">
        <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">
          {isFiltered ? 'Recent Sales Activity (Filtered)' : 'Recent Sales Activity'}
        </h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Event</th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {analytics.recentSales.slice(0, 5).map((sale, index) => (
                <tr key={index}>
                  <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900">
                    {new Date(sale.purchaseDate + ' ' + sale.purchaseTime).toLocaleString()}
                  </td>
                  <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900">
                    {sale.attendeeName}
                  </td>
                  <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900">
                    {sale.eventTitle}
                  </td>
                  <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900">
                    {formatCurrency(sale.price)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}