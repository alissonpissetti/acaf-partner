import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  requestPartnerOnboardingCnpjRecovery,
  verifyPartnerOnboardingCnpjRecovery,
  type PartnerOnboardingCnpjContactCorrection,
  type PartnerOnboardingRecoveryChannel,
} from '../../api/auth';
import { apiHealth } from '../../api/client';
import {
  digitsOnly,
  formatCnpjMask,
  formatMobileMask,
  isValidCnpjDigits,
  isValidEmail,
  isValidMobileDigits,
} from '../../data/brazilPersonInput';

const DEFAULT_COOLDOWN_SECONDS = 60;

type RecoveryPhase =
  | 'cnpj'
  | 'confirm_contact'
  | 'correct_contact'
  | 'code'
  | 'already_configured'
  | 'cnpj_not_found';

export function PartnerOnboardingCnpjRecovery() {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<RecoveryPhase>('cnpj');
  const [cnpjDisplay, setCnpjDisplay] = useState('');
  const [code, setCode] = useState('');
  const [sentHint, setSentHint] = useState<string | null>(null);
  const [alreadyMessage, setAlreadyMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [apiOnline, setApiOnline] = useState<boolean | null>(null);
  const [cooldownUntil, setCooldownUntil] = useState(0);
  const [cooldownLeft, setCooldownLeft] = useState(0);
  const [channels, setChannels] = useState<PartnerOnboardingRecoveryChannel[]>(['email']);
  const [deliveryChannel, setDeliveryChannel] = useState<PartnerOnboardingRecoveryChannel>('email');
  const [maskedEmail, setMaskedEmail] = useState<string | null>(null);
  const [maskedPhone, setMaskedPhone] = useState<string | null>(null);
  const [contactName, setContactName] = useState<string | null>(null);
  const [networkName, setNetworkName] = useState<string | null>(null);
  const [cnpjNotFoundMessage, setCnpjNotFoundMessage] = useState<string | null>(null);
  const [contactCorrection, setContactCorrection] = useState<PartnerOnboardingCnpjContactCorrection | null>(
    null,
  );
  const [corrName, setCorrName] = useState('');
  const [corrEmail, setCorrEmail] = useState('');
  const [corrPhoneDisplay, setCorrPhoneDisplay] = useState('');

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

  const applyConfirmPreview = (result: Awaited<ReturnType<typeof requestPartnerOnboardingCnpjRecovery>>) => {
    setChannels(result.channels ?? ['email']);
    setMaskedEmail(result.maskedEmail ?? null);
    setMaskedPhone(result.maskedPhone ?? null);
    setContactName(result.contactName ?? null);
    setNetworkName(result.networkName ?? null);
    setContactCorrection(null);
    setPhase('confirm_contact');
  };

  const buildCorrectionFromForm = (): PartnerOnboardingCnpjContactCorrection | null => {
    const name = corrName.trim();
    const email = corrEmail.trim().toLowerCase();
    const mobilePhone = digitsOnly(corrPhoneDisplay, 11);
    if (!name || !email || !mobilePhone) return null;
    return { name, email, mobilePhone };
  };

  const validateCorrectionForm = (): PartnerOnboardingCnpjContactCorrection | null => {
    const correction = buildCorrectionFromForm();
    if (!correction) {
      setFormError('Preencha nome, e-mail e celular do responsável.');
      return null;
    }
    if (correction.name.length < 2) {
      setFormError('Informe o nome completo do responsável.');
      return null;
    }
    if (!isValidEmail(correction.email)) {
      setFormError('Informe um e-mail válido.');
      return null;
    }
    if (!isValidMobileDigits(correction.mobilePhone)) {
      setFormError('Informe o celular com DDD (11 dígitos).');
      return null;
    }
    return correction;
  };

  const sendCode = async (
    channel: PartnerOnboardingRecoveryChannel,
    correction: PartnerOnboardingCnpjContactCorrection | null,
  ) => {
    const cnpj = cnpjDigits();
    const result = await requestPartnerOnboardingCnpjRecovery(cnpj, channel, correction ?? undefined);
    if (result.status === 'already_configured') {
      setAlreadyMessage(result.message);
      setPhase('already_configured');
      return;
    }
  if (result.status === 'confirm_contact') {
      applyConfirmPreview(result);
      return;
    }
    setDeliveryChannel(channel);
    if (correction) setContactCorrection(correction);
    setSentHint(result.message);
    startCooldown(result.cooldownSeconds);
    setPhase('code');
  };

  const onSubmitCnpj = async (ev?: FormEvent) => {
    ev?.preventDefault();
    setFormError(null);
    setSentHint(null);

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
      if (result.status === 'cnpj_not_found') {
        setCnpjNotFoundMessage(result.message);
        setPhase('cnpj_not_found');
        return;
      }
      applyConfirmPreview(result);
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Não foi possível continuar.');
    } finally {
      setBusy(false);
    }
  };

  const onPickChannel = async (channel: PartnerOnboardingRecoveryChannel) => {
    setFormError(null);
    setBusy(true);
    try {
      await sendCode(channel, contactCorrection);
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Não foi possível enviar o código.');
    } finally {
      setBusy(false);
    }
  };

  const onSendWithCorrection = async (channel: PartnerOnboardingRecoveryChannel) => {
    setFormError(null);
    const correction = validateCorrectionForm();
    if (!correction) return;
    setBusy(true);
    try {
      await sendCode(channel, correction);
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
      setFormError('Informe o código de 6 dígitos recebido por e-mail ou SMS.');
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
    setSentHint(null);
    setFormError(null);
    setChannels(['email']);
    setMaskedEmail(null);
    setMaskedPhone(null);
    setContactName(null);
    setContactCorrection(null);
    setNetworkName(null);
    setCnpjNotFoundMessage(null);
    setCorrName('');
    setCorrEmail('');
    setCorrPhoneDisplay('');
  };

  const openCorrectContact = () => {
    setFormError(null);
    setCorrName(contactName && !contactName.includes('*') ? contactName : '');
    setPhase('correct_contact');
  };

  const codeLead =
    deliveryChannel === 'sms'
      ? 'Digite o código enviado por SMS.'
      : 'Digite o código enviado por e-mail.';

  if (phase === 'cnpj_not_found') {
    return (
      <div className="onb-wizard-card">
        <h1 className="login-panel-title login-panel-title-onboarding">CNPJ não encontrado</h1>
        <p className="login-panel-lead">
          {cnpjNotFoundMessage ??
            'Não encontramos este CNPJ entre os parceiros com onboarding pendente.'}
        </p>
        <button type="button" className="btn btn-primary login-submit" onClick={backToCnpj}>
          Tentar outro CNPJ
        </button>
        <div className="login-links" style={{ marginTop: 8 }}>
          <Link to="/login" className="login-demo-link">
            Voltar ao login
          </Link>
        </div>
      </div>
    );
  }

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

  const title =
    phase === 'code'
      ? 'Código de verificação'
      : phase === 'correct_contact'
        ? 'Atualizar contato'
        : phase === 'confirm_contact'
          ? 'Confirmar contato'
          : 'Continuar sem o link';

  const lead =
    phase === 'code'
      ? codeLead
      : phase === 'correct_contact'
        ? 'Informe os dados corretos do responsável. Depois escolha receber o código por e-mail ou SMS.'
        : phase === 'confirm_contact'
          ? 'Confira o contato cadastrado. O código só é enviado após você escolher o canal.'
          : 'Perdeu o convite? Informe o CNPJ da academia para identificarmos o cadastro.';

  return (
    <div className="onb-wizard-card">
      <h1 className="login-panel-title login-panel-title-onboarding">{title}</h1>
      <p className="login-panel-lead">{lead}</p>

      <div className="onb-callout" role="note">
        <div className="onb-callout-icon" aria-hidden="true">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="5" width="18" height="14" rx="2" />
            <path d="m3 7 9 6 9-6" />
          </svg>
        </div>
        <div className="onb-callout-body">
          <p className="onb-callout-title">E-mail ou SMS</p>
          <p className="onb-callout-text">
            Usamos o contato principal cadastrado pelo Movly. Se estiver desatualizado, informe o contato correto nesta
            tela. Com o acesso já ativo, use o <Link to="/login">login</Link>.
          </p>
        </div>
      </div>

      {apiOnline === false ? (
        <p className="login-form-error" role="alert">
          Não foi possível contactar a API.
        </p>
      ) : null}

      {phase === 'cnpj' ? (
        <form className="login-form" onSubmit={(ev) => void onSubmitCnpj(ev)} autoComplete="off">
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
            {busy ? 'Verificando…' : 'Continuar'}
          </button>
        </form>
      ) : null}

      {phase === 'confirm_contact' ? (
        <div className="login-form">
          {networkName ? (
            <p className="login-form-info" style={{ marginTop: 0 }}>
              Rede parceira identificada: <strong>{networkName}</strong>
            </p>
          ) : null}
          {maskedEmail || maskedPhone || contactName ? (
            <dl className="onb-contact-summary">
              {contactName ? (
                <>
                  <dt>Responsável</dt>
                  <dd>{contactName}</dd>
                </>
              ) : null}
              {maskedEmail ? (
                <>
                  <dt>E-mail cadastrado</dt>
                  <dd>{maskedEmail}</dd>
                </>
              ) : null}
              {maskedPhone ? (
                <>
                  <dt>Celular cadastrado</dt>
                  <dd>{maskedPhone}</dd>
                </>
              ) : null}
            </dl>
          ) : (
            <p className="muted">
              Não há e-mail ou celular do contato principal no cadastro. Use &quot;O e-mail está errado&quot; para
              informar os dados corretos.
            </p>
          )}
          {formError ? <p className="login-form-error">{formError}</p> : null}
          {channels.includes('email') ? (
            <button
              type="button"
              className="btn btn-primary login-submit"
              disabled={busy || apiOnline === false}
              onClick={() => void onPickChannel('email')}
            >
              {busy ? 'Enviando…' : 'Enviar código por e-mail'}
            </button>
          ) : null}
          {channels.includes('sms') ? (
            <button
              type="button"
              className="btn btn-secondary login-submit"
              style={{ marginTop: channels.includes('email') ? 8 : 0 }}
              disabled={busy || apiOnline === false}
              onClick={() => void onPickChannel('sms')}
            >
              {busy ? 'Enviando…' : 'Enviar código por SMS'}
            </button>
          ) : null}
          <div className="login-links" style={{ marginTop: 12 }}>
            <button type="button" className="login-demo-link" disabled={busy} onClick={openCorrectContact}>
              O e-mail está errado
            </button>
            <button type="button" className="login-demo-link" disabled={busy} onClick={backToCnpj}>
              Trocar CNPJ
            </button>
          </div>
        </div>
      ) : null}

      {phase === 'correct_contact' ? (
        <form
          className="login-form"
          onSubmit={(ev) => {
            ev.preventDefault();
            void onSendWithCorrection('email');
          }}
          autoComplete="off"
        >
          <div className="field">
            <label htmlFor="onb-corr-name">Nome do responsável</label>
            <input
              id="onb-corr-name"
              type="text"
              autoComplete="name"
              value={corrName}
              onChange={(ev) => setCorrName(ev.target.value)}
              disabled={busy}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="onb-corr-email">E-mail correto</label>
            <input
              id="onb-corr-email"
              type="email"
              autoComplete="email"
              value={corrEmail}
              onChange={(ev) => setCorrEmail(ev.target.value)}
              disabled={busy}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="onb-corr-phone">Celular do responsável</label>
            <input
              id="onb-corr-phone"
              type="tel"
              inputMode="numeric"
              autoComplete="tel"
              placeholder="(11) 98765-4321"
              value={corrPhoneDisplay}
              onChange={(ev) => setCorrPhoneDisplay(formatMobileMask(ev.target.value))}
              disabled={busy}
              required
            />
          </div>
          {formError ? <p className="login-form-error">{formError}</p> : null}
          <button
            type="button"
            className="btn btn-primary login-submit"
            disabled={busy || apiOnline === false}
            onClick={() => void onSendWithCorrection('email')}
          >
            {busy ? 'Enviando…' : 'Enviar código por e-mail'}
          </button>
          <button
            type="button"
            className="btn btn-secondary login-submit"
            style={{ marginTop: 8 }}
            disabled={busy || apiOnline === false}
            onClick={() => void onSendWithCorrection('sms')}
          >
            {busy ? 'Enviando…' : 'Enviar código por SMS'}
          </button>
          <div className="login-links" style={{ marginTop: 8 }}>
            <button
              type="button"
              className="login-demo-link"
              disabled={busy}
              onClick={() => {
                setFormError(null);
                setPhase('confirm_contact');
              }}
            >
              Voltar
            </button>
          </div>
        </form>
      ) : null}

      {phase === 'code' ? (
        <form className="login-form" onSubmit={(ev) => void onVerifyCode(ev)} autoComplete="off">
          {sentHint ? <p className="login-form-info">{sentHint}</p> : null}
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
              onClick={() => void onPickChannel(deliveryChannel)}
            >
              {cooldownLeft > 0 ? `Reenviar em ${cooldownLeft}s` : 'Reenviar código'}
            </button>
            <button type="button" className="login-demo-link" disabled={busy} onClick={backToCnpj}>
              Trocar CNPJ
            </button>
          </div>
        </form>
      ) : null}
    </div>
  );
}