import React, { useState } from 'react';
import {
  Users,
  Search,
  ShieldCheck,
  UserCheck,
  UserX,
  CreditCard,
  Mail,
  Phone,
  Calendar,
} from 'lucide-react';
import { UserDTO } from '../../../lib/api/client.js';
import { DataTable, ColumnDef } from '../tables/DataTable.js';
import { Button } from '../../ui/button.js';
import { Badge } from '../../ui/badge.js';
import { toast } from 'sonner';

interface UsersPageProps {
  users: UserDTO[];
  onToggleStatus: (userId: string) => void;
}

export const UsersPage: React.FC<UsersPageProps> = ({ users, onToggleStatus }) => {
  const columns: ColumnDef<UserDTO>[] = [
    {
      key: 'fullName',
      header: 'Candidate / Administrator',
      sortable: true,
      render: (row) => (
        <div className="space-y-0.5">
          <div className="font-semibold text-white">{row.fullName}</div>
          <div className="text-[11px] text-slate-400 flex items-center gap-2">
            <span>{row.email}</span>
            {row.phoneNumber && <span>• {row.phoneNumber}</span>}
          </div>
        </div>
      ),
    },
    {
      key: 'role',
      header: 'Role',
      render: (row) => {
        const variant =
          row.role === 'SUPER_ADMIN'
            ? 'default'
            : row.role === 'EXAMINER'
            ? 'warning'
            : 'outline';
        return <Badge variant={variant as any}>{row.role}</Badge>;
      },
    },
    {
      key: 'status',
      header: 'Account Status',
      render: (row) => (
        <Badge
          variant={row.status === 'ACTIVE' ? 'success' : 'destructive'}
          className="text-[10px]"
        >
          {row.status}
        </Badge>
      ),
    },
    {
      key: 'quizzesTaken',
      header: 'Exams Taken',
      render: (row) => (
        <span className="font-mono text-xs text-slate-300 font-semibold">
          {row.quizzesTaken} Quizzes
        </span>
      ),
    },
    {
      key: 'totalSpendBdt',
      header: 'Total Spend',
      render: (row) => (
        <span className="font-mono text-xs text-emerald-400 font-bold">
          ৳ {row.totalSpendBdt}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (row) => (
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              onToggleStatus(row.id);
              toast.info(`Toggled account status for ${row.fullName}`);
            }}
            className="h-7 px-2 text-xs text-slate-300 hover:text-white"
          >
            {row.status === 'ACTIVE' ? 'Suspend' : 'Activate'}
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 gap-4">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            User Accounts & Candidate Management (104,829 registered)
          </h2>
          <p className="text-xs text-slate-400">
            Search candidates, manage roles, inspect quiz attendance history, and review purchasing behavior.
          </p>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={users}
        totalCount={users.length}
        searchPlaceholder="Search candidates by name, email, or phone number..."
      />
    </div>
  );
};
