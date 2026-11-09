import { useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
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
import './LoginPage.css';

export function PartnerOnboardingPage() {
  const { token } = useParams<{ token: string }>();
  const { state, loading, loginWithTokens } = usePortal();
  const [preview, setPreview] = useState<{ networkName: string } | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [apiOnline, setApiOnline] = useState<boolean | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [cpfDisplay, setCpfDisplay] = useState('');
  const [phoneDisplay, setPhoneDisplay] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    void apiHealth().then(setApiOnline);
  }, []);

  useEffect(() => {
    if (!token) {
      setPreviewError('Link inválido.');
      return;
    }
    setPreviewError(null);
    void fetchPartnerOnboardingPreview(token)
      .then((p) => setPreview({ networkName: p.networkName }))
      .catch((e) => setPreviewError(e instanceof Error ? e.message : 'Convite inválido.'));
  }, [token]);

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

  const onCpfChange = (raw: string) => {
    setCpfDisplay(formatCpfMask(raw));
  };

  const onPhoneChange = (raw: string) => {
    setPhoneDisplay(formatMobileMask(raw));
  };

  const validateClient = (): string | null => {
    if (!isFullName(name)) {
      return 'Informe o nome completo (nome e sobrenome, ao menos 2 letras em cada parte).';
    }
    if (!isValidEmail(email)) {
      return 'Informe um e-mail válido.';
    }
    const cpf = digitsOnly(cpfDisplay, 11);
    if (!isValidCpfDigits(cpf)) {
      return 'CPF inválido. Verifique os dígitos.';
    }
    const phone = digitsOnly(phoneDisplay, 11);
    if (!isValidMobileDigits(phone)) {
      return 'Celular inválido. Use DDD + 9 dígitos (ex.: 11 98765-4321).';
    }
    if (!isStrongEnoughPassword(password)) {
      return 'Senha: mínimo 8 caracteres, com ao menos uma letra e um número.';
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
    const cpfDigits = digitsOnly(cpfDisplay, 11);
    const mobileDigits = digitsOnly(phoneDisplay, 11);

    setBusy(true);
    try {
      const result = await completePartnerOnboarding(token, {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        cpf: cpfDigits,
        mobilePhone: mobileDigits,
        password,
      });
      await loginWithTokens(result);
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Não foi possível concluir.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login-shell">
      <div className="login-hero movly-grain" aria-hidden="true">
        <div className="login-hero-scrim" />
        <div className="login-hero-copy">
          <p className="login-hero-tagline">Primeiro acesso do parceiro</p>
          <p className="login-hero-text">
            Crie sua conta para gerenciar unidades, recepção e repasses no portal da academia.
          </p>
        </div>
        <div className="login-hero-signature">
          <BrandLogo
            variant="gradient"
            className="login-hero-wordmark"
            noFixedDimensions
            height={160}
          />
        </div>
      </div>

      <div className="login-panel">
        <div className="login-panel-inner">
          <BrandLogo height={36} variant="purple" className="brand-logo--login" />
          <h1 className="login-panel-title">Cadastro do parceiro</h1>
          {preview ? (
            <p className="login-panel-lead">
              Você está sendo vinculado à rede <strong>{preview.networkName}</strong>. Após criar a senha,
              você terá acesso a todas as unidades desta rede no portal. O celular informado poderá ser usado para
              receber códigos de acesso quando você optar por login sem senha.
            </p>
          ) : previewError ? (
            <p className="login-form-error" role="alert">
              {previewError}
            </p>
          ) : (
            <p className="login-panel-lead">Carregando convite…</p>
          )}

          {apiOnline === false ? (
            <p className="login-form-error" role="alert">
              Não foi possível contactar a API.
            </p>
          ) : null}

          <form className="login-form" onSubmit={(ev) => void onSubmit(ev)} autoComplete="off">
            <div className="field">
              <label htmlFor="onb-name">Nome completo</label>
              <input
                id="onb-name"
                type="text"
                autoComplete="name"
                value={name}
                onChange={(ev) => setName(ev.target.value)}
                disabled={busy || !preview || loading}
                placeholder="Nome e sobrenome"
                required
              />
            </div>
            <div className="field">
              <label htmlFor="onb-email">E-mail</label>
              <input
                id="onb-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(ev) => setEmail(ev.target.value)}
                disabled={busy || !preview || loading}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="onb-cpf">CPF</label>
              <input
                id="onb-cpf"
                type="text"
                inputMode="numeric"
                autoComplete="off"
                value={cpfDisplay}
                onChange={(ev) => onCpfChange(ev.target.value)}
                disabled={busy || !preview || loading}
                placeholder="000.000.000-00"
                maxLength={14}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="onb-phone">Celular</label>
              <input
                id="onb-phone"
                type="tel"
                inputMode="numeric"
                autoComplete="tel-national"
                value={phoneDisplay}
                onChange={(ev) => onPhoneChange(ev.target.value)}
                disabled={busy || !preview || loading}
                placeholder="(11) 98765-4321"
                maxLength={15}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="onb-pass">Senha</label>
              <PasswordInput
                id="onb-pass"
                autoComplete="new-password"
                placeholder="Mín. 8 caracteres, letra e número"
                value={password}
                onChange={setPassword}
                disabled={busy || !preview || loading}
                required
                minLength={8}
              />
            </div>
            {formError ? <p className="login-form-error">{formError}</p> : null}
            <button
              type="submit"
              className="btn btn-primary login-submit"
              disabled={busy || loading || !preview || apiOnline === false}
            >
              {busy ? 'Criando conta…' : 'Criar conta e entrar'}
            </button>
          </form>

          <p className="login-panel-foot">
            Já tem conta? <Link to="/login">Entrar</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
