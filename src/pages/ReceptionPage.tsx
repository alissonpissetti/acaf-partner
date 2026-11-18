import { useCallback, useEffect, useMemo, useState } from 'react';
import { UnitScopeBanner } from '../components/UnitSwitcher';
import {
  approvePendingCheckIn,
  dismissPendingCheckIn,
  fetchPendingCheckIns,
  type PendingCheckInRequest,
} from '../api/client';
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
  const { state, unit, refresh, isAllUnits, applyPortal } = usePortal();
  const [lastRefreshAt, setLastRefreshAt] = useState<Date | null>(null);
  const [pendingQueue, setPendingQueue] = useState<PendingCheckInRequest[]>([]);
  const [pendingActionId, setPendingActionId] = useState<string | null>(null);

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

  const loadPending = useCallback(async () => {
    if (isAllUnits) {
      setPendingQueue([]);
      return;
    }
    try {
      const data = await fetchPendingCheckIns(unit.id, 'single');
      setPendingQueue(data.pending ?? []);
      if (data.portal) applyPortal(data.portal);
    } catch {
      /* ignore */
    }
  }, [applyPortal, isAllUnits, unit.id]);

  const onApprovePending = async (pendingId: string) => {
    setPendingActionId(pendingId);
    try {
      const result = await approvePendingCheckIn(pendingId, unit.id, 'single');
      if (result.ok) {
        applyPortal(result.portal);
        await loadPending();
        await refresh();
      }
    } finally {
      setPendingActionId(null);
    }
  };

  const onDismissPending = async (pendingId: string) => {
    setPendingActionId(pendingId);
    try {
      const portal = await dismissPendingCheckIn(pendingId, unit.id, 'single');
      applyPortal(portal);
      await loadPending();
    } finally {
      setPendingActionId(null);
    }
  };

  useEffect(() => {
    let active = true;
    const tick = async () => {
      try {
        await Promise.all([refresh(), loadPending()]);
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
  }, [loadPending, refresh]);

  return (
    <div className="page-stack reception-page">
      <UnitScopeBanner />
      <header className="reception-hero">
        <h1 className="page-title">Check-in em tempo real</h1>
        <p className="page-subtitle">
          O app envia o pedido de entrada; confirme na recepção para liberar o aluno · {unit.unitName}
          {isAllUnits ? ' · escolha a unidade na barra lateral' : ''}
        </p>
      </header>

      {!isAllUnits && pendingQueue.length > 0 ? (
        <div className="card reception-live-card reception-pending-card">
          <div className="reception-live-head">
            <div>
              <h2 className="section-title">Aguardando confirmação</h2>
              <p className="reception-live-hint">
                Confirme após validar o aluno na unidade. Só depois da confirmação vale a regra de 1
                entrada por dia.
              </p>
            </div>
          </div>
          <ul className="reception-live-feed">
            {pendingQueue.map((row) => (
              <li key={row.id} className="reception-live-item reception-pending-item">
                <div className="reception-live-item-time">{formatTime(row.requestedAt)}</div>
                <div className="reception-live-item-main">
                  <strong>{row.holderName}</strong>
                  <span>{checkInTypeLabel(row.type)}</span>
                </div>
                <div className="reception-pending-actions">
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    disabled={pendingActionId === row.id}
                    onClick={() => void onApprovePending(row.id)}
                  >
                    Confirmar entrada
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    disabled={pendingActionId === row.id}
                    onClick={() => void onDismissPending(row.id)}
                  >
                    Recusar
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="card reception-live-card">
        <div className="reception-live-head">
          <div>
            <h2 className="section-title">Entradas de hoje</h2>
            <p className="reception-live-hint">
              {todayLabel} · entradas já confirmadas pela recepção.
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
