import { DASH_CHART_COLORS, formatCompactBRL, type UnitRevenuePoint } from '../../data/dashboardCharts';

type Props = {
  data: UnitRevenuePoint[];
};

const ROW = 36;
const PAD = { top: 4, right: 72, bottom: 8, left: 120 };
const BAR_H = 14;

export function UnitRevenueChart({ data }: Props) {
  if (data.length === 0) {
    return <p className="dash-chart-empty">Nenhuma unidade com extrato neste mês.</p>;
  }

  const max = Math.max(...data.map((d) => d.total), 1);
  const W = 420;
  const H = PAD.top + PAD.bottom + data.length * ROW;
  const innerW = W - PAD.left - PAD.right;

  return (
    <svg
      className="dash-chart-svg"
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label="Receita do mês por unidade"
    >
      {data.map((d, i) => {
        const y = PAD.top + i * ROW + 8;
        const totalW = (d.total / max) * innerW;
        const connectW = d.total > 0 ? (d.connect / d.total) * totalW : 0;
        const dailyW = totalW - connectW;
        const label = d.label.length > 16 ? `${d.label.slice(0, 15)}…` : d.label;

        return (
          <g key={d.unitId}>
            <text
              x={PAD.left - 8}
              y={y + BAR_H}
              textAnchor="end"
              fontSize={10}
              fill="var(--foreground-secondary)"
            >
              {label}
            </text>
            <rect
              x={PAD.left}
              y={y}
              width={connectW}
              height={BAR_H}
              rx={3}
              fill={DASH_CHART_COLORS.connect}
            />
            <rect
              x={PAD.left + connectW}
              y={y}
              width={dailyW}
              height={BAR_H}
              rx={3}
              fill={DASH_CHART_COLORS.daily}
            />
            <text
              x={PAD.left + innerW + 6}
              y={y + BAR_H - 2}
              fontSize={9}
              fontWeight="600"
              fill="var(--foreground)"
            >
              {formatCompactBRL(d.total)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
