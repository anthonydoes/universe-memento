import React, { useState, useMemo } from 'react';
import { useTicketData } from '../hooks/useTicketData';
import { formatDate, formatCurrency } from '../utils/dateUtils';
import { ChevronUp, ChevronDown, Download, Search } from 'lucide-react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
} from '@tanstack/react-table';

export default function TicketTable({ filters }) {
  const { data, loading, pagination } = useTicketData(filters);
  const [sorting, setSorting] = useState([]);
  const [globalFilter, setGlobalFilter] = useState('');

  const columns = useMemo(
    () => [
      {
        accessorKey: 'ticketId',
        header: 'Order ID',
        size: 120,
      },
      {
        accessorKey: 'purchaseDate',
        header: 'Purchase Date',
        cell: (info) => formatDate(info.getValue()),
        size: 120,
      },
      {
        accessorKey: 'purchaseTime',
        header: 'Purchase Time',
        size: 120,
      },
      {
        accessorKey: 'attendeeName',
        header: 'Attendee Name',
        size: 160,
      },
      {
        accessorKey: 'email',
        header: 'Email',
        size: 200,
      },
      {
        accessorKey: 'address',
        header: 'Buyer Address',
        size: 250,
        cell: (info) => (
          <div className="max-w-xs truncate" title={info.getValue()}>
            {info.getValue() || '-'}
          </div>
        ),
      },
      {
        accessorKey: 'eventTitle',
        header: 'Event Title',
        size: 200,
      },
      {
        accessorKey: 'eventDate',
        header: 'Event Date',
        size: 120,
      },
      {
        accessorKey: 'eventTime',
        header: 'Event Time',
        size: 120,
      },
      {
        accessorKey: 'eventAddress',
        header: 'Event Address',
        size: 250,
        cell: (info) => (
          <div className="max-w-xs truncate" title={info.getValue()}>
            {info.getValue() || '-'}
          </div>
        ),
      },
      {
        accessorKey: 'venueName',
        header: 'Venue',
        size: 150,
      },
      {
        accessorKey: 'hostName',
        header: 'Host Name',
        size: 140,
      },
      {
        accessorKey: 'ticketRateName',
        header: 'Ticket Type',
        size: 150,
      },
      {
        accessorKey: 'addOnRateName',
        header: 'Add-on',
        size: 150,
        cell: (info) => info.getValue() || '-',
      },
      {
        accessorKey: 'quantity',
        header: 'Qty',
        cell: (info) => info.getValue() || 1,
        size: 60,
      },
      {
        accessorKey: 'price',
        header: 'Price',
        cell: (info) => formatCurrency(info.getValue()),
        size: 100,
      },
      {
        accessorKey: 'serviceFee',
        header: 'Service Fee',
        cell: (info) => formatCurrency(info.getValue()),
        size: 100,
      },
      {
        accessorKey: 'currency',
        header: 'Currency',
        size: 80,
      },
      {
        accessorKey: 'ticketStatus',
        header: 'Ticket Status',
        size: 120,
        cell: (info) => (
          <span className={`px-2 py-1 text-xs rounded-full ${
            info.getValue() === 'paid' 
              ? 'bg-green-100 text-green-800'
              : info.getValue() === 'cancelled'
              ? 'bg-red-100 text-red-800'
              : 'bg-gray-100 text-gray-800'
          }`}>
            {info.getValue() || '-'}
          </span>
        ),
      },
      {
        accessorKey: 'paymentStatus',
        header: 'Payment Status',
        size: 120,
        cell: (info) => (
          <span className={`px-2 py-1 text-xs rounded-full ${
            info.getValue() === 'paid' 
              ? 'bg-green-100 text-green-800'
              : info.getValue() === 'pending'
              ? 'bg-yellow-100 text-yellow-800'
              : info.getValue() === 'failed'
              ? 'bg-red-100 text-red-800'
              : 'bg-gray-100 text-gray-800'
          }`}>
            {info.getValue() || '-'}
          </span>
        ),
      },
      {
        accessorKey: 'costItemId',
        header: 'Cost Item ID',
        size: 120,
      },
      {
        accessorKey: 'eventStartTime',
        header: 'Event Start Time',
        size: 160,
        cell: (info) => {
          const value = info.getValue();
          if (!value) return '-';
          return new Date(value).toLocaleString();
        },
      },
      {
        accessorKey: 'eventEndTime',
        header: 'Event End Time',
        size: 160,
        cell: (info) => {
          const value = info.getValue();
          if (!value) return '-';
          return new Date(value).toLocaleString();
        },
      },
    ],
    []
  );

  const table = useReactTable({
    data: data || [],
    columns,
    state: {
      sorting,
      globalFilter,
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  const handleExport = async () => {
    const params = new URLSearchParams();
    
    // Add current filters to export URL
    Object.entries(filters).forEach(([key, value]) => {
      if (key === 'events' && Array.isArray(value)) {
        // Send each event as a separate parameter
        value.forEach(event => params.append('events', event));
      } else if (value !== '' && value != null && key !== 'page' && key !== 'limit') {
        params.append(key, value);
      }
    });
    
    const exportUrl = `${import.meta.env.VITE_API_BASE_URL || ''}/api/export/csv?${params}`;
    window.open(exportUrl, '_blank');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div>
      {/* Table Controls */}
      <div className="mb-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={globalFilter ?? ''}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Search all columns..."
          />
        </div>
        <button
          onClick={handleExport}
          className="flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 whitespace-nowrap"
        >
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto border border-gray-200 rounded-lg">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    <div className="flex items-center">
                      <span className="truncate">
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                      </span>
                      {{
                        asc: <ChevronUp className="ml-1 h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />,
                        desc: <ChevronDown className="ml-1 h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />,
                      }[header.column.getIsSorted()] ?? null}
                    </div>
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id} className="hover:bg-gray-50">
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-3 sm:px-6 py-4 text-xs sm:text-sm text-gray-900">
                    <div className="truncate max-w-xs">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="text-xs sm:text-sm text-gray-700 order-2 sm:order-1">
          Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
          {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
          {pagination.total} results
        </div>
        <div className="flex space-x-2 order-1 sm:order-2">
          <button
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            className="px-3 py-2 text-sm border border-gray-300 rounded-md disabled:opacity-50 hover:bg-gray-50"
          >
            Previous
          </button>
          <button
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            className="px-3 py-2 text-sm border border-gray-300 rounded-md disabled:opacity-50 hover:bg-gray-50"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}