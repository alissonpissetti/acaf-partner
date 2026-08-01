import { useEffect, useState } from 'react';
import { getHealth } from '../api/client.js';
import { API_URL } from '../config.js';

export function DashboardPage() {
  const [health, setHealth] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    getHealth()
      .then((data) => {
        if (active) setHealth(data);
      })
      .catch((err) => {
        if (active) setError(err.message);
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="page-stack">
      <section className="card">
        <h2>Bem-vindo ao portal da academia</h2>
        <p className="muted">
          Gerencie a presença da sua unidade no app ACAF Connect: perfil público,
          diárias, check-ins de alunos e planos disponíveis na rede.
        </p>
      </section>

      <div className="stat-grid">
        <article className="card stat-card">
          <span className="stat-label">Unidade</span>
          <strong className="stat-value stat-value-sm">Em configuração</strong>
          <span className="badge badge-muted">aguardando vínculo</span>
        </article>

        <article className="card stat-card">
          <span className="stat-label">API</span>
          <strong className="stat-value">{health?.service ?? 'acaf-api'}</strong>
          <span className={`badge ${health ? 'badge-success' : error ? 'badge-error' : 'badge-muted'}`}>
            {health ? health.status : error ? 'offline' : 'verificando...'}
          </span>
        </article>

        <article className="card stat-card">
          <span className="stat-label">Endpoint</span>
          <strong className="stat-value stat-value-sm">{API_URL || '(proxy local)'}</strong>
        </article>
      </div>

      <section className="card">
        <h3>Próximos passos</h3>
        <ul className="checklist">
          <li>Completar perfil da unidade (nome, modalidades, fotos)</li>
          <li>Configurar diárias e preços</li>
          <li>Ativar planos Connect aceitos na academia</li>
          <li>Validar check-ins de membros e visitantes</li>
        </ul>
      </section>

      {error ? (
        <section className="card card-error">
          <h3>API indisponível</h3>
          <p className="muted">
            Não foi possível contactar a API. Inicie <code>acaf-api</code> com{' '}
            <code>npm run start:dev</code>.
          </p>
          <p className="error-text">{error}</p>
        </section>
      ) : null}
    </div>
  );
}
