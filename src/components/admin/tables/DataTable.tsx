import React, { useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowUpDown,
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
  totalCount: number;
  pageSize?: number;
  currentPage?: number;
  onPageChange?: (page: number) => void;
  onSearchChange?: (search: string) => void;
  isLoading?: boolean;
  searchPlaceholder?: string;
  bulkActions?: {
    label: string;
    action: (selectedRows: T[]) => void;
    variant?: 'default' | 'destructive';
  }[];
  emptyMessage?: string;
}

export function DataTable<T extends { id: string }>({
  columns,
  data,
  totalCount,
  pageSize = 10,
  currentPage = 1,
  onPageChange,
  onSearchChange,
  isLoading = false,
  searchPlaceholder = 'Search records...',
  bulkActions,
  emptyMessage = 'No records found matching criteria.',
}: DataTableProps<T>) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  const toggleSelectAll = () => {
    if (selectedIds.size === data.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(data.map((d) => d.id)));
    }
  };

  const toggleSelectRow = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const selectedRows = data.filter((d) => selectedIds.has(d.id));

  return (
    <div className="space-y-3">
      {/* Search and Bulk Action Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900/80 p-3 rounded-xl border border-slate-800">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-500" />
          <Input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              onSearchChange?.(e.target.value);
            }}
            placeholder={searchPlaceholder}
            className="pl-8 text-xs bg-slate-950 border-slate-700 h-8"
          />
        </div>

        {/* Bulk Action Controls */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          {selectedIds.size > 0 && bulkActions && (
            <div className="flex items-center gap-2 animate-in fade-in-50">
              <span className="text-xs text-orange-400 font-semibold">
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
          <span className="text-xs text-slate-400 font-mono hidden sm:inline">
            Total: {totalCount} records
          </span>
        </div>
      </div>

      {/* Table Container */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/90 overflow-hidden shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <input
                  type="checkbox"
                  checked={data.length > 0 && selectedIds.size === data.length}
                  onChange={toggleSelectAll}
                  className="rounded border-slate-700 bg-slate-950 text-orange-500 focus:ring-orange-500 h-3.5 w-3.5 cursor-pointer"
                />
              </TableHead>
              {columns.map((col) => (
                <TableHead key={col.key} className="text-xs font-semibold text-slate-400">
                  <div className="flex items-center gap-1.5">
                    {col.header}
                    {col.sortable && <ArrowUpDown className="h-3 w-3 text-slate-600 hover:text-slate-300 cursor-pointer" />}
                  </div>
                </TableHead>
              ))}
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
            ) : data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length + 1} className="h-32 text-center text-slate-500 text-xs">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <AlertCircle className="h-6 w-6 text-slate-600" />
                    {emptyMessage}
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              data.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={selectedIds.has(row.id) ? 'selected' : undefined}
                >
                  <TableCell className="w-10">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(row.id)}
                      onChange={() => toggleSelectRow(row.id)}
                      className="rounded border-slate-700 bg-slate-950 text-orange-500 focus:ring-orange-500 h-3.5 w-3.5 cursor-pointer"
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
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-2 py-1 text-xs text-slate-400">
        <div>
          Showing page <span className="text-white font-semibold">{currentPage}</span> of{' '}
          <span className="text-white font-semibold">{totalPages}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage <= 1}
            onClick={() => onPageChange?.(1)}
            className="h-7 w-7 p-0"
          >
            <ChevronsLeft className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage <= 1}
            onClick={() => onPageChange?.(currentPage - 1)}
            className="h-7 w-7 p-0"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>
          <span className="px-2 font-mono text-slate-300">
            {currentPage} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage >= totalPages}
            onClick={() => onPageChange?.(currentPage + 1)}
            className="h-7 w-7 p-0"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage >= totalPages}
            onClick={() => onPageChange?.(totalPages)}
            className="h-7 w-7 p-0"
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
