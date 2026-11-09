import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { BrandLogo } from '../components/BrandLogo';
import { PasswordInput } from '../components/PasswordInput';
import { getPartnerToken, partnerRequestLoginOtp } from '../api/auth';
import { apiHealth } from '../api/client';
import { usePortal } from '../portalContext';
import { digitsOnly, formatMobileMask, isValidMobileDigits } from '../data/brazilPersonInput';
import './LoginPage.css';

type LoginMode = 'password' | 'phoneCode';

export function LoginPage() {
  const { state, loginWithPassword, loginWithOtp, loading } = usePortal();
  const [mode, setMode] = useState<LoginMode>('password');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [phoneDisplay, setPhoneDisplay] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpHint, setOtpHint] = useState<string | null>(null);
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

  const onSubmitPassword = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setFormError(null);
    setOtpHint(null);

    if (apiOnline === false) {
      setFormError('API indisponível. Inicie o connect-api (porta 8787) ou verifique VITE_API_URL.');
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

  const onRequestOtp = async () => {
    setFormError(null);
    setOtpHint(null);
    const d = digitsOnly(phoneDisplay, 11);
    if (!isValidMobileDigits(d)) {
      setFormError('Informe o celular completo com DDD (11 dígitos).');
      return;
    }
    setBusy(true);
    try {
      const res = await partnerRequestLoginOtp(d);
      setOtpSent(true);
      setOtpHint(res.message ?? 'Se o número estiver cadastrado, você receberá um código no celular.');
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Não foi possível enviar o código.');
    } finally {
      setBusy(false);
    }
  };

  const onSubmitSms = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setFormError(null);
    const d = digitsOnly(phoneDisplay, 11);
    const code = otpCode.trim();
    if (!isValidMobileDigits(d)) {
      setFormError('Celular inválido.');
      return;
    }
    if (!/^\d{6}$/.test(code)) {
      setFormError('Informe o código de 6 dígitos enviado ao seu celular.');
      return;
    }
    setBusy(true);
    try {
      await loginWithOtp(d, code);
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Código inválido.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login-shell">
      <div className="login-hero movly-grain" aria-hidden="true">
        <video className="login-hero-video" autoPlay muted loop playsInline>
          <source src="/media/login-hero.mp4" type="video/mp4" />
        </video>
        <div className="login-hero-scrim" />
        <div className="login-hero-copy">
          <p className="login-hero-tagline">A vida acontece quando você se move.</p>
          <p className="login-hero-text">
            Check-ins, planos, diárias e repasses da sua academia, no mesmo lugar.
          </p>
        </div>
        <ul className="login-hero-checks">
          <li>Corpo</li>
          <li>Mente</li>
          <li>Alma</li>
        </ul>
        <div className="login-hero-signature">
          <BrandLogo
            variant="gradient"
            className="login-hero-wordmark"
            noFixedDimensions
            height={160}
          />
          <p className="login-hero-subline">nosso movimento de bem-estar</p>
        </div>
      </div>

      <div className="login-panel">
        <div className="login-panel-inner">
          <BrandLogo height={36} variant="purple" className="brand-logo--login" />
          <h1 className="login-panel-title">Entrar no portal do parceiro</h1>
          <p className="login-panel-lead">
            {mode === 'password'
              ? 'Use e-mail, CPF ou celular cadastrado e sua senha.'
              : 'Receba um código no celular cadastrado (primeiro acesso ou painel admin).'}
          </p>

          <div className="login-mode-tabs" role="tablist" aria-label="Forma de login">
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'password'}
              className={`login-mode-tab${mode === 'password' ? ' active' : ''}`}
              onClick={() => {
                setMode('password');
                setFormError(null);
                setOtpHint(null);
              }}
            >
              E-mail / senha
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'phoneCode'}
              className={`login-mode-tab${mode === 'phoneCode' ? ' active' : ''}`}
              onClick={() => {
                setMode('phoneCode');
                setFormError(null);
                setOtpHint(null);
              }}
            >
              Código no celular
            </button>
          </div>

          {apiOnline === false ? (
            <p className="login-form-error" role="alert">
              Não foi possível contactar a API. Em desenvolvimento, rode{' '}
              <code>npm run start:dev</code> na pasta da API.
            </p>
          ) : null}

          {mode === 'password' ? (
            <form
              className="login-form"
              autoComplete="off"
              onSubmit={(ev) => void onSubmitPassword(ev)}
            >
              <div className="field">
                <label htmlFor="login-user">E-mail, CPF ou celular</label>
                <input
                  id="login-user"
                  name="partner-login-user"
                  type="text"
                  autoComplete="off"
                  value={username}
                  onChange={(ev) => setUsername(ev.target.value)}
                  disabled={busy || loading}
                />
              </div>
              <div className="field">
                <label htmlFor="login-pass">Senha</label>
                <PasswordInput
                  id="login-pass"
                  autoComplete="new-password"
                  value={password}
                  onChange={setPassword}
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
          ) : (
            <form className="login-form" onSubmit={(ev) => void onSubmitSms(ev)}>
              <div className="field">
                <label htmlFor="login-phone">Celular cadastrado</label>
                <input
                  id="login-phone"
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel-national"
                  placeholder="(11) 98765-4321"
                  maxLength={15}
                  value={phoneDisplay}
                  onChange={(ev) => setPhoneDisplay(formatMobileMask(ev.target.value))}
                  disabled={busy || loading}
                />
              </div>
              <div className="field">
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  style={{ alignSelf: 'flex-start' }}
                  disabled={busy || loading || apiOnline === false}
                  onClick={() => void onRequestOtp()}
                >
                  {busy ? 'Enviando…' : 'Enviar código'}
                </button>
              </div>
              <div className="field">
                <label htmlFor="login-otp">Código (6 dígitos)</label>
                <input
                  id="login-otp"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  placeholder="000000"
                  value={otpCode}
                  onChange={(ev) => setOtpCode(digitsOnly(ev.target.value, 6))}
                  disabled={busy || loading || !otpSent}
                />
              </div>
              {otpHint ? <p className="login-panel-lead" style={{ margin: 0 }}>{otpHint}</p> : null}
              {formError && <p className="login-form-error">{formError}</p>}
              <button
                type="submit"
                className="btn btn-primary login-submit"
                disabled={busy || loading || apiOnline === false || !otpSent}
              >
                {busy ? 'Entrando…' : 'Entrar com código'}
              </button>
            </form>
          )}

          <p className="login-panel-foot">
            O acesso pode ser concedido pelo admin com o <strong>link de onboarding</strong> (rede). Na unidade, aba{' '}
            <strong>Acesso parceiro</strong>, também é possível vincular um usuário já existente.
          </p>
        </div>
      </div>
    </div>
  );
}
