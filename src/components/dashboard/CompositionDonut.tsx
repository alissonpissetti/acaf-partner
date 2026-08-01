import { formatBRL } from '../../types';
import { type CompositionSlice } from '../../data/dashboardCharts';

type Props = {
  slices: CompositionSlice[];
  total: number;
};

const R = 42;
const C = 2 * Math.PI * R;

export function CompositionDonut({ slices, total }: Props) {
  const sum = slices.reduce((a, s) => a + s.value, 0) || 1;
  let offset = 0;

  if (total <= 0) {
    return <p className="dash-chart-empty">Sem movimentação neste mês.</p>;
  }

  return (
    <div className="dash-donut-wrap">
      <svg className="dash-donut-svg" viewBox="0 0 120 120" role="img" aria-label="Composição da receita do mês">
        <circle cx="60" cy="60" r={R} fill="none" stroke="var(--surface-muted)" strokeWidth="14" />
        {slices.map((s) => {
          const frac = s.value / sum;
          const dash = frac * C;
          const gap = C - dash;
          const el = (
            <circle
              key={s.key}
              cx="60"
              cy="60"
              r={R}
              fill="none"
              stroke={s.color}
              strokeWidth="14"
              strokeDasharray={`${dash} ${gap}`}
              strokeDashoffset={-offset}
              transform="rotate(-90 60 60)"
              strokeLinecap="butt"
            />
          );
          offset += dash;
          return el;
        })}
        <text x="60" y="54" textAnchor="middle" fontSize="9" fill="var(--text-muted)">
          Total
        </text>
        <text x="60" y="68" textAnchor="middle" fontSize="11" fontWeight="700" fill="var(--foreground)">
          {formatCompact(total)}
        </text>
      </svg>
      <div className="dash-donut-legend">
        {slices.map((s) => {
          const pct = Math.round((s.value / sum) * 100);
          return (
            <div key={s.key} className="dash-donut-legend-row">
              <span className="dash-chart-legend-item">
                <span className="dash-chart-legend-swatch" style={{ background: s.color }} />
                {s.label}
              </span>
              <span>
                <strong>{formatBRL(s.value)}</strong>
                <span className="dash-donut-legend-pct"> · {pct}%</span>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function formatCompact(n: number): string {
  if (n >= 10000) {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      maximumFractionDigits: 0,
    }).format(n);
  }
  return formatBRL(n);
}
