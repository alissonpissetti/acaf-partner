import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { isOpenStatus } from './supportUtils';
import { SupportWidget } from './SupportWidget';
import { fetchSupportTickets } from '../api/support';
import './support.css';

export type SupportOpenOptions = {
  ticketId?: string;
  view?: 'list' | 'create' | 'detail';
};

type SupportContextValue = {
  openSupport: (options?: SupportOpenOptions) => void;
  closeSupport: () => void;
};

const SupportContext = createContext<SupportContextValue | null>(null);

type SupportProviderProps = {
  children: ReactNode;
  apiPrefix: string;
  getExtraContext?: () => Record<string, unknown>;
};

export function SupportProvider({ children, apiPrefix, getExtraContext }: SupportProviderProps) {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [initialTicketId, setInitialTicketId] = useState<string | undefined>();
  const [initialView, setInitialView] = useState<'list' | 'create' | 'detail'>('list');
  const [openTicketCount, setOpenTicketCount] = useState(0);

  const openSupport = useCallback((options?: SupportOpenOptions) => {
    setInitialTicketId(options?.ticketId);
    setInitialView(options?.view ?? (options?.ticketId ? 'detail' : 'list'));
    setOpen(true);
  }, []);

  const closeSupport = useCallback(() => {
    setOpen(false);
    setInitialTicketId(undefined);
    setInitialView('list');
  }, []);

  const toggleSupport = useCallback(() => {
    if (open) {
      closeSupport();
      return;
    }
    openSupport();
  }, [open, closeSupport, openSupport]);

  const contextValue = useMemo(
    () => ({ openSupport, closeSupport }),
    [openSupport, closeSupport],
  );

  const context = useMemo(
    () => ({
      contextUrl: `${location.pathname}${location.search}`,
      contextLabel: document.title,
      ...(getExtraContext?.() ?? {}),
    }),
    [location.pathname, location.search, getExtraContext],
  );

  useEffect(() => {
    let cancelled = false;
    fetchSupportTickets(apiPrefix)
      .then((data) => {
        if (cancelled) return;
        const count = (data.items ?? []).filter((item) => isOpenStatus(item.status)).length;
        setOpenTicketCount(count);
      })
      .catch(() => {
        if (!cancelled) setOpenTicketCount(0);
      });
    return () => {
      cancelled = true;
    };
  }, [apiPrefix, open, location.pathname]);

  return (
    <SupportContext.Provider value={contextValue}>
      {children}
      <SupportWidget
        open={open}
        onClose={closeSupport}
        apiPrefix={apiPrefix}
        context={context}
        initialTicketId={initialTicketId}
        initialView={initialView}
      />
      <button
        type="button"
        className={`support-launcher-fab${open ? ' is-open' : ''}`}
        aria-label={open ? 'Fechar atendimento' : 'Abrir atendimento'}
        aria-expanded={open}
        onClick={toggleSupport}
      >
        <span className="support-launcher-icon" aria-hidden="true">
          {open ? '×' : '💬'}
        </span>
        <span className="support-launcher-label">Atendimento</span>
        {!open && openTicketCount > 0 ? (
          <span className="support-launcher-badge" aria-label={`${openTicketCount} chamados em aberto`}>
            {openTicketCount > 9 ? '9+' : openTicketCount}
          </span>
        ) : null}
      </button>
    </SupportContext.Provider>
  );
}

export function useSupport() {
  const ctx = useContext(SupportContext);
  if (!ctx) throw new Error('useSupport deve ser usado dentro de SupportProvider.');
  return ctx;
}
