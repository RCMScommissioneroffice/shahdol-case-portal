import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Eye,
  FileCheck2,
  FilePenLine,
  Lock
} from 'lucide-react';
import React from 'react';
import type { CaseStatus } from '../types';

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return '—';
  const normalized = value.includes('T') ? value : value.replace(' ', 'T') + 'Z';
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
}

export function formatTimestamp(value: string | null | undefined): string {
  if (!value) return '—';
  const normalized = value.includes('T') ? value : value.replace(' ', 'T') + 'Z';
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

interface StatusStyle {
  text: string;
  bg: string;
  border: string;
  labelHi: string;
  Icon: React.ComponentType<{ className?: string }>;
}

const STATUS_MAP: Record<string, StatusStyle> = {
  Pending: {
    text: 'text-amber-800',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    labelHi: 'लंबित',
    Icon: Clock
  },
  'Viewed by Patwari': {
    text: 'text-sky-800',
    bg: 'bg-sky-50',
    border: 'border-sky-200',
    labelHi: 'पटवारी द्वारा देखा गया',
    Icon: Eye
  },
  'Report in Progress': {
    text: 'text-indigo-800',
    bg: 'bg-indigo-50',
    border: 'border-indigo-200',
    labelHi: 'प्रतिवेदन निर्माणाधीन',
    Icon: FilePenLine
  },
  'Report Submitted': {
    text: 'text-emerald-800',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    labelHi: 'प्रतिवेदन प्रस्तुत',
    Icon: FileCheck2
  },
  'Returned for Correction': {
    text: 'text-rose-800',
    bg: 'bg-rose-50',
    border: 'border-rose-200',
    labelHi: 'सुधार हेतु वापस',
    Icon: AlertTriangle
  },
  'Report Resubmitted': {
    text: 'text-teal-800',
    bg: 'bg-teal-50',
    border: 'border-teal-200',
    labelHi: 'पुनः प्रस्तुत',
    Icon: CheckCircle2
  },
  Closed: {
    text: 'text-slate-700',
    bg: 'bg-slate-100',
    border: 'border-slate-300',
    labelHi: 'निराकृत / बंद',
    Icon: Lock
  }
};

export function StatusIndicator({
  status,
  bilingual = false,
  patwariLabel = false
}: {
  status: CaseStatus | string;
  bilingual?: boolean;
  patwariLabel?: boolean;
}) {
  const cfg = STATUS_MAP[status] || STATUS_MAP.Pending;
  const Icon = cfg.Icon;
  const displayLabel =
    patwariLabel && status === 'Returned for Correction'
      ? 'Correction Required'
      : status;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded border px-2 py-0.5 text-xs font-medium whitespace-nowrap ${cfg.bg} ${cfg.text} ${cfg.border}`}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" />
      <span>
        {displayLabel}
        {bilingual ? ` · ${cfg.labelHi}` : ''}
      </span>
    </span>
  );
}
