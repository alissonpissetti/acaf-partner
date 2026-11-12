import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { BrandLogo } from '../components/BrandLogo';
import { PasswordInput } from '../components/PasswordInput';
import { PartnerOnboardingStepper } from '../components/PartnerOnboardingStepper';
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
import type { PartnerOnboardingWizardStep } from '../data/partnerOnboardingWizard';
import {
  isPartnerOnboardingInviteUsedMessage,
  isPartnerOnboardingWizardDone,
  markPartnerOnboardingWizardDone,
  resolvePartnerOnboardingWizardStep,
  savePartnerOnboardingWizardStep,
} from '../data/partnerOnboardingWizard';
import { PartnerOnboardingNetworkStep } from './onboarding/PartnerOnboardingNetworkStep';
import { PartnerOnboardingUnitsStep } from './onboarding/PartnerOnboardingUnitsStep';
import './LoginPage.css';
import './PartnerOnboardingPage.css';

export function PartnerOnboardingPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { state, loading, loginWithTokens } = usePortal();

  const [step, setStepState] = useState<PartnerOnboardingWizardStep>(1);
  const stepHydrated = useRef(false);
  const [preview, setPreview] = useState<{ networkId: string; networkName: string } | null>(null);
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

  const networkLabel = preview?.networkName ?? state.networkName ?? 'sua rede';
  const wizardDone = isPartnerOnboardingWizardDone();
  const sessionActive = Boolean(getPartnerToken() && state.loggedIn);
  const inviteUsed = isPartnerOnboardingInviteUsedMessage(previewError);

  const progressRefs = useCallback(
    () => ({
      token: token ?? null,
      networkId: state.networkId || preview?.networkId || null,
    }),
    [token, state.networkId, preview?.networkId],
  );

  const setStep = useCallback(
    (next: PartnerOnboardingWizardStep) => {
      setStepState(next);
      savePartnerOnboardingWizardStep(next, progressRefs());
    },
    [progressRefs],
  );

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
      .then((p) => setPreview({ networkId: p.networkId, networkName: p.networkName }))
      .catch((e) => {
        const message = e instanceof Error ? e.message : 'Convite inválido.';
        setPreviewError(message);
        setPreview(null);
      })
      .finally(() => setPreviewLoading(false));
  }, [token]);

  useEffect(() => {
    if (loading) return;
    if (stepHydrated.current) return;

    const networkId = state.networkId || null;
    if (sessionActive && !networkId) return;

    const previewPending = Boolean(token) && previewLoading;
    const resolved = resolvePartnerOnboardingWizardStep({
      sessionActive,
      networkId,
      token: token ?? null,
      previewNetworkId: preview?.networkId ?? null,
      previewPending,
    });
    if (resolved === null) return;

    setStepState(resolved);
    stepHydrated.current = true;
  }, [loading, sessionActive, state.networkId, token, preview, previewLoading]);

  if (loading && getPartnerToken() && !sessionActive) {
    return (
      <div className="login-shell login-shell-loading">
        <p className="login-loading-text">Restaurando sessão…</p>
      </div>
    );
  }

  if (sessionActive && wizardDone) {
    return <Navigate to="/" replace />;
  }

  const finishWizard = () => {
    markPartnerOnboardingWizardDone(progressRefs());
    navigate('/', { replace: true });
  };

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

  const onSubmitStep1 = async (ev: React.FormEvent) => {
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
      savePartnerOnboardingWizardStep(2, {
        token,
        networkId: preview?.networkId ?? null,
      });
      setStepState(2);
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Não foi possível concluir.');
    } finally {
      setBusy(false);
    }
  };

  const sessionNetworkMismatch =
    sessionActive &&
    Boolean(preview?.networkId && state.networkId) &&
    preview!.networkId !== state.networkId;

  const step1Blocked =
    !sessionActive &&
    (inviteUsed || !preview || Boolean(previewError) || previewLoading);
  const canShowStep1 = step === 1 && !sessionActive;

  const loginReturn =
    token != null
      ? `/login?next=${encodeURIComponent(`/login/onboarding/${token}`)}`
      : '/login';

  return (
    <div className="login-shell login-shell-onboarding-wizard">
      <div className="onb-mobile-brand-bar movly-grain" aria-hidden="true">
        <BrandLogo
          variant="gradient"
          className="onb-mobile-brand-lockup"
          noFixedDimensions
          height={44}
        />
      </div>

      <div className="login-hero movly-grain" aria-hidden="true">
        <div className="login-hero-scrim" />
        <div className="login-hero-copy">
          <p className="login-hero-tagline">Configuração inicial do parceiro</p>
          <p className="login-hero-text">
            Em poucos passos você cria seu acesso, pode ajustar a rede e revisar as unidades — ou concluir isso
            depois no portal.
          </p>
        </div>
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
        <div className="login-panel-inner login-panel-inner-onboarding">
          <header className="onb-wizard-header">
            <BrandLogo height={36} variant="gradient" className="brand-logo--login onb-wizard-header-logo" />
            {preview?.networkName || sessionActive ? (
              <p className="onb-network-badge" title="Rede do convite">
                {preview?.networkName ?? networkLabel}
              </p>
            ) : null}
            <PartnerOnboardingStepper current={step} />
          </header>

          {sessionNetworkMismatch ? (
            <p className="login-form-error" role="alert">
              Você está logado em outra rede. Saia da conta atual e entre com o usuário deste convite, ou continue no
              navegador onde iniciou o cadastro.
            </p>
          ) : null}

          {inviteUsed && !sessionActive ? (
            <div className="onb-callout" role="note">
              <div className="onb-callout-icon" aria-hidden="true">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 16v-4" />
                  <path d="M12 8h.01" />
                </svg>
              </div>
              <div className="onb-callout-body">
                <p className="onb-callout-title">Convite já utilizado</p>
                <p className="onb-callout-text">
                  Continue no <strong>mesmo navegador</strong> onde você criou o acesso (o progresso fica salvo
                  localmente). Em outro aparelho ou navegador,{' '}
                  <Link to={loginReturn}>entre com e-mail e senha</Link> e abra este link de novo para retomar nos
                  passos 2 ou 3.
                </p>
              </div>
            </div>
          ) : null}

          {canShowStep1 ? (
            <div className="onb-wizard-card">
              <h1 className="login-panel-title login-panel-title-onboarding">Seu acesso ao portal</h1>
              {preview ? (
                <p className="login-panel-lead">
                  Primeiro, cadastre <strong>quem vai administrar</strong> a rede{' '}
                  <strong>{preview.networkName}</strong> no portal — seus dados pessoais de login (não são os dados
                  da academia nem das unidades).
                </p>
              ) : previewError && !inviteUsed ? (
                <p className="login-form-error" role="alert">
                  {previewError}
                </p>
              ) : previewLoading ? (
                <p className="login-panel-lead">Carregando convite…</p>
              ) : inviteUsed ? (
                <p className="login-panel-lead muted">Faça login para continuar a configuração da rede.</p>
              ) : (
                <p className="login-panel-lead">Carregando convite…</p>
              )}

              {!inviteUsed ? (
                <div className="onb-callout" role="note">
                  <div className="onb-callout-icon" aria-hidden="true">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                  </div>
                  <div className="onb-callout-body">
                    <p className="onb-callout-title">Responsável pelo portal</p>
                    <p className="onb-callout-text">
                      Proprietário, franqueado ou gestor que define planos, repasses e a gestão do portal. Os dados da
                      rede e das unidades vêm nos próximos passos (opcionais).
                    </p>
                  </div>
                </div>
              ) : null}

              {apiOnline === false ? (
                <p className="login-form-error" role="alert">
                  Não foi possível contactar a API.
                </p>
              ) : null}

              {!inviteUsed ? (
                <form className="login-form" onSubmit={(ev) => void onSubmitStep1(ev)} autoComplete="off">
                  <div className="field">
                    <label htmlFor="onb-name">Nome completo do responsável</label>
                    <input
                      id="onb-name"
                      type="text"
                      autoComplete="name"
                      value={name}
                      onChange={(ev) => setName(ev.target.value)}
                      disabled={busy || step1Blocked || loading}
                      placeholder="Nome e sobrenome"
                      required
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="onb-email">E-mail de acesso</label>
                    <input
                      id="onb-email"
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(ev) => setEmail(ev.target.value)}
                      disabled={busy || step1Blocked || loading}
                      required
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="onb-cpf">CPF do responsável</label>
                    <input
                      id="onb-cpf"
                      type="text"
                      inputMode="numeric"
                      autoComplete="off"
                      value={cpfDisplay}
                      onChange={(ev) => onCpfChange(ev.target.value)}
                      disabled={busy || step1Blocked || loading}
                      placeholder="000.000.000-00"
                      maxLength={14}
                      required
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="onb-phone">Celular do responsável</label>
                    <input
                      id="onb-phone"
                      type="tel"
                      inputMode="numeric"
                      autoComplete="tel-national"
                      value={phoneDisplay}
                      onChange={(ev) => onPhoneChange(ev.target.value)}
                      disabled={busy || step1Blocked || loading}
                      placeholder="(11) 98765-4321"
                      maxLength={15}
                      required
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="onb-pass">Senha do portal</label>
                    <PasswordInput
                      id="onb-pass"
                      autoComplete="new-password"
                      placeholder="Mín. 8 caracteres, letra e número"
                      value={password}
                      onChange={setPassword}
                      disabled={busy || step1Blocked || loading}
                      required
                      minLength={8}
                    />
                  </div>
                  {formError ? <p className="login-form-error">{formError}</p> : null}
                  <button
                    type="submit"
                    className="btn btn-primary login-submit"
                    disabled={busy || loading || step1Blocked || apiOnline === false}
                  >
                    {busy ? 'Criando acesso…' : 'Continuar'}
                  </button>
                </form>
              ) : null}
            </div>
          ) : null}

          {step === 2 && sessionActive && !sessionNetworkMismatch ? (
            <PartnerOnboardingNetworkStep
              networkNameHint={networkLabel}
              onContinue={() => setStep(3)}
              onSkip={() => setStep(3)}
            />
          ) : null}

          {step === 3 && sessionActive && !sessionNetworkMismatch ? (
            <PartnerOnboardingUnitsStep onFinish={finishWizard} onSkip={finishWizard} />
          ) : null}

          {sessionActive && step >= 2 ? (
            <p className="login-panel-foot">
              Já configurou tudo?{' '}
              <button type="button" className="login-inline-link" onClick={finishWizard}>
                Ir para o portal
              </button>
            </p>
          ) : (
            <p className="login-panel-foot">
              Já tem conta? <Link to={loginReturn}>Entrar</Link>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
