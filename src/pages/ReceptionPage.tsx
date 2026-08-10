import { useEffect, useMemo, useState } from 'react';
import { UnitScopeBanner } from '../components/UnitSwitcher';
import { checkInTypeLabel } from '../data/helpers';
import { todayCheckInsForUnit } from '../data/receptionReport';
import { usePortal } from '../portalContext';
import './ReceptionPage.css';

const POLL_MS = 5000;

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function isRecent(iso: string, withinMs = 90_000): boolean {
  return Date.now() - new Date(iso).getTime() <= withinMs;
}

export function ReceptionPage() {
  const { state, unit, refresh, isAllUnits } = usePortal();
  const [lastRefreshAt, setLastRefreshAt] = useState<Date | null>(null);

  const todayLabel = useMemo(
    () =>
      new Date().toLocaleDateString('pt-BR', {
        weekday: 'long',
        day: '2-digit',
        month: 'long',
      }),
    [],
  );

  const liveRows = useMemo(
    () => todayCheckInsForUnit(state.checkInLog, unit.id, state.units),
    [state.checkInLog, unit.id, state.units],
  );

  useEffect(() => {
    let active = true;
    const tick = async () => {
      try {
        await refresh();
        if (active) setLastRefreshAt(new Date());
      } catch {
        /* ignore */
      }
    };
    void tick();
    const timer = window.setInterval(() => void tick(), POLL_MS);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [refresh]);

  return (
    <div className="page-stack reception-page">
      <UnitScopeBanner />
      <header className="reception-hero">
        <h1 className="page-title">Check-in em tempo real</h1>
        <p className="page-subtitle">
          Entradas liberadas automaticamente pelo ACAF Connect quando o aluno está dentro de 1 km da
          unidade · {unit.unitName}
          {isAllUnits ? ' · escolha a unidade na barra lateral' : ''}
        </p>
      </header>

      <div className="card reception-live-card">
        <div className="reception-live-head">
          <div>
            <h2 className="section-title">Entradas de hoje</h2>
            <p className="reception-live-hint">
              {todayLabel} · o app valida geolocalização e registra o check-in sem ação da
              recepção.
            </p>
          </div>
          <div className="reception-live-status" aria-live="polite">
            <span className="reception-live-pulse" aria-hidden />
            Ao vivo
            {lastRefreshAt ? (
              <span className="reception-live-updated">
                · atualizado {formatTime(lastRefreshAt.toISOString())}
              </span>
            ) : null}
          </div>
        </div>

        {liveRows.length === 0 ? (
          <p className="reception-empty reception-live-empty">
            Nenhum check-in registrado ainda. Assim que um aluno fizer check-in no app, a entrada
            aparece aqui automaticamente.
          </p>
        ) : (
          <ul className="reception-live-feed">
            {liveRows.map((row) => (
              <li
                key={row.id}
                className={`reception-live-item ${isRecent(row.validatedAt) ? 'is-new' : ''}`}
              >
                <div className="reception-live-item-time">{formatTime(row.validatedAt)}</div>
                <div className="reception-live-item-main">
                  <strong>{row.holderName}</strong>
                  <span>{checkInTypeLabel(row.type)}</span>
                </div>
                <span className="reception-live-item-badge">Liberado</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
