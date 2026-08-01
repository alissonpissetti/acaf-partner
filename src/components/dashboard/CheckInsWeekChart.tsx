import { DASH_CHART_COLORS, type CheckInDayPoint } from '../../data/dashboardCharts';

type Props = {
  data: CheckInDayPoint[];
};

const W = 400;
const H = 180;
const PAD = { top: 8, right: 8, bottom: 32, left: 28 };

export function CheckInsWeekChart({ data }: Props) {
  const max = Math.max(...data.map((d) => d.count), 1);
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const barGap = 8;
  const barW = (innerW - barGap * (data.length - 1)) / data.length;

  return (
    <svg
      className="dash-chart-svg"
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label="Check-ins validados nos últimos sete dias"
    >
      {[0, Math.ceil(max / 2), max].filter((v, i, a) => a.indexOf(v) === i).map((v) => {
        const y = PAD.top + innerH - (v / max) * innerH;
        return (
          <g key={v}>
            <line
              x1={PAD.left}
              y1={y}
              x2={W - PAD.right}
              y2={y}
              stroke={DASH_CHART_COLORS.grid}
              strokeWidth={1}
            />
            <text x={PAD.left - 4} y={y + 3} textAnchor="end" fontSize={9} fill="var(--text-muted)">
              {v}
            </text>
          </g>
        );
      })}

      {data.map((d, i) => {
        const x = PAD.left + i * (barW + barGap);
        const h = (d.count / max) * innerH;
        const y = PAD.top + innerH - h;
        return (
          <g key={d.label}>
            <rect
              x={x}
              y={y}
              width={barW}
              height={Math.max(h, d.count > 0 ? 4 : 0)}
              rx={4}
              fill={DASH_CHART_COLORS.daily}
              opacity={d.count > 0 ? 1 : 0.25}
            />
            {d.count > 0 && (
              <text x={x + barW / 2} y={y - 4} textAnchor="middle" fontSize={9} fontWeight="600" fill="var(--orange-dark)">
                {d.count}
              </text>
            )}
            <text
              x={x + barW / 2}
              y={H - 8}
              textAnchor="middle"
              fontSize={9}
              fill="var(--foreground-secondary)"
            >
              {d.shortLabel}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
