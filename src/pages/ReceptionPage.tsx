import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  approvePendingCheckIn,
  dismissPendingCheckIn,
  fetchDemoCodes,
  fetchPendingCheckIns,
  validateCheckIn,
  type PendingCheckInRequest,
} from '../api/client';
import { UnitScopeBanner } from '../components/UnitSwitcher';
import { checkInTypeLabel } from '../data/helpers';
import {
  defaultReportDay,
  filterCheckInsByDay,
  parseDateInput,
  recentCheckInsForUnit,
  toDateInputValue,
} from '../data/receptionReport';
import { usePortal } from '../portalContext';
import './ReceptionPage.css';

export function ReceptionPage() {
  const { state, unit, applyPortal, isAllUnits, refresh, updateUnit, saveUnit } = usePortal();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; message: string } | null>(null);
  const [demo, setDemo] = useState<{ memberToday: string; dailyDemo: string } | null>(null);
  const [pending, setPending] = useState<PendingCheckInRequest[]>([]);
  const [pendingBusyId, setPendingBusyId] = useState<string | null>(null);
  const [reportDay, setReportDay] = useState(defaultReportDay);
  const [autoBusy, setAutoBusy] = useState(false);

  const reportDate = parseDateInput(reportDay) ?? new Date();
  const reportRows = useMemo(
    () => filterCheckInsByDay(state.checkInLog, unit.id, reportDate),
    [state.checkInLog, unit.id, reportDay, reportDate],
  );
  const recentRows = useMemo(() => recentCheckInsForUnit(state.checkInLog, unit.id, 18), [state.checkInLog, unit.id]);

  const loadPending = useCallback(async () => {
    try {
      const data = await fetchPendingCheckIns(unit.id, state.unitScope);
      setPending(data.pending);
      if (data.portal) applyPortal(data.portal);
    } catch {
      setPending([]);
    }
  }, [unit.id, state.unitScope, applyPortal]);

  useEffect(() => {
    void fetchDemoCodes(unit.id).then(setDemo).catch(() => setDemo(null));
  }, [unit.id]);

  useEffect(() => {
    void loadPending();
    const timer = window.setInterval(() => void loadPending(), 12_000);
    return () => window.clearInterval(timer);
  }, [loadPending]);

  const onValidate = async () => {
    setBusy(true);
    setFeedback(null);
    try {
      const result = await validateCheckIn(unit.id, code, state.unitScope);
      if (result.ok) {
        if (result.portal.unitScope) {
          applyPortal(result.portal);
        } else {
          await refresh();
        }
        setFeedback({ ok: true, message: result.message });
        setCode('');
        void loadPending();
      } else {
        setFeedback({ ok: false, message: result.message });
      }
    } catch (e) {
      setFeedback({ ok: false, message: e instanceof Error ? e.message : 'Não foi possível validar o código.' });
    } finally {
      setBusy(false);
    }
  };

  const onApprovePending = async (id: string) => {
    setPendingBusyId(id);
    setFeedback(null);
    try {
      const result = await approvePendingCheckIn(id, unit.id, state.unitScope);
      if (result.ok) {
        applyPortal(result.portal);
        setFeedback({ ok: true, message: result.message });
        await loadPending();
      } else {
        setFeedback({ ok: false, message: result.message });
        await loadPending();
      }
    } finally {
      setPendingBusyId(null);
    }
  };

  const onDismissPending = async (id: string) => {
    setPendingBusyId(id);
    try {
      const portal = await dismissPendingCheckIn(id, unit.id, state.unitScope);
      applyPortal(portal);
      await loadPending();
    } finally {
      setPendingBusyId(null);
    }
  };

  const onToggleAutoApprove = async (checked: boolean) => {
    setAutoBusy(true);
    updateUnit({ autoApproveCheckIn: checked });
    try {
      await saveUnit();
      if (checked) await loadPending();
    } finally {
      setAutoBusy(false);
    }
  };

  const autoApprove = unit.autoApproveCheckIn ?? false;

  return (
    <div className="page-stack reception-page">
      <UnitScopeBanner />
      <header>
        <h1 className="page-title">Check-in</h1>
        <p className="page-subtitle">
          Recepção · {unit.unitName}
          {isAllUnits ? ' · escolha a unidade na barra lateral' : ''}
        </p>
      </header>

      {demo && (
        <div className="card-muted reception-codes">
          <strong>Exemplos para teste · {unit.unitName}</strong>
          <div>Plano Connect (hoje): {demo.memberToday}</div>
          <div>Diária de exemplo: {demo.dailyDemo}</div>
        </div>
      )}

      <div className="card form-grid reception-manual">
        <h2 className="section-title">Código manual</h2>
        <div className="field">
          <label>Código</label>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="Código do aluno no celular"
            onKeyDown={(e) => e.key === 'Enter' && void onValidate()}
          />
        </div>
        <button type="button" className="btn btn-primary" disabled={busy || !code.trim()} onClick={() => void onValidate()}>
          {busy ? 'Validando…' : 'Liberar entrada'}
        </button>
        {feedback && (
          <div className={`reception-result ${feedback.ok ? 'ok' : 'err'}`}>{feedback.message}</div>
        )}
      </div>

      <div className="card reception-realtime">
        <div className="reception-realtime-head">
          <div>
            <h2 className="section-title">Check-in em tempo real</h2>
            <p className="page-subtitle reception-realtime-sub">
              Solicitações enviadas pelo ACAF Connect aguardando liberação na recepção.
            </p>
          </div>
          <label className="reception-auto-toggle">
            <input
              type="checkbox"
              checked={autoApprove}
              disabled={autoBusy}
              onChange={(e) => void onToggleAutoApprove(e.target.checked)}
            />
            <span>Aprovar check-ins automaticamente</span>
          </label>
        </div>
        <div className="table-wrap reception-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Solicitado</th>
                <th>Aluno / visitante</th>
                <th>Tipo</th>
                <th aria-label="Ações" />
              </tr>
            </thead>
            <tbody>
              {pending.length === 0 && (
                <tr>
                  <td colSpan={4} className="reception-empty">
                    {autoApprove ? 'Nenhuma pendência · novas entradas serão liberadas sozinhas.' : 'Nenhuma solicitação pendente no momento.'}
                  </td>
                </tr>
              )}
              {pending.map((row) => (
                <tr key={row.id} className="reception-pending-row">
                  <td>{new Date(row.requestedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</td>
                  <td>{row.holderName}</td>
                  <td>{checkInTypeLabel(row.type)}</td>
                  <td className="reception-pending-actions">
                    {!autoApprove && (
                      <>
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          disabled={pendingBusyId != null}
                          onClick={() => void onApprovePending(row.id)}
                        >
                          {pendingBusyId === row.id ? '…' : 'Liberar'}
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          disabled={pendingBusyId != null}
                          onClick={() => void onDismissPending(row.id)}
                        >
                          Recusar
                        </button>
                      </>
                    )}
                    {autoApprove && <span className="reception-auto-label">Automático</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <h2 className="section-title">Entradas recentes nesta unidade</h2>
        <p className="page-subtitle reception-section-hint">Últimas validações na recepção (independente do relatório abaixo).</p>
        <div className="table-wrap reception-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Horário</th>
                <th>Aluno / visitante</th>
                <th>Tipo</th>
              </tr>
            </thead>
            <tbody>
              {recentRows.length === 0 && (
                <tr>
                  <td colSpan={3} className="reception-empty">
                    Nenhum check-in registrado ainda.
                  </td>
                </tr>
              )}
              {recentRows.map((row) => (
                <tr key={row.id}>
                  <td>{new Date(row.validatedAt).toLocaleString('pt-BR')}</td>
                  <td>{row.holderName}</td>
                  <td>{checkInTypeLabel(row.type)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card reception-report">
        <div className="reception-report-head">
          <div>
            <h2 className="section-title">Relatório do período</h2>
            <p className="page-subtitle reception-section-hint">
              Quem já fez check-in na unidade no dia selecionado · {reportRows.length} entrada
              {reportRows.length === 1 ? '' : 's'}
            </p>
          </div>
          <div className="field reception-date-field">
            <label htmlFor="reception-report-day">Dia</label>
            <input
              id="reception-report-day"
              type="date"
              value={reportDay}
              max={toDateInputValue(new Date())}
              onChange={(e) => setReportDay(e.target.value)}
            />
          </div>
        </div>
        <div className="table-wrap reception-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Horário</th>
                <th>Aluno / visitante</th>
                <th>Tipo</th>
              </tr>
            </thead>
            <tbody>
              {reportRows.length === 0 && (
                <tr>
                  <td colSpan={3} className="reception-empty">
                    Nenhum check-in neste dia para {unit.unitName}.
                  </td>
                </tr>
              )}
              {reportRows.map((row) => (
                <tr key={row.id}>
                  <td>{new Date(row.validatedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</td>
                  <td>{row.holderName}</td>
                  <td>{checkInTypeLabel(row.type)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
