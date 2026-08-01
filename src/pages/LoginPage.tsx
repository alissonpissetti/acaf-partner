import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { AcafConnectLogo } from '../components/AcafConnectLogo';
import { LOGIN_DEMO_HINT } from '../data/mockAuth';
import { usePortal } from '../portalContext';
import './LoginPage.css';

type LoginMode = 'password' | 'phone';

export function LoginPage() {
  const { state, loginWithPassword, loginWithPhoneToken, loading } = usePortal();
  const [mode, setMode] = useState<LoginMode>('password');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [token, setToken] = useState('');
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  if (state.loggedIn) {
    return <Navigate to="/" replace />;
  }

  const onSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setFormError(null);
    setBusy(true);
    try {
      if (mode === 'password') {
        await loginWithPassword(username, password);
      } else {
        await loginWithPhoneToken(phone, token);
      }
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Não foi possível entrar.');
    } finally {
      setBusy(false);
    }
  };

  const fillDemoPassword = () => {
    setUsername(LOGIN_DEMO_HINT.user);
    setPassword(LOGIN_DEMO_HINT.pass);
    setFormError(null);
  };

  const fillDemoPhone = () => {
    setPhone('(41) 99999-0000');
    setToken(LOGIN_DEMO_HINT.otp);
    setFormError(null);
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
          poster="/branding/acaf_connect_lockup.png"
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
          <p className="login-panel-lead">Acesse com sua conta de gestor ou token no celular.</p>

          <div className="login-mode-tabs" role="tablist" aria-label="Forma de login">
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'password'}
              className={mode === 'password' ? 'login-mode-tab active' : 'login-mode-tab'}
              onClick={() => {
                setMode('password');
                setFormError(null);
              }}
            >
              Usuário e senha
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'phone'}
              className={mode === 'phone' ? 'login-mode-tab active' : 'login-mode-tab'}
              onClick={() => {
                setMode('phone');
                setFormError(null);
              }}
            >
              Telefone e token
            </button>
          </div>

          <form className="login-form" onSubmit={(ev) => void onSubmit(ev)}>
            {mode === 'password' ? (
              <>
                <div className="field">
                  <label htmlFor="login-user">E-mail ou usuário</label>
                  <input
                    id="login-user"
                    type="text"
                    autoComplete="username"
                    placeholder="gestor@acaf.demo"
                    value={username}
                    onChange={(ev) => setUsername(ev.target.value)}
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
                  />
                </div>
                <button type="button" className="login-demo-link" onClick={fillDemoPassword}>
                  Preencher acesso de exemplo
                </button>
              </>
            ) : (
              <>
                <div className="field">
                  <label htmlFor="login-phone">Telefone</label>
                  <input
                    id="login-phone"
                    type="tel"
                    autoComplete="tel"
                    placeholder="(41) 99999-0000"
                    value={phone}
                    onChange={(ev) => setPhone(ev.target.value)}
                  />
                </div>
                <div className="field">
                  <label htmlFor="login-token">Token de 6 dígitos</label>
                  <input
                    id="login-token"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    placeholder="000000"
                    maxLength={6}
                    value={token}
                    onChange={(ev) => setToken(ev.target.value.replace(/\D/g, '').slice(0, 6))}
                  />
                </div>
                <p className="login-otp-hint">Enviaremos o token por SMS no seu celular.</p>
                <button type="button" className="login-demo-link" onClick={fillDemoPhone}>
                  Preencher telefone de exemplo
                </button>
              </>
            )}

            {formError && <p className="login-form-error">{formError}</p>}

            <button
              type="submit"
              className="btn btn-primary login-submit"
              disabled={busy || loading}
            >
              {busy || loading ? 'Entrando…' : 'Entrar'}
            </button>
          </form>

          <p className="login-panel-foot">
            Demonstração · {LOGIN_DEMO_HINT.user} · senha {LOGIN_DEMO_HINT.pass} · SMS{' '}
            {LOGIN_DEMO_HINT.otp}
          </p>
        </div>
      </div>
    </div>
  );
}
