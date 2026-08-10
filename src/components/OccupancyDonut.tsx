type Props = {
  booked: number;
  capacity: number;
  size?: number;
};

function occupancyColor(ratio: number): string {
  if (ratio >= 1) return '#d97706';
  if (ratio >= 0.85) return '#f59e0b';
  if (ratio > 0) return '#2563eb';
  return '#9ca3af';
}

export function OccupancyDonut({ booked, capacity, size = 26 }: Props) {
  const safeCapacity = Math.max(capacity, 1);
  const ratio = Math.min(1, Math.max(0, booked / safeCapacity));
  const r = 9;
  const c = 2 * Math.PI * r;
  const dash = ratio * c;
  const gap = c - dash;
  const pct = Math.round(ratio * 100);
  const color = occupancyColor(ratio);

  return (
    <svg
      className="occupancy-donut"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      role="img"
      aria-label={`Ocupação ${booked} de ${capacity} vagas (${pct}%)`}
    >
      <circle
        cx="12"
        cy="12"
        r={r}
        fill="none"
        stroke="var(--border, #e5e7eb)"
        strokeWidth="3.5"
      />
      {ratio > 0 ? (
        <circle
          cx="12"
          cy="12"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="3.5"
          strokeDasharray={`${dash} ${gap}`}
          strokeLinecap="round"
          transform="rotate(-90 12 12)"
        />
      ) : null}
    </svg>
  );
}
