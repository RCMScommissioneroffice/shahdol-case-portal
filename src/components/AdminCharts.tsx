import React, { useState } from 'react';

const STATUS_COLORS: Record<string, string> = {
  Pending: '#D97706',
  'Viewed by Patwari': '#0284C7',
  'Report in Progress': '#4F46E5',
  'Report Submitted': '#059669',
  'Returned for Correction': '#DC2626',
  'Report Resubmitted': '#0D9488',
  Closed: '#334155'
};

export function StatusPieChart({
  data
}: {
  data: Array<{ status: string; count: number }>;
}) {
  const [hovered, setHovered] = useState<string | null>(null);
  const total = data.reduce((acc, item) => acc + Number(item.count), 0);

  if (total === 0) {
    return (
      <div className="flex h-56 items-center justify-center text-sm text-slate-500">
        No case data available yet.
      </div>
    );
  }

  let cumulativePercent = 0;
  const radius = 64;
  const circumference = 2 * Math.PI * radius;

  return (
    <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center sm:justify-between">
      <div className="relative flex h-44 w-44 shrink-0 items-center justify-center">
        <svg viewBox="0 0 180 180" className="h-full w-full -rotate-90">
          {data.map((slice) => {
            const pct = Number(slice.count) / total;
            const strokeDasharray = `${pct * circumference} ${circumference}`;
            const strokeDashoffset = -cumulativePercent * circumference;
            cumulativePercent += pct;
            const color = STATUS_COLORS[slice.status] || '#64748B';
            const isHovered = hovered === slice.status;

            return (
              <circle
                key={slice.status}
                cx="90"
                cy="90"
                r={radius}
                fill="transparent"
                stroke={color}
                strokeWidth={isHovered ? 28 : 24}
                strokeDasharray={strokeDasharray}
                strokeDashoffset={strokeDashoffset}
                className="cursor-pointer transition-all duration-150"
                onMouseEnter={() => setHovered(slice.status)}
                onMouseLeave={() => setHovered(null)}
              />
            );
          })}
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="font-mono text-2xl font-semibold text-slate-900 tabular-nums">
            {hovered
              ? data.find((d) => d.status === hovered)?.count ?? total
              : total}
          </span>
          <span className="max-w-[90px] truncate text-[11px] font-medium text-slate-500">
            {hovered || 'Total Cases'}
          </span>
        </div>
      </div>

      <div className="grid w-full grid-cols-1 gap-2">
        {data.map((item) => {
          const pct = Math.round((Number(item.count) / total) * 100);
          const color = STATUS_COLORS[item.status] || '#64748B';
          return (
            <div
              key={item.status}
              onMouseEnter={() => setHovered(item.status)}
              onMouseLeave={() => setHovered(null)}
              className={`flex items-center justify-between rounded px-2 py-1 text-xs transition-colors ${
                hovered === item.status ? 'bg-slate-100' : ''
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-xs"
                  style={{ backgroundColor: color }}
                />
                <span className="truncate font-medium text-slate-700">{item.status}</span>
              </div>
              <div className="flex items-center gap-2 font-mono tabular-nums text-slate-600 shrink-0">
                <span className="font-semibold text-slate-900">{item.count}</span>
                <span className="text-slate-400">({pct}%)</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function DivisionBarChart({
  rows
}: {
  rows: Array<{ name: string; totalRequests: number; pending: number; submitted: number; closed: number }>;
}) {
  if (!rows.length) {
    return (
      <div className="flex h-56 items-center justify-center text-sm text-slate-500">
        No breakdown data available.
      </div>
    );
  }

  const maxVal = Math.max(...rows.map((r) => Number(r.totalRequests) || 0), 1);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-xs bg-amber-500" /> Pending / In Progress
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-xs bg-emerald-600" /> Reports Submitted
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-xs bg-slate-700" /> Closed
        </span>
      </div>

      <div className="space-y-3">
        {rows.slice(0, 8).map((row) => {
          const total = Number(row.totalRequests) || 0;
          const pending = Number(row.pending) || 0;
          const submitted = Number(row.submitted) || 0;
          const closed = Number(row.closed) || 0;
          const other = Math.max(0, total - pending - submitted - closed);

          const barWidth = (val: number) => `${(val / maxVal) * 100}%`;

          return (
            <div key={row.name} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-slate-800 truncate">{row.name}</span>
                <span className="font-mono tabular-nums text-slate-600">
                  {total} total · {closed} closed
                </span>
              </div>
              <div className="flex h-5 w-full overflow-hidden rounded bg-slate-100">
                {pending > 0 && (
                  <div
                    style={{ width: barWidth(pending) }}
                    className="bg-amber-500 transition-all"
                    title={`Pending: ${pending}`}
                  />
                )}
                {other > 0 && (
                  <div
                    style={{ width: barWidth(other) }}
                    className="bg-indigo-500 transition-all"
                    title={`Active/Correction: ${other}`}
                  />
                )}
                {submitted > 0 && (
                  <div
                    style={{ width: barWidth(submitted) }}
                    className="bg-emerald-600 transition-all"
                    title={`Submitted: ${submitted}`}
                  />
                )}
                {closed > 0 && (
                  <div
                    style={{ width: barWidth(closed) }}
                    className="bg-slate-700 transition-all"
                    title={`Closed: ${closed}`}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function CaseTrendChart({
  data
}: {
  data: Array<{ period: string; requests: number; completed: number }>;
}) {
  if (!data.length) {
    return (
      <div className="flex h-52 items-center justify-center text-sm text-slate-500">
        Not enough monthly data for trend chart.
      </div>
    );
  }

  const width = 520;
  const height = 180;
  const padX = 42;
  const padY = 24;
  const maxY = Math.max(...data.map((d) => Math.max(Number(d.requests), Number(d.completed))), 2);

  const getX = (idx: number) => {
    if (data.length === 1) return width / 2;
    return padX + (idx / (data.length - 1)) * (width - padX * 2);
  };
  const getY = (val: number) => height - padY - (val / maxY) * (height - padY * 2);

  const reqPoints = data.map((d, i) => `${getX(i)},${getY(Number(d.requests))}`).join(' ');
  const compPoints = data.map((d, i) => `${getX(i)},${getY(Number(d.completed))}`).join(' ');

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-5 text-xs text-slate-600">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-4 rounded-xs bg-blue-700" /> Requests Created
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-4 rounded-xs bg-emerald-600" /> Reports Completed / Closed
        </span>
      </div>

      <div className="w-full overflow-x-auto">
        <svg viewBox={`0 0 ${width} ${height}`} className="h-48 w-full min-w-[360px]">
          {[0, 0.5, 1].map((tick) => {
            const y = getY(maxY * tick);
            return (
              <g key={tick}>
                <line x1={padX} y1={y} x2={width - padX} y2={y} stroke="#E2E8F0" strokeDasharray="3 3" />
                <text
                  x={padX - 8}
                  y={y + 4}
                  textAnchor="end"
                  className="fill-slate-400 font-mono text-[10px]"
                >
                  {Math.round(maxY * tick)}
                </text>
              </g>
            );
          })}

          {data.length > 1 && (
            <>
              <polyline fill="none" stroke="#1D4ED8" strokeWidth="2.5" points={reqPoints} />
              <polyline fill="none" stroke="#059669" strokeWidth="2.5" points={compPoints} />
            </>
          )}

          {data.map((d, i) => {
            const x = getX(i);
            const yReq = getY(Number(d.requests));
            const yComp = getY(Number(d.completed));
            return (
              <g key={d.period}>
                <circle cx={x} cy={yReq} r="4.5" fill="#1D4ED8" stroke="#FFFFFF" strokeWidth="1.5" />
                <circle cx={x} cy={yComp} r="4.5" fill="#059669" stroke="#FFFFFF" strokeWidth="1.5" />
                <text x={x} y={height - 6} textAnchor="middle" className="fill-slate-500 font-mono text-[10px]">
                  {d.period}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
