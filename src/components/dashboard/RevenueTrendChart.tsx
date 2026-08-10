import { DASH_CHART_COLORS, formatCompactBRL, type RevenueTrendPoint } from '../../data/dashboardCharts';

type Props = {
  data: RevenueTrendPoint[];
};

const W = 520;
const H = 220;
const PAD = { top: 12, right: 8, bottom: 36, left: 44 };

export function RevenueTrendChart({ data }: Props) {
  if (data.length === 0) {
    return <p className="dash-chart-empty">Ainda não há histórico de meses para exibir.</p>;
  }

  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const maxTotal = Math.max(...data.map((d) => d.total), 1);
  const barGap = 12;
  const barW = (innerW - barGap * (data.length - 1)) / data.length;

  const yTicks = 4;
  const yLines = Array.from({ length: yTicks + 1 }, (_, i) => (maxTotal / yTicks) * i);

  return (
    <svg
      className="dash-chart-svg"
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label="Gráfico de evolução da receita por mês, diárias e planos"
    >
      {yLines.map((v, i) => {
        const y = PAD.top + innerH - (v / maxTotal) * innerH;
        return (
          <g key={i}>
            <line
              x1={PAD.left}
              y1={y}
              x2={W - PAD.right}
              y2={y}
              stroke={DASH_CHART_COLORS.grid}
              strokeWidth={1}
            />
            <text
              x={PAD.left - 6}
              y={y + 4}
              textAnchor="end"
              fontSize={9}
              fill="var(--text-muted)"
            >
              {formatCompactBRL(v)}
            </text>
          </g>
        );
      })}

      {data.map((d, i) => {
        const x = PAD.left + i * (barW + barGap);
        const dailyH = (d.daily / maxTotal) * innerH;
        const connectH = (d.connect / maxTotal) * innerH;
        const baseY = PAD.top + innerH;

        return (
          <g key={d.label}>
            <rect
              x={x}
              y={baseY - dailyH - connectH}
              width={barW}
              height={connectH}
              rx={3}
              fill={DASH_CHART_COLORS.connect}
            />
            <rect
              x={x}
              y={baseY - dailyH}
              width={barW}
              height={dailyH}
              rx={3}
              fill={DASH_CHART_COLORS.daily}
            />
            <text
              x={x + barW / 2}
              y={H - 10}
              textAnchor="middle"
              fontSize={10}
              fill="var(--foreground-secondary)"
            >
              {d.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
