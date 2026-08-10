import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { AcafConnectLogo } from '../components/AcafConnectLogo';
import { getPartnerToken } from '../api/auth';
import { apiHealth } from '../api/client';
import { usePortal } from '../portalContext';
import './LoginPage.css';

export function LoginPage() {
  const { state, loginWithPassword, loading } = usePortal();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [apiOnline, setApiOnline] = useState<boolean | null>(null);

  useEffect(() => {
    void apiHealth().then(setApiOnline);
  }, []);

  if (loading && getPartnerToken()) {
    return (
      <div className="login-shell login-shell-loading">
        <p className="login-loading-text">Restaurando sessão…</p>
      </div>
    );
  }

  if (state.loggedIn) {
    return <Navigate to="/" replace />;
  }

  const onSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setFormError(null);

    if (apiOnline === false) {
      setFormError('API indisponível. Inicie o acaf-api (porta 8787) ou verifique VITE_API_URL.');
      return;
    }

    setBusy(true);
    try {
      await loginWithPassword(username, password);
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Não foi possível entrar.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login-shell">
      <div className="login-hero" aria-hidden="true">
        <video
          className="login-hero-video"
          autoPlay
          muted
          loop
          playsInline
        >
          <source src="/media/login-hero.mp4" type="video/mp4" />
        </video>
        <div className="login-hero-scrim" />
        <div className="login-hero-copy">
          <p className="login-hero-kicker">Rede de academias</p>
          <h2 className="login-hero-title">Gestão Connect em um só lugar</h2>
          <p className="login-hero-text">
            Unidades, check-in, comercial e financeiro integrados ao app ACAF Connect.
          </p>
        </div>
      </div>

      <div className="login-panel">
        <div className="login-panel-inner">
          <AcafConnectLogo height={48} className="acaf-connect-logo--login" />
          <h1 className="login-panel-title">Portal do parceiro</h1>
          <p className="login-panel-lead">
            Entre com o e-mail ou CPF vinculado à sua unidade no painel admin ACAF.
          </p>

          {apiOnline === false ? (
            <p className="login-form-error" role="alert">
              Não foi possível contactar a API. Em desenvolvimento, rode{' '}
              <code>npm run start:dev</code> na pasta <code>acaf-api</code>.
            </p>
          ) : null}

          <form className="login-form" onSubmit={(ev) => void onSubmit(ev)}>
            <div className="field">
              <label htmlFor="login-user">E-mail ou CPF</label>
              <input
                id="login-user"
                type="text"
                autoComplete="username"
                value={username}
                onChange={(ev) => setUsername(ev.target.value)}
                disabled={busy || loading}
              />
            </div>
            <div className="field">
              <label htmlFor="login-pass">Senha</label>
              <input
                id="login-pass"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(ev) => setPassword(ev.target.value)}
                disabled={busy || loading}
              />
            </div>

            {formError && <p className="login-form-error">{formError}</p>}

            <button
              type="submit"
              className="btn btn-primary login-submit"
              disabled={busy || loading || apiOnline === false}
            >
              {busy || loading ? 'Entrando…' : 'Entrar'}
            </button>
          </form>

          <p className="login-panel-foot">
            O acesso é concedido no painel admin: edite a unidade, aba{' '}
            <strong>Acesso parceiro</strong>, e vincule seu usuário. Usuários do console admin
            entram com o mesmo e-mail e senha cadastrados em Usuários.
          </p>
        </div>
      </div>
    </div>
  );
}
