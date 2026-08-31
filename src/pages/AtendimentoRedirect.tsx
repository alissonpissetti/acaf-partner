import { useLayoutEffect } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { useSupport } from '../components/SupportProvider';

/** Deep link /atendimento?id=… abre o widget e redireciona para o dashboard. */
export function AtendimentoRedirect() {
  const [searchParams] = useSearchParams();
  const { openSupport } = useSupport();
  const ticketId = searchParams.get('id') ?? undefined;

  useLayoutEffect(() => {
    openSupport(ticketId ? { ticketId, view: 'detail' } : undefined);
  }, [openSupport, ticketId]);

  return <Navigate to="/" replace />;
}
