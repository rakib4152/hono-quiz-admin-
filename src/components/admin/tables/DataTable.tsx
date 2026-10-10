import React, { useState, useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Search,
  Filter,
  Check,
  Trash2,
  Download,
  AlertCircle,
} from 'lucide-react';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '../../ui/table.js';
import { Button } from '../../ui/button.js';
import { Input } from '../../ui/input.js';
import { Skeleton } from '../../ui/skeleton.js';
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../../ui/dialog.js';

export interface ColumnDef<T> {
  key: string;
  header: string;
  sortable?: boolean;
  render?: (row: T) => React.ReactNode;
}

export interface DataTableProps<T> {
  columns: ColumnDef<T>[];
  data: T[];
  totalCount?: number;
  pageSize?: number;
  currentPage?: number;
  onPageChange?: (page: number) => void;
  onSearchChange?: (search: string) => void;
  isLoading?: boolean;
  searchPlaceholder?: string;
  bulkActions?: {
    label: string;
    action: (selectedRows: T[]) => void;
    variant?: 'default' | 'destructive' | 'secondary';
  }[];
  emptyMessage?: string;
  pageSizeOptions?: number[];
}

export function DataTable<T extends { id: string }>({
  columns,
  data,
  totalCount,
  pageSize: initialPageSize = 10,
  currentPage: controlledCurrentPage,
  onPageChange,
  onSearchChange,
  isLoading = false,
  searchPlaceholder = 'Search records...',
  bulkActions,
  emptyMessage = 'No records found matching criteria.',
  pageSizeOptions = [5, 10, 20, 50],
}: DataTableProps<T>) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [internalSearchTerm, setInternalSearchTerm] = useState('');
  const [internalCurrentPage, setInternalCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  // Determine controlled vs uncontrolled page
  const isControlledPage = controlledCurrentPage !== undefined && onPageChange !== undefined;
  const activePage = isControlledPage ? controlledCurrentPage : internalCurrentPage;

  const handlePageChange = (page: number) => {
    if (isControlledPage) {
      onPageChange(page);
    } else {
      setInternalCurrentPage(page);
    }
  };

  // Internal client-side search filtering if onSearchChange is not handling it
  const filteredData = useMemo(() => {
    if (onSearchChange) {
      return data;
    }
    if (!internalSearchTerm.trim()) {
      return data;
    }
    const term = internalSearchTerm.toLowerCase();
    return data.filter((row: any) => {
      return Object.values(row).some((val) => {
        if (val === null || val === undefined) return false;
        if (typeof val === 'string' || typeof val === 'number') {
          return String(val).toLowerCase().includes(term);
        }
        return false;
      });
    });
  }, [data, internalSearchTerm, onSearchChange]);

  // Column sorting
  const sortedData = useMemo(() => {
    if (!sortKey) return filteredData;
    return [...filteredData].sort((a: any, b: any) => {
      const valA = a[sortKey];
      const valB = b[sortKey];
      if (valA === valB) return 0;
      if (valA === null || valA === undefined) return 1;
      if (valB === null || valB === undefined) return -1;

      let comparison = 0;
      if (typeof valA === 'number' && typeof valB === 'number') {
        comparison = valA - valB;
      } else {
        comparison = String(valA).localeCompare(String(valB));
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [filteredData, sortKey, sortDirection]);

  // Total count calculation
  const effectiveTotalCount = totalCount !== undefined ? totalCount : sortedData.length;
  const totalPages = Math.max(1, Math.ceil(effectiveTotalCount / pageSize));

  // Client-side pagination slicing: if data length exceeds pageSize, slice it
  const displayData = useMemo(() => {
    // If the parent passed pre-sliced data (i.e. data.length <= pageSize and totalCount is much higher)
    if (totalCount !== undefined && data.length <= pageSize && effectiveTotalCount > data.length) {
      return sortedData;
    }
    const startIndex = (activePage - 1) * pageSize;
    return sortedData.slice(startIndex, startIndex + pageSize);
  }, [sortedData, activePage, pageSize, totalCount, data.length, effectiveTotalCount]);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else {
        setSortKey(null);
        setSortDirection('asc');
      }
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === displayData.length && displayData.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(displayData.map((d) => d.id)));
    }
  };

  const toggleSelectRow = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const selectedRows = displayData.filter((d) => selectedIds.has(d.id));

  // Range of items currently showing
  const startItemIndex = effectiveTotalCount === 0 ? 0 : (activePage - 1) * pageSize + 1;
  const endItemIndex = Math.min(activePage * pageSize, effectiveTotalCount);

  return (
    <div className="space-y-3">
      {/* Search and Bulk Action Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900/90 p-3 rounded-xl border border-slate-800">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-500" />
          <Input
            type="text"
            value={internalSearchTerm}
            onChange={(e) => {
              setInternalSearchTerm(e.target.value);
              if (!isControlledPage) setInternalCurrentPage(1);
              onSearchChange?.(e.target.value);
            }}
            placeholder={searchPlaceholder}
            className="pl-8 text-xs bg-slate-950 border-slate-700 h-8"
          />
        </div>

        {/* Bulk Action Controls & Page Size */}
        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          {selectedIds.size > 0 && bulkActions && (
            <div className="flex items-center gap-2 animate-in fade-in-50">
              <span className="text-xs text-orange-400 font-semibold bg-orange-950/60 px-2 py-0.5 rounded border border-orange-800/50">
                {selectedIds.size} selected
              </span>
              {bulkActions.map((ba, idx) => (
                <Button
                  key={idx}
                  size="sm"
                  variant={ba.variant || 'secondary'}
                  className="h-8 text-xs gap-1.5"
                  onClick={() => {
                    setPendingAction(() => () => {
                      ba.action(selectedRows);
                      setSelectedIds(new Set());
                    });
                    setConfirmDeleteOpen(true);
                  }}
                >
                  <Trash2 className="h-3 w-3" />
                  {ba.label}
                </Button>
              ))}
            </div>
          )}

          {/* Page Size Select */}
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <span className="hidden md:inline text-[11px]">Rows:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                const newSize = Number(e.target.value);
                setPageSize(newSize);
                handlePageChange(1);
              }}
              className="bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-lg px-2 py-1 outline-none focus:border-orange-500"
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>

          <span className="text-xs text-slate-400 font-mono hidden sm:inline">
            Total: <span className="text-white font-semibold">{effectiveTotalCount}</span>
          </span>
        </div>
      </div>

      {/* Table Container */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/95 overflow-hidden shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <input
                  type="checkbox"
                  checked={displayData.length > 0 && selectedIds.size === displayData.length}
                  onChange={toggleSelectAll}
                  className="rounded border-slate-700 bg-slate-950 text-orange-500 focus:ring-orange-500 h-3.5 w-3.5 cursor-pointer accent-orange-500"
                />
              </TableHead>
              {columns.map((col) => {
                const isSorted = sortKey === col.key;
                return (
                  <TableHead
                    key={col.key}
                    className={`text-xs font-semibold text-slate-400 ${
                      col.sortable ? 'cursor-pointer select-none hover:text-slate-200' : ''
                    }`}
                    onClick={() => col.sortable && handleSort(col.key)}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>{col.header}</span>
                      {col.sortable && (
                        <span>
                          {isSorted ? (
                            sortDirection === 'asc' ? (
                              <ArrowUp className="h-3 w-3 text-orange-400" />
                            ) : (
                              <ArrowDown className="h-3 w-3 text-orange-400" />
                            )
                          ) : (
                            <ArrowUpDown className="h-3 w-3 text-slate-600 hover:text-slate-400" />
                          )}
                        </span>
                      )}
                    </div>
                  </TableHead>
                );
              })}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              // Loading skeleton
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell className="w-10">
                    <Skeleton className="h-4 w-4" />
                  </TableCell>
                  {columns.map((col) => (
                    <TableCell key={col.key}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : displayData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length + 1} className="h-32 text-center text-slate-500 text-xs">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <AlertCircle className="h-6 w-6 text-slate-600" />
                    <span>{emptyMessage}</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              displayData.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={selectedIds.has(row.id) ? 'selected' : undefined}
                  className="hover:bg-slate-800/50 transition-colors"
                >
                  <TableCell className="w-10">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(row.id)}
                      onChange={() => toggleSelectRow(row.id)}
                      className="rounded border-slate-700 bg-slate-950 text-orange-500 focus:ring-orange-500 h-3.5 w-3.5 cursor-pointer accent-orange-500"
                    />
                  </TableCell>
                  {columns.map((col) => (
                    <TableCell key={col.key} className="text-xs">
                      {col.render ? col.render(row) : (row as any)[col.key]}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-2 py-1.5 text-xs text-slate-400">
        <div>
          Showing <span className="text-white font-medium">{startItemIndex}</span> to{' '}
          <span className="text-white font-medium">{endItemIndex}</span> of{' '}
          <span className="text-white font-semibold">{effectiveTotalCount}</span> records
        </div>
        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="sm"
            disabled={activePage <= 1}
            onClick={() => handlePageChange(1)}
            className="h-7 w-7 p-0 border-slate-800 bg-slate-900 text-slate-300 hover:text-white disabled:opacity-40"
            title="First Page"
          >
            <ChevronsLeft className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={activePage <= 1}
            onClick={() => handlePageChange(activePage - 1)}
            className="h-7 w-7 p-0 border-slate-800 bg-slate-900 text-slate-300 hover:text-white disabled:opacity-40"
            title="Previous Page"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>

          {/* Page Indicators */}
          <div className="flex items-center gap-1 mx-1">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum = i + 1;
              if (totalPages > 5 && activePage > 3) {
                pageNum = activePage - 3 + i;
                if (pageNum > totalPages) pageNum = totalPages - (4 - i);
              }
              if (pageNum < 1 || pageNum > totalPages) return null;
              const isActive = pageNum === activePage;
              return (
                <button
                  key={pageNum}
                  onClick={() => handlePageChange(pageNum)}
                  className={`h-7 min-w-7 px-2 rounded text-xs font-mono transition-colors ${
                    isActive
                      ? 'bg-orange-600 text-white font-bold'
                      : 'bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-white border border-slate-800'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>

          <Button
            variant="outline"
            size="sm"
            disabled={activePage >= totalPages}
            onClick={() => handlePageChange(activePage + 1)}
            className="h-7 w-7 p-0 border-slate-800 bg-slate-900 text-slate-300 hover:text-white disabled:opacity-40"
            title="Next Page"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={activePage >= totalPages}
            onClick={() => handlePageChange(totalPages)}
            className="h-7 w-7 p-0 border-slate-800 bg-slate-900 text-slate-300 hover:text-white disabled:opacity-40"
            title="Last Page"
          >
            <ChevronsRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Confirmation Dialog for Destructive Actions */}
      <Dialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <DialogHeader>
          <DialogTitle>Confirm Destructive Action</DialogTitle>
          <DialogDescription>
            Are you sure you want to execute this bulk action on {selectedIds.size} selected item(s)? This action cannot be reversed.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => setConfirmDeleteOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => {
              pendingAction?.();
              setConfirmDeleteOpen(false);
            }}
          >
            Confirm & Proceed
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
