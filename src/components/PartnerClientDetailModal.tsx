import { useEffect, useState } from 'react';
import { fetchPartnerClientDetail } from '../api/client';
import { checkInTypeLabel } from '../data/helpers';
import {
  relationshipLabel,
  type PartnerClientDetail,
  type PartnerClientSummary,
} from '../data/partnerClients';
import type { UnitScope } from '../types';
import { Modal } from './Modal';
import './PartnerClientDetailModal.css';

type Props = {
  open: boolean;
  client: PartnerClientSummary | null;
  unitScope: UnitScope;
  onClose: () => void;
};

function formatDateTime(value?: string): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDate(value?: string): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString('pt-BR');
}

export function PartnerClientDetailModal({ open, client, unitScope, onClose }: Props) {
  const [detail, setDetail] = useState<PartnerClientDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !client) {
      setDetail(null);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchPartnerClientDetail(client.holderKey, unitScope)
      .then((data) => {
        if (!cancelled) setDetail(data);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Não foi possível carregar o histórico.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, client, unitScope]);

  const title = client?.name ?? 'Cliente';

  const dailyCheckIns = detail?.checkIns.filter((c) => c.type === 'daily_pass') ?? [];
  const connectCheckIns = detail?.checkIns.filter((c) => c.type === 'connect_member') ?? [];

  return (
    <Modal open={open} title={title} onClose={onClose}>
      {loading ? <p className="client-detail-muted">Carregando histórico…</p> : null}
      {error ? <p className="client-detail-error">{error}</p> : null}

      {detail && !loading ? (
        <div className="client-detail-stack">
          <section className="client-detail-section">
            <h3 className="client-detail-heading">Resumo</h3>
            <dl className="client-detail-dl">
              <div>
                <dt>E-mail</dt>
                <dd>{detail.email ?? '—'}</dd>
              </div>
              <div>
                <dt>CPF</dt>
                <dd>{detail.cpf ?? '—'}</dd>
              </div>
              <div>
                <dt>Empresa</dt>
                <dd>{detail.companyName ?? '—'}</dd>
              </div>
              <div>
                <dt>Vínculo</dt>
                <dd>{relationshipLabel(detail.relationship)}</dd>
              </div>
              <div>
                <dt>Check-ins (total)</dt>
                <dd>{detail.totalCheckIns}</dd>
              </div>
              <div>
                <dt>Última visita</dt>
                <dd>{formatDateTime(detail.lastVisit)}</dd>
              </div>
            </dl>
          </section>

          <section className="client-detail-section">
            <h3 className="client-detail-heading">Academia principal</h3>
            {detail.primaryHistory.currentPrimaryUnitName ? (
              <dl className="client-detail-dl">
                <div>
                  <dt>Unidade</dt>
                  <dd>{detail.primaryHistory.currentPrimaryUnitName}</dd>
                </div>
                <div>
                  <dt>Eleita em</dt>
                  <dd>{formatDate(detail.primaryHistory.primaryChosenAt)}</dd>
                </div>
                <div>
                  <dt>Plano Connect</dt>
                  <dd>{detail.primaryHistory.connectPlanName ?? '—'}</dd>
                </div>
                <div>
                  <dt>Assinatura desde</dt>
                  <dd>{formatDate(detail.primaryHistory.connectSince)}</dd>
                </div>
                {detail.primaryHistory.primaryCheckInsSinceFirst != null ? (
                  <div>
                    <dt>Check-ins na principal (ciclo)</dt>
                    <dd>{detail.primaryHistory.primaryCheckInsSinceFirst}</dd>
                  </div>
                ) : null}
              </dl>
            ) : (
              <p className="client-detail-muted">
                Este cliente ainda não elegeu uma academia principal nas suas unidades.
              </p>
            )}

            {detail.primaryHistory.changes.length > 0 ? (
              <div className="client-detail-timeline">
                <h4 className="client-detail-subheading">Trocas de academia principal</h4>
                <ul>
                  {detail.primaryHistory.changes.map((change) => (
                    <li key={change.id}>
                      <span className="client-detail-timeline-date">{formatDate(change.changedAt)}</span>
                      <span>
                        {change.fromUnitName
                          ? `${change.fromUnitName} → ${change.toUnitName}`
                          : `Eleição: ${change.toUnitName}`}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </section>

          <section className="client-detail-section">
            <h3 className="client-detail-heading">Diárias ({dailyCheckIns.length})</h3>
            {dailyCheckIns.length === 0 ? (
              <p className="client-detail-muted">Nenhuma diária registrada neste escopo.</p>
            ) : (
              <ul className="client-detail-checkins">
                {dailyCheckIns.slice(0, 40).map((entry) => (
                  <li key={entry.id}>
                    <span>{formatDateTime(entry.validatedAt)}</span>
                    <span>{entry.unitName}</span>
                    <span className="client-detail-tag">{checkInTypeLabel(entry.type)}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="client-detail-section">
            <h3 className="client-detail-heading">
              Check-ins Connect ({connectCheckIns.length})
            </h3>
            {connectCheckIns.length === 0 ? (
              <p className="client-detail-muted">Nenhum check-in com plano mensal neste escopo.</p>
            ) : (
              <ul className="client-detail-checkins">
                {connectCheckIns.slice(0, 40).map((entry) => (
                  <li key={entry.id}>
                    <span>{formatDateTime(entry.validatedAt)}</span>
                    <span>{entry.unitName}</span>
                    <span className="client-detail-tag">{checkInTypeLabel(entry.type)}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      ) : null}
    </Modal>
  );
}
