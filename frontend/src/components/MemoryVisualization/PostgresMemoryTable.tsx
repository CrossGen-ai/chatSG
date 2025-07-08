import React, { useState, useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  createColumnHelper,
  flexRender,
  ColumnDef,
  SortingState,
  ColumnFiltersState,
  PaginationState,
} from '@tanstack/react-table';
import { 
  ChevronUp, 
  ChevronDown, 
  Filter, 
  Search, 
  User, 
  MessageCircle, 
  Calendar, 
  Activity,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal
} from 'lucide-react';

interface PostgresMemoryItem {
  id: string;
  content: string;
  type: 'user' | 'assistant' | 'system';
  createdAt: string;
  updatedAt?: string;
  sessionId: string;
  sessionName: string;
  sessionStatus: 'active' | 'inactive' | 'archived' | 'deleted';
  sessionCreatedAt: string;
  messageCount: number;
  lastMessageAt: string;
  agentId?: string;
  metadata?: Record<string, any>;
}

interface PostgresMemoryTableProps {
  data: PostgresMemoryItem[];
}

const columnHelper = createColumnHelper<PostgresMemoryItem>();

export const PostgresMemoryTable: React.FC<PostgresMemoryTableProps> = ({ data }) => {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const columns = useMemo<ColumnDef<PostgresMemoryItem>[]>(() => [
    columnHelper.accessor('type', {
      id: 'type',
      header: ({ column }) => (
        <button
          className="flex items-center space-x-1 font-medium text-left"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          <User className="w-4 h-4" />
          <span>Type</span>
          {column.getIsSorted() === 'asc' ? (
            <ChevronUp className="w-4 h-4" />
          ) : column.getIsSorted() === 'desc' ? (
            <ChevronDown className="w-4 h-4" />
          ) : null}
        </button>
      ),
      cell: ({ getValue }) => {
        const type = getValue();
        const colors = {
          user: 'bg-blue-500/20 text-blue-400',
          assistant: 'bg-emerald-500/20 text-emerald-400',
          system: 'bg-purple-500/20 text-purple-400'
        };
        return (
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[type]}`}>
            {type}
          </span>
        );
      },
      size: 80,
    }),
    columnHelper.accessor('content', {
      id: 'content',
      header: ({ column }) => (
        <button
          className="flex items-center space-x-1 font-medium text-left"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          <MessageCircle className="w-4 h-4" />
          <span>Content</span>
          {column.getIsSorted() === 'asc' ? (
            <ChevronUp className="w-4 h-4" />
          ) : column.getIsSorted() === 'desc' ? (
            <ChevronDown className="w-4 h-4" />
          ) : null}
        </button>
      ),
      cell: ({ getValue, row }) => {
        const content = getValue();
        const isExpanded = expandedRows.has(row.id);
        const truncatedContent = content.length > 100 ? content.substring(0, 100) + '...' : content;
        
        return (
          <div className="space-y-1">
            <div className="text-sm theme-text-primary">
              {isExpanded ? content : truncatedContent}
            </div>
            {content.length > 100 && (
              <button
                onClick={() => {
                  const newExpanded = new Set(expandedRows);
                  if (isExpanded) {
                    newExpanded.delete(row.id);
                  } else {
                    newExpanded.add(row.id);
                  }
                  setExpandedRows(newExpanded);
                }}
                className="text-xs theme-text-secondary hover:theme-text-primary transition-colors"
              >
                {isExpanded ? 'Show less' : 'Show more'}
              </button>
            )}
          </div>
        );
      },
      size: 300,
    }),
    columnHelper.accessor('sessionName', {
      id: 'sessionName',
      header: ({ column }) => (
        <button
          className="flex items-center space-x-1 font-medium text-left"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          <Activity className="w-4 h-4" />
          <span>Session</span>
          {column.getIsSorted() === 'asc' ? (
            <ChevronUp className="w-4 h-4" />
          ) : column.getIsSorted() === 'desc' ? (
            <ChevronDown className="w-4 h-4" />
          ) : null}
        </button>
      ),
      cell: ({ getValue, row }) => {
        const sessionName = getValue();
        const sessionStatus = row.original.sessionStatus;
        const statusColors = {
          active: 'bg-green-500/20 text-green-400',
          inactive: 'bg-yellow-500/20 text-yellow-400',
          archived: 'bg-gray-500/20 text-gray-400',
          deleted: 'bg-red-500/20 text-red-400'
        };
        
        return (
          <div className="space-y-1">
            <div className="text-sm theme-text-primary font-medium">
              {sessionName}
            </div>
            <div className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${statusColors[sessionStatus]}`}>
              {sessionStatus}
            </div>
          </div>
        );
      },
      size: 150,
    }),
    columnHelper.accessor('createdAt', {
      id: 'createdAt',
      header: ({ column }) => (
        <button
          className="flex items-center space-x-1 font-medium text-left"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          <Calendar className="w-4 h-4" />
          <span>Created</span>
          {column.getIsSorted() === 'asc' ? (
            <ChevronUp className="w-4 h-4" />
          ) : column.getIsSorted() === 'desc' ? (
            <ChevronDown className="w-4 h-4" />
          ) : null}
        </button>
      ),
      cell: ({ getValue }) => {
        const date = new Date(getValue());
        return (
          <div className="text-sm theme-text-secondary">
            {date.toLocaleDateString()} {date.toLocaleTimeString([], { 
              hour: '2-digit', 
              minute: '2-digit' 
            })}
          </div>
        );
      },
      size: 120,
    }),
    columnHelper.display({
      id: 'actions',
      header: () => <span className="font-medium">Actions</span>,
      cell: ({ row }) => (
        <button
          onClick={() => {
            // TODO: Implement row actions (view details, etc.)
            console.log('Row action:', row.original);
          }}
          className="p-1 rounded hover:bg-white/10 dark:hover:bg-black/10 transition-colors"
          aria-label="More actions"
        >
          <MoreHorizontal className="w-4 h-4 theme-text-secondary" />
        </button>
      ),
      size: 60,
    }),
  ], [expandedRows]);

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnFilters,
      globalFilter,
      pagination,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    debugTable: false,
  });

  const handleRowSelection = (rowId: string) => {
    const newSelected = new Set(selectedRows);
    if (newSelected.has(rowId)) {
      newSelected.delete(rowId);
    } else {
      newSelected.add(rowId);
    }
    setSelectedRows(newSelected);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Search and Filters */}
      <div className="p-4 border-b border-white/20 dark:border-white/10 bg-white/5 dark:bg-black/5">
        <div className="flex flex-col space-y-3">
          {/* Global Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 theme-text-secondary" />
            <input
              type="text"
              placeholder="Search memories..."
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg bg-white/10 dark:bg-black/10 border border-white/20 dark:border-white/10 theme-text-primary placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-sm"
            />
          </div>

          {/* Quick Filters */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => {
                const filter = columnFilters.find(f => f.id === 'type');
                if (filter) {
                  setColumnFilters(columnFilters.filter(f => f.id !== 'type'));
                } else {
                  setColumnFilters([...columnFilters, { id: 'type', value: 'user' }]);
                }
              }}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                columnFilters.find(f => f.id === 'type' && f.value === 'user')
                  ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                  : 'bg-white/10 dark:bg-black/10 theme-text-secondary hover:theme-text-primary border border-white/20 dark:border-white/10'
              }`}
            >
              User Messages
            </button>
            <button
              onClick={() => {
                const filter = columnFilters.find(f => f.id === 'type');
                if (filter) {
                  setColumnFilters(columnFilters.filter(f => f.id !== 'type'));
                } else {
                  setColumnFilters([...columnFilters, { id: 'type', value: 'assistant' }]);
                }
              }}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                columnFilters.find(f => f.id === 'type' && f.value === 'assistant')
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-white/10 dark:bg-black/10 theme-text-secondary hover:theme-text-primary border border-white/20 dark:border-white/10'
              }`}
            >
              AI Responses
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full">
          <thead className="sticky top-0 bg-white/10 dark:bg-black/10 backdrop-blur-sm border-b border-white/20 dark:border-white/10">
            {table.getHeaderGroups().map(headerGroup => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map(header => (
                  <th
                    key={header.id}
                    className="px-4 py-3 text-left text-xs font-medium theme-text-primary uppercase tracking-wider"
                    style={{ width: header.getSize() }}
                  >
                    {header.isPlaceholder ? null : (
                      <div className="flex items-center space-x-2">
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {header.column.getCanFilter() && (
                          <Filter className="w-3 h-3 theme-text-secondary" />
                        )}
                      </div>
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-white/10 dark:divide-white/5">
            {table.getRowModel().rows.map(row => (
              <tr
                key={row.id}
                className={`hover:bg-white/5 dark:hover:bg-black/5 transition-colors ${
                  selectedRows.has(row.id) ? 'bg-white/10 dark:bg-black/10' : ''
                }`}
              >
                {row.getVisibleCells().map(cell => (
                  <td
                    key={cell.id}
                    className="px-4 py-3 text-sm"
                    style={{ width: cell.column.getSize() }}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="p-4 border-t border-white/20 dark:border-white/10 bg-white/5 dark:bg-black/5">
        <div className="flex items-center justify-between">
          <div className="text-sm theme-text-secondary">
            Showing {table.getRowModel().rows.length} of {table.getFilteredRowModel().rows.length} entries
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="p-2 rounded-lg hover:bg-white/10 dark:hover:bg-black/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4 theme-text-secondary" />
            </button>
            
            <div className="flex items-center space-x-1">
              <span className="text-sm theme-text-secondary">
                Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
              </span>
            </div>
            
            <button
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="p-2 rounded-lg hover:bg-white/10 dark:hover:bg-black/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-4 h-4 theme-text-secondary" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};