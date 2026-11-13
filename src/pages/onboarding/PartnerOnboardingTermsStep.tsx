import { useCallback, useEffect, useRef, useState } from 'react';
import {
  acceptPartnerOnboardingTerms,
  fetchPartnerOnboardingRenderedLegalTerms,
  getPartnerUser,
  type PartnerOnboardingLegalTerms,
} from '../../api/auth';
import {
  digitsOnly,
  formatCpfMask,
  isFullName,
  isValidCpfDigits,
} from '../../data/brazilPersonInput';

type Props = {
  disabled?: boolean;
  onContinue: () => void;
};

export function PartnerOnboardingTermsStep({ disabled = false, onContinue }: Props) {
  const [terms, setTerms] = useState<PartnerOnboardingLegalTerms | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scrolledToEnd, setScrolledToEnd] = useState(false);
  const [acceptedCheckbox, setAcceptedCheckbox] = useState(false);
  const [signedName, setSignedName] = useState('');
  const [signedCpfDisplay, setSignedCpfDisplay] = useState('');
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const doc = await fetchPartnerOnboardingRenderedLegalTerms();
      setTerms(doc);
      const sessionUser = getPartnerUser();
      if (sessionUser?.name) {
        setSignedName((prev) => prev || sessionUser.name);
      }
      if (sessionUser?.cpf) {
        setSignedCpfDisplay((prev) => prev || formatCpfMask(sessionUser.cpf!.replace(/\D/g, '')));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível carregar a minuta.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const onScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const atEnd = el.scrollTop + el.clientHeight >= el.scrollHeight - 12;
    if (atEnd) setScrolledToEnd(true);
  };

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || loading) return;
    const fits = el.scrollHeight <= el.clientHeight + 4;
    if (fits) setScrolledToEnd(true);
  }, [loading, terms]);

  const cpfDigits = digitsOnly(signedCpfDisplay);
  const signatureFieldsValid = isFullName(signedName) && isValidCpfDigits(cpfDigits);
  const canSubmit =
    scrolledToEnd && acceptedCheckbox && signatureFieldsValid && !busy && !disabled;

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  };

  useEffect(() => {
    clearCanvas();
  }, [loading]);

  const canvasToOptionalDataUrl = (): string | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    const pixel = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let ink = false;
    for (let i = 0; i < pixel.length; i += 4) {
      if (pixel[i + 3] > 0 && (pixel[i] < 250 || pixel[i + 1] < 250 || pixel[i + 2] < 250)) {
        ink = true;
        break;
      }
    }
    return ink ? canvas.toDataURL('image/png') : null;
  };

  const onCanvasPointerDown = (ev: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    drawingRef.current = true;
    canvas.setPointerCapture(ev.pointerId);
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.strokeStyle = '#17142b';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(ev.clientX - rect.left, ev.clientY - rect.top);
  };

  const onCanvasPointerMove = (ev: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.lineTo(ev.clientX - rect.left, ev.clientY - rect.top);
    ctx.stroke();
  };

  const onCanvasPointerUp = (ev: React.PointerEvent<HTMLCanvasElement>) => {
    drawingRef.current = false;
    const canvas = canvasRef.current;
    if (canvas?.hasPointerCapture(ev.pointerId)) {
      canvas.releasePointerCapture(ev.pointerId);
    }
  };

  const onSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!canSubmit) return;
    setBusy(true);
    setError(null);
    try {
      await acceptPartnerOnboardingTerms({
        signedName: signedName.trim(),
        signedDocument: cpfDigits,
        signatureImageBase64: canvasToOptionalDataUrl(),
      });
      onContinue();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível registrar a assinatura.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="onb-wizard-card onb-terms-card">
      <h1 className="login-panel-title login-panel-title-onboarding">Minuta de parceria</h1>
      <p className="login-panel-lead">
        Leia o contrato personalizado da sua rede na <strong>Movly</strong>. A assinatura é obrigatória para
        continuar o onboarding.
      </p>

      {loading ? (
        <p className="login-panel-lead muted">Carregando minuta…</p>
      ) : terms ? (
        <>
          <p className="onb-terms-meta">
            {terms.title}
            {terms.version ? ` · versão ${terms.version}` : null}
          </p>
          <div
            ref={scrollRef}
            className="onb-terms-scroll"
            onScroll={onScroll}
            tabIndex={0}
            aria-label="Conteúdo da minuta"
          >
            <div className="onb-terms-body" dangerouslySetInnerHTML={{ __html: terms.contentHtml }} />
          </div>
          {!scrolledToEnd ? (
            <p className="onb-terms-hint" role="status">
              Role até o final do documento para habilitar a assinatura.
            </p>
          ) : null}
        </>
      ) : null}

      {error ? <p className="login-form-error">{error}</p> : null}

      <form className="onb-terms-form" onSubmit={(ev) => void onSubmit(ev)}>
        <div className="onb-terms-signature-fields">
          <div className="field">
            <label htmlFor="onb-sign-name">Nome completo (assinatura)</label>
            <input
              id="onb-sign-name"
              type="text"
              autoComplete="name"
              value={signedName}
              onChange={(ev) => setSignedName(ev.target.value)}
              disabled={!scrolledToEnd || busy || disabled || loading}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="onb-sign-cpf">CPF do signatário</label>
            <input
              id="onb-sign-cpf"
              type="text"
              inputMode="numeric"
              autoComplete="off"
              value={signedCpfDisplay}
              onChange={(ev) => setSignedCpfDisplay(formatCpfMask(ev.target.value))}
              disabled={!scrolledToEnd || busy || disabled || loading}
              placeholder="000.000.000-00"
              maxLength={14}
              required
            />
          </div>
        </div>

        <div className="onb-terms-signature-pad">
          <div className="onb-terms-signature-pad-head">
            <span>Assinatura manuscrita (opcional)</span>
            <button
              type="button"
              className="login-inline-link"
              onClick={clearCanvas}
              disabled={busy || disabled || loading}
            >
              Limpar
            </button>
          </div>
          <canvas
            ref={canvasRef}
            className="onb-terms-signature-canvas"
            width={480}
            height={120}
            aria-label="Área para assinatura manuscrita"
            onPointerDown={onCanvasPointerDown}
            onPointerMove={onCanvasPointerMove}
            onPointerUp={onCanvasPointerUp}
            onPointerLeave={onCanvasPointerUp}
          />
        </div>

        <label className="onb-terms-checkbox">
          <input
            type="checkbox"
            checked={acceptedCheckbox}
            onChange={(ev) => setAcceptedCheckbox(ev.target.checked)}
            disabled={!scrolledToEnd || busy || disabled || loading}
          />
          <span>Li integralmente a minuta e concordo com seus termos</span>
        </label>
        <button type="submit" className="btn btn-primary login-submit" disabled={!canSubmit || loading}>
          {busy ? 'Registrando assinatura…' : 'Assinar e continuar'}
        </button>
      </form>
    </div>
  );
}
