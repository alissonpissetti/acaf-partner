import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { BrandLogo } from '../components/BrandLogo';
import { PasswordInput } from '../components/PasswordInput';
import {
  completePartnerOnboarding,
  fetchPartnerOnboardingPreview,
  getPartnerToken,
} from '../api/auth';
import { apiHealth } from '../api/client';
import { usePortal } from '../portalContext';
import {
  digitsOnly,
  formatCpfMask,
  formatMobileMask,
  isFullName,
  isStrongEnoughPassword,
  isValidCpfDigits,
  isValidEmail,
  isValidMobileDigits,
} from '../data/brazilPersonInput';
import { isPartnerOnboardingInviteUsedMessage } from '../data/partnerOnboardingWizard';
import './LoginPage.css';

export function PartnerTeamInvitePage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { state, loading, loginWithTokens } = usePortal();

  const [preview, setPreview] = useState<{ networkId: string; networkName: string; inviteKind?: string } | null>(
    null,
  );
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(Boolean(token));
  const [apiOnline, setApiOnline] = useState<boolean | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [cpfDisplay, setCpfDisplay] = useState('');
  const [phoneDisplay, setPhoneDisplay] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const sessionActive = Boolean(getPartnerToken() && state.loggedIn);
  const inviteUsed = isPartnerOnboardingInviteUsedMessage(previewError);

  useEffect(() => {
    void apiHealth().then(setApiOnline);
  }, []);

  useEffect(() => {
    if (!token) {
      setPreviewLoading(false);
      return;
    }
    setPreviewLoading(true);
    setPreviewError(null);
    void fetchPartnerOnboardingPreview(token)
      .then((p) => {
        if (p.inviteKind === 'onboarding') {
          window.location.replace(`/login/onboarding/${encodeURIComponent(token)}`);
          return;
        }
        setPreview({ networkId: p.networkId, networkName: p.networkName, inviteKind: p.inviteKind });
      })
      .catch((e) => {
        const message = e instanceof Error ? e.message : 'Convite inválido.';
        setPreviewError(message);
        setPreview(null);
      })
      .finally(() => setPreviewLoading(false));
  }, [token]);

  if (sessionActive && state.loggedIn) {
    return <Navigate to="/" replace />;
  }

  const onCpfChange = (raw: string) => setCpfDisplay(formatCpfMask(digitsOnly(raw, 11)));
  const onPhoneChange = (raw: string) => setPhoneDisplay(formatMobileMask(digitsOnly(raw, 11)));

  const validateClient = (): string | null => {
    if (!isFullName(name)) return 'Informe nome e sobrenome.';
    if (!isValidEmail(email)) return 'Informe um e-mail válido.';
    const cpfDigits = digitsOnly(cpfDisplay, 11);
    if (!isValidCpfDigits(cpfDigits)) return 'CPF inválido.';
    const mobileDigits = digitsOnly(phoneDisplay, 11);
    if (!isValidMobileDigits(mobileDigits)) return 'Celular inválido (11 dígitos com DDD).';
    if (!isStrongEnoughPassword(password)) {
      return 'Senha fraca: mínimo 8 caracteres, com letra e número.';
    }
    return null;
  };

  const onSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setFormError(null);
    if (!token) return;
    if (apiOnline === false) {
      setFormError('API indisponível. Verifique VITE_API_URL e se a API está no ar.');
      return;
    }
    const clientErr = validateClient();
    if (clientErr) {
      setFormError(clientErr);
      return;
    }

    setBusy(true);
    try {
      const result = await completePartnerOnboarding(token, {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        cpf: digitsOnly(cpfDisplay, 11),
        mobilePhone: digitsOnly(phoneDisplay, 11),
        password,
      });
      await loginWithTokens(result);
      navigate('/', { replace: true });
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Não foi possível concluir.');
    } finally {
      setBusy(false);
    }
  };

  const blocked = inviteUsed || !preview || Boolean(previewError) || previewLoading;
  const loginReturn =
    token != null ? `/login?next=${encodeURIComponent(`/login/equipe/${token}`)}` : '/login';

  return (
    <div className="login-shell">
      <div className="login-panel">
        <div className="login-panel-inner">
          <BrandLogo height={36} variant="gradient" className="brand-logo--login" />
          {preview?.networkName ? (
            <p className="muted" style={{ marginTop: '0.5rem' }}>
              Rede <strong>{preview.networkName}</strong>
            </p>
          ) : null}

          <h1 className="login-panel-title">Acesso à equipe</h1>
          {preview ? (
            <p className="login-panel-lead">
              Crie seu login para gerenciar a rede <strong>{preview.networkName}</strong> no portal parceiro. As
              unidades já estão vinculadas — após o cadastro você entra direto no painel.
            </p>
          ) : previewError && !inviteUsed ? (
            <p className="login-form-error" role="alert">
              {previewError}
            </p>
          ) : previewLoading ? (
            <p className="login-panel-lead">Carregando convite…</p>
          ) : inviteUsed ? (
            <p className="login-panel-lead muted">
              Este convite já foi utilizado.{' '}
              <Link to={loginReturn}>Entre com e-mail e senha</Link> se você já criou sua conta.
            </p>
          ) : (
            <p className="login-panel-lead">Carregando convite…</p>
          )}

          {apiOnline === false ? (
            <p className="login-form-error" role="alert">
              Não foi possível contactar a API.
            </p>
          ) : null}

          {!inviteUsed && preview ? (
            <form className="login-form" onSubmit={(ev) => void onSubmit(ev)} autoComplete="off">
              <div className="field">
                <label htmlFor="team-name">Nome completo</label>
                <input
                  id="team-name"
                  type="text"
                  autoComplete="name"
                  value={name}
                  onChange={(ev) => setName(ev.target.value)}
                  disabled={busy || blocked || loading}
                  required
                />
              </div>
              <div className="field">
                <label htmlFor="team-email">E-mail de acesso</label>
                <input
                  id="team-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(ev) => setEmail(ev.target.value)}
                  disabled={busy || blocked || loading}
                  required
                />
              </div>
              <div className="field">
                <label htmlFor="team-cpf">CPF</label>
                <input
                  id="team-cpf"
                  type="text"
                  inputMode="numeric"
                  value={cpfDisplay}
                  onChange={(ev) => onCpfChange(ev.target.value)}
                  disabled={busy || blocked || loading}
                  placeholder="000.000.000-00"
                  maxLength={14}
                  required
                />
              </div>
              <div className="field">
                <label htmlFor="team-phone">Celular</label>
                <input
                  id="team-phone"
                  type="tel"
                  inputMode="numeric"
                  value={phoneDisplay}
                  onChange={(ev) => onPhoneChange(ev.target.value)}
                  disabled={busy || blocked || loading}
                  placeholder="(11) 98765-4321"
                  maxLength={15}
                  required
                />
              </div>
              <div className="field">
                <label htmlFor="team-pass">Senha do portal</label>
                <PasswordInput
                  id="team-pass"
                  autoComplete="new-password"
                  placeholder="Mín. 8 caracteres, letra e número"
                  value={password}
                  onChange={setPassword}
                  disabled={busy || blocked || loading}
                  required
                  minLength={8}
                />
              </div>
              {formError ? <p className="login-form-error">{formError}</p> : null}
              <button
                type="submit"
                className="btn btn-primary login-submit"
                disabled={busy || loading || blocked || apiOnline === false}
              >
                {busy ? 'Criando acesso…' : 'Criar acesso e entrar'}
              </button>
            </form>
          ) : null}

          <p className="login-panel-foot">
            Já tem conta? <Link to={loginReturn}>Entrar</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
