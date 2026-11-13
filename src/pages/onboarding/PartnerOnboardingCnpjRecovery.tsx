import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  requestPartnerOnboardingCnpjRecovery,
  verifyPartnerOnboardingCnpjRecovery,
} from '../../api/auth';
import { apiHealth } from '../../api/client';
import { digitsOnly, formatCnpjMask, isValidCnpjDigits } from '../../data/brazilPersonInput';

const DEFAULT_COOLDOWN_SECONDS = 60;

type RecoveryPhase = 'cnpj' | 'code' | 'already_configured';

export function PartnerOnboardingCnpjRecovery() {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<RecoveryPhase>('cnpj');
  const [cnpjDisplay, setCnpjDisplay] = useState('');
  const [code, setCode] = useState('');
  const [hint, setHint] = useState<string | null>(null);
  const [alreadyMessage, setAlreadyMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [apiOnline, setApiOnline] = useState<boolean | null>(null);
  const [cooldownUntil, setCooldownUntil] = useState(0);
  const [cooldownLeft, setCooldownLeft] = useState(0);

  useEffect(() => {
    void apiHealth().then(setApiOnline);
  }, []);

  useEffect(() => {
    if (!cooldownUntil) {
      setCooldownLeft(0);
      return;
    }
    const tick = () => {
      const left = Math.max(0, Math.ceil((cooldownUntil - Date.now()) / 1000));
      setCooldownLeft(left);
      if (left <= 0) setCooldownUntil(0);
    };
    tick();
    const id = window.setInterval(tick, 250);
    return () => window.clearInterval(id);
  }, [cooldownUntil]);

  const cnpjDigits = () => digitsOnly(cnpjDisplay, 14);

  const startCooldown = (seconds?: number) => {
    const secs = seconds && seconds > 0 ? seconds : DEFAULT_COOLDOWN_SECONDS;
    setCooldownUntil(Date.now() + secs * 1000);
  };

  const onRequestCode = async (ev?: FormEvent) => {
    ev?.preventDefault();
    setFormError(null);
    setHint(null);

    if (apiOnline === false) {
      setFormError('API indisponível. Verifique se a API está no ar.');
      return;
    }

    const cnpj = cnpjDigits();
    if (!isValidCnpjDigits(cnpj)) {
      setFormError('CNPJ inválido. Confira os 14 dígitos.');
      return;
    }

    setBusy(true);
    try {
      const result = await requestPartnerOnboardingCnpjRecovery(cnpj);
      if (result.status === 'already_configured') {
        setAlreadyMessage(result.message);
        setPhase('already_configured');
        return;
      }
      setHint(result.message);
      startCooldown(result.cooldownSeconds);
      setPhase('code');
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Não foi possível enviar o código.');
    } finally {
      setBusy(false);
    }
  };

  const onVerifyCode = async (ev: FormEvent) => {
    ev.preventDefault();
    setFormError(null);
    const cnpj = cnpjDigits();
    const trimmed = code.trim();
    if (!isValidCnpjDigits(cnpj)) {
      setFormError('CNPJ inválido. Confira os 14 dígitos.');
      return;
    }
    if (!/^\d{6}$/.test(trimmed)) {
      setFormError('Informe o código de 6 dígitos enviado ao e-mail do responsável.');
      return;
    }

    setBusy(true);
    try {
      const result = await verifyPartnerOnboardingCnpjRecovery(cnpj, trimmed);
      if (result.status === 'already_configured') {
        setAlreadyMessage(result.message);
        setPhase('already_configured');
        return;
      }
      navigate(`/login/onboarding/${encodeURIComponent(result.token)}`, { replace: true });
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Código inválido ou expirado.');
    } finally {
      setBusy(false);
    }
  };

  const backToCnpj = () => {
    setPhase('cnpj');
    setCode('');
    setHint(null);
    setFormError(null);
  };

  if (phase === 'already_configured') {
    return (
      <div className="onb-wizard-card">
        <h1 className="login-panel-title login-panel-title-onboarding">Acesso já configurado</h1>
        <p className="login-panel-lead">
          {alreadyMessage ??
            'O acesso desta academia já está configurado. Entre no portal com e-mail e senha ou peça um convite à equipe.'}
        </p>
        <div className="onb-callout" role="note">
          <div className="onb-callout-icon" aria-hidden="true">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
          <div className="onb-callout-body">
            <p className="onb-callout-title">Convite de equipe</p>
            <p className="onb-callout-text">
              O cadastro inicial já foi concluído. Para incluir outra pessoa, quem já administra o portal (ou o time
              Movly) envia um convite de equipe — este caminho não reabre o assistente inicial.
            </p>
          </div>
        </div>
        <button
          type="button"
          className="btn btn-primary login-submit"
          onClick={() => navigate('/login')}
        >
          Ir para o login
        </button>
      </div>
    );
  }

  return (
    <div className="onb-wizard-card">
      <h1 className="login-panel-title login-panel-title-onboarding">
        {phase === 'code' ? 'Código de verificação' : 'Continuar sem o link'}
      </h1>
      <p className="login-panel-lead">
        {phase === 'code'
          ? 'Digite o código de 6 dígitos enviado ao e-mail cadastrado do responsável.'
          : 'Perdeu o convite? Informe o CNPJ da academia para identificarmos o cadastro e enviarmos um código de verificação.'}
      </p>

      <div className="onb-callout" role="note">
        <div className="onb-callout-icon" aria-hidden="true">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="5" width="18" height="14" rx="2" />
            <path d="m3 7 9 6 9-6" />
          </svg>
        </div>
        <div className="onb-callout-body">
          <p className="onb-callout-title">Confirmação por e-mail</p>
          <p className="onb-callout-text">
            O código só chega se o onboarding ainda estiver pendente. Se o acesso já estiver ativo, use o{' '}
            <Link to="/login">login</Link> ou peça um convite à equipe.
          </p>
        </div>
      </div>

      {apiOnline === false ? (
        <p className="login-form-error" role="alert">
          Não foi possível contactar a API.
        </p>
      ) : null}

      {phase === 'cnpj' ? (
        <form className="login-form" onSubmit={(ev) => void onRequestCode(ev)} autoComplete="off">
          <div className="field">
            <label htmlFor="onb-cnpj">CNPJ da empresa</label>
            <input
              id="onb-cnpj"
              type="text"
              inputMode="numeric"
              autoComplete="off"
              value={cnpjDisplay}
              onChange={(ev) => setCnpjDisplay(formatCnpjMask(ev.target.value))}
              disabled={busy}
              placeholder="00.000.000/0000-00"
              maxLength={18}
              required
            />
          </div>
          {formError ? <p className="login-form-error">{formError}</p> : null}
          <button
            type="submit"
            className="btn btn-primary login-submit"
            disabled={busy || apiOnline === false}
          >
            {busy ? 'Enviando…' : 'Enviar código'}
          </button>
        </form>
      ) : (
        <form className="login-form" onSubmit={(ev) => void onVerifyCode(ev)} autoComplete="off">
          {hint ? <p className="login-form-info">{hint}</p> : null}
          <div className="field">
            <label htmlFor="onb-cnpj-code">Código (6 dígitos)</label>
            <input
              id="onb-cnpj-code"
              className="onb-code-input"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              placeholder="000000"
              value={code}
              onChange={(ev) => setCode(digitsOnly(ev.target.value, 6))}
              disabled={busy}
              required
            />
          </div>
          {formError ? <p className="login-form-error">{formError}</p> : null}
          <button
            type="submit"
            className="btn btn-primary login-submit"
            disabled={busy || apiOnline === false}
          >
            {busy ? 'Verificando…' : 'Continuar'}
          </button>
          <div className="login-links" style={{ marginTop: 8 }}>
            <button
              type="button"
              className="login-demo-link"
              disabled={busy || apiOnline === false || cooldownLeft > 0}
              onClick={() => void onRequestCode()}
            >
              {cooldownLeft > 0 ? `Reenviar em ${cooldownLeft}s` : 'Reenviar código'}
            </button>
            <button type="button" className="login-demo-link" disabled={busy} onClick={backToCnpj}>
              Trocar CNPJ
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
