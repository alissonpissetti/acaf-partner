import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  addSupportTicketMessage,
  createSupportTicket,
  fetchSupportCatalog,
  fetchSupportTicket,
  fetchSupportTickets,
  type SupportTicketDetail,
  type SupportTicketSummary,
} from '../api/support';
import { useFlash } from '../flashContext';
import {
  formatRelativeTime,
  isOpenStatus,
  matchesStatusFilter,
  statusBadgeClass,
  type StatusFilter,
} from './supportUtils';

type WidgetView = 'list' | 'detail' | 'create';

type SupportWidgetProps = {
  open: boolean;
  onClose: () => void;
  apiPrefix: string;
  context: Record<string, unknown>;
  initialTicketId?: string;
  initialView?: WidgetView;
};

export function SupportWidget({
  open,
  onClose,
  apiPrefix,
  context,
  initialTicketId,
  initialView = 'list',
}: SupportWidgetProps) {
  const flash = useFlash();
  const [view, setView] = useState<WidgetView>(initialView);
  const [selectedId, setSelectedId] = useState(initialTicketId ?? '');
  const [items, setItems] = useState<SupportTicketSummary[]>([]);
  const [detail, setDetail] = useState<SupportTicketDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('open');
  const [reply, setReply] = useState('');
  const [saving, setSaving] = useState(false);

  const [catalog, setCatalog] = useState<{
    categories: Array<{ value: string; label: string }>;
    priorities: Array<{ value: string; label: string }>;
  }>({ categories: [], priorities: [] });
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState('technical');
  const [priority, setPriority] = useState('normal');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadList = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await fetchSupportTickets(apiPrefix);
      setItems(data.items ?? []);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Erro ao carregar chamados.');
    } finally {
      setLoading(false);
    }
  }, [apiPrefix]);

  const loadDetail = useCallback(
    async (id: string) => {
      if (!id) {
        setDetail(null);
        setDetailError(null);
        return;
      }
      setDetailLoading(true);
      setDetailError(null);
      try {
        setDetail(await fetchSupportTicket(apiPrefix, id));
      } catch (err) {
        setDetail(null);
        setDetailError(err instanceof Error ? err.message : 'Erro ao carregar chamado.');
      } finally {
        setDetailLoading(false);
      }
    },
    [apiPrefix],
  );

  useEffect(() => {
    if (!open) return;
    setView(initialView);
    setSelectedId(initialTicketId ?? '');
    setReply('');
    loadList();
    fetchSupportCatalog(apiPrefix)
      .then((data) => setCatalog(data))
      .catch(() => setCatalog({ categories: [], priorities: [] }));
  }, [open, initialTicketId, initialView, apiPrefix, loadList]);

  useEffect(() => {
    if (!open || view !== 'detail') return;
    loadDetail(selectedId);
    setReply('');
  }, [open, view, selectedId, loadDetail]);

  const rows = useMemo(
    () => items.filter((item) => matchesStatusFilter(item.status, statusFilter)),
    [items, statusFilter],
  );

  const openCount = useMemo(
    () => items.filter((item) => isOpenStatus(item.status)).length,
    [items],
  );

  const openTicket = (id: string) => {
    setSelectedId(id);
    setView('detail');
  };

  const backToList = () => {
    setView('list');
    setSelectedId('');
    setDetail(null);
    setReply('');
  };

  const openCreate = () => {
    setSubject('');
    setCategory('technical');
    setPriority('normal');
    setDescription('');
    setView('create');
  };

  const onReply = async () => {
    if (!detail || !reply.trim()) return;
    setSaving(true);
    try {
      const updated = await addSupportTicketMessage(apiPrefix, detail.id, reply.trim());
      setDetail(updated);
      setReply('');
      await loadList();
    } catch (err) {
      flash.error(err instanceof Error ? err.message : 'Erro ao enviar mensagem.');
    } finally {
      setSaving(false);
    }
  };

  const onCreate = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setSubmitting(true);
    try {
      const created = await createSupportTicket(apiPrefix, {
        subject: subject.trim(),
        category,
        priority,
        description: description.trim(),
        contextUrl: context.contextUrl ?? null,
        contextLabel: context.contextLabel ?? null,
        contextMetadata: context.contextMetadata ?? null,
        companyId: context.companyId ?? null,
        unitId: context.unitId ?? null,
      });
      flash.success(`Chamado ${created.code} aberto.`);
      await loadList();
      openTicket(created.id);
    } catch (err) {
      flash.error(err instanceof Error ? err.message : 'Não foi possível abrir o chamado.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  const headerTitle =
    view === 'detail'
      ? detail?.code ?? 'Chamado'
      : view === 'create'
        ? 'Novo chamado'
        : 'Atendimento';

  return (
    <div className="support-widget" role="dialog" aria-modal="true" aria-label="Atendimento">
      <header className="support-widget-head">
        {view !== 'list' ? (
          <button
            type="button"
            className="support-widget-back"
            aria-label="Voltar"
            onClick={backToList}
          >
            ←
          </button>
        ) : null}
        <div className="support-widget-head-text">
          <h2>{headerTitle}</h2>
          {view === 'list' ? (
            <p>Fale com nossa equipe e acompanhe seus chamados.</p>
          ) : view === 'create' ? (
            <p>Descreva sua solicitação para abrir um chamado.</p>
          ) : detail ? (
            <p>{detail.subject}</p>
          ) : null}
        </div>
        <button type="button" className="support-widget-close" aria-label="Fechar" onClick={onClose}>
          ×
        </button>
      </header>

      {view === 'list' ? (
        <>
          <div className="support-widget-toolbar">
            <div className="support-widget-filters">
              <button
                type="button"
                className={statusFilter === 'open' ? 'chip chip-active' : 'chip'}
                onClick={() => setStatusFilter('open')}
              >
                Em aberto
              </button>
              <button
                type="button"
                className={statusFilter === 'all' ? 'chip chip-active' : 'chip'}
                onClick={() => setStatusFilter('all')}
              >
                Todos
              </button>
              <button
                type="button"
                className={statusFilter === 'closed' ? 'chip chip-active' : 'chip'}
                onClick={() => setStatusFilter('closed')}
              >
                Encerrados
              </button>
            </div>
            <button type="button" className="btn btn-primary btn-sm support-widget-new-btn" onClick={openCreate}>
              Novo
            </button>
          </div>

          <div className="support-widget-body">
            {loadError ? <p className="support-widget-error">{loadError}</p> : null}
            {loading ? <p className="support-widget-empty">Carregando chamados…</p> : null}
            {!loading && rows.length === 0 ? (
              <div className="support-widget-empty-state">
                <p>
                  {items.length === 0
                    ? 'Nenhum chamado ainda. Abra o primeiro para falar com a equipe.'
                    : 'Nenhum chamado neste filtro.'}
                </p>
                <button type="button" className="btn btn-primary btn-sm" onClick={openCreate}>
                  Abrir chamado
                </button>
              </div>
            ) : null}
            {!loading && rows.length > 0 ? (
              <ul className="support-widget-list">
                {rows.map((item) => (
                  <li key={item.id}>
                    <button type="button" className="support-widget-item" onClick={() => openTicket(item.id)}>
                      <div className="support-widget-item-top">
                        <span className="support-widget-item-code">{item.code}</span>
                        <span className={statusBadgeClass(item.status)}>{item.statusLabel}</span>
                      </div>
                      <div className="support-widget-item-subject">{item.subject}</div>
                      <div className="support-widget-item-meta">
                        <span>{item.categoryLabel}</span>
                        <span>{formatRelativeTime(item.updatedAt)}</span>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          {openCount > 0 ? (
            <footer className="support-widget-foot">
              <span>{openCount} chamado{openCount === 1 ? '' : 's'} em aberto</span>
            </footer>
          ) : null}
        </>
      ) : null}

      {view === 'create' ? (
        <form className="support-widget-body support-widget-form" onSubmit={(ev) => void onCreate(ev)}>
          {context.contextLabel ? (
            <div className="support-context-chip">
              <span className="support-context-label">Contexto</span>
              <strong>{String(context.contextLabel)}</strong>
              {context.contextUrl ? <small>{String(context.contextUrl)}</small> : null}
            </div>
          ) : null}
          <label className="field">
            <span>Assunto</span>
            <input value={subject} onChange={(ev) => setSubject(ev.target.value)} required maxLength={200} />
          </label>
          <div className="support-form-grid">
            <label className="field">
              <span>Categoria</span>
              <select value={category} onChange={(ev) => setCategory(ev.target.value)}>
                {catalog.categories.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Prioridade</span>
              <select value={priority} onChange={(ev) => setPriority(ev.target.value)}>
                {catalog.priorities.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="field">
            <span>Descrição</span>
            <textarea rows={5} value={description} onChange={(ev) => setDescription(ev.target.value)} required />
          </label>
          <footer className="support-widget-form-foot">
            <button type="button" className="btn btn-secondary btn-sm" onClick={backToList} disabled={submitting}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary btn-sm" disabled={submitting}>
              {submitting ? 'Enviando…' : 'Abrir chamado'}
            </button>
          </footer>
        </form>
      ) : null}

      {view === 'detail' ? (
        <>
          <div className="support-widget-chat">
            {detailLoading ? <p className="support-widget-empty">Carregando conversa…</p> : null}
            {detailError ? <p className="support-widget-error">{detailError}</p> : null}
            {detail ? (
              <>
                <div className="support-widget-chat-meta">
                  <span className={statusBadgeClass(detail.status)}>{detail.statusLabel}</span>
                  <span className="chip">{detail.categoryLabel}</span>
                </div>
                <article className="support-message support-message--seed">
                  <div className="support-message-head">
                    <strong>Descrição inicial</strong>
                  </div>
                  <div className="support-message-body">{detail.description}</div>
                </article>
                {(detail.messages ?? []).map((message) => (
                  <article key={message.id} className="support-message">
                    <div className="support-message-head">
                      <strong>{message.authorName}</strong>
                      <span>{formatRelativeTime(message.createdAt)}</span>
                    </div>
                    <div className="support-message-body">{message.body}</div>
                  </article>
                ))}
              </>
            ) : null}
          </div>

          {detail && !['resolved', 'closed'].includes(detail.status) ? (
            <footer className="support-widget-composer">
              <textarea
                rows={2}
                value={reply}
                onChange={(ev) => setReply(ev.target.value)}
                placeholder="Escreva sua mensagem…"
                onKeyDown={(ev) => {
                  if (ev.key === 'Enter' && !ev.shiftKey) {
                    ev.preventDefault();
                    void onReply();
                  }
                }}
              />
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => void onReply()}
                disabled={saving || !reply.trim()}
                aria-label="Enviar mensagem"
              >
                {saving ? '…' : 'Enviar'}
              </button>
            </footer>
          ) : detail ? (
            <footer className="support-widget-foot">
              <span>Chamado encerrado.</span>
              <button type="button" className="btn-link" onClick={openCreate}>
                Abrir novo chamado
              </button>
            </footer>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
