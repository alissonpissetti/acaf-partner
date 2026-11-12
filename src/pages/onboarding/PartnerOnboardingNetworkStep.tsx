import { useCallback, useEffect, useState } from 'react';
import {
  fetchPartnerNetwork,
  patchPartnerNetwork,
  uploadPartnerNetworkLogo,
} from '../../api/client';
import { NetworkLogoUploadRow } from '../../components/NetworkLogoUploadRow';
import { usePortal } from '../../portalContext';
import {
  emptyNetworkSocialContacts,
  NETWORK_SOCIAL_FIELD_DEFS,
} from '../../data/networkSocialFields';
import type { NetworkSocialContacts } from '../../types';
import '../NetworkEditPage.css';

type Props = {
  networkNameHint: string;
  disabled?: boolean;
  onContinue: () => void;
  onSkip: () => void;
};

export function PartnerOnboardingNetworkStep({
  networkNameHint,
  disabled = false,
  onContinue,
  onSkip,
}: Props) {
  const { applyNetworkDetail } = usePortal();
  const [name, setName] = useState(networkNameHint);
  const [social, setSocial] = useState<NetworkSocialContacts>(emptyNetworkSocialContacts());
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const detail = await fetchPartnerNetwork();
      applyNetworkDetail(detail);
      setName(detail.name);
      setSocial({ ...emptyNetworkSocialContacts(), ...detail.social });
      setLogoUrl(detail.logoUrl);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível carregar os dados da rede.');
    } finally {
      setLoading(false);
    }
  }, [applyNetworkDetail]);

  useEffect(() => {
    void load();
  }, [load]);

  const setSocialField = (key: keyof NetworkSocialContacts, value: string) => {
    setSocial((prev) => ({ ...prev, [key]: value }));
  };

  const onLogoUpload = async (file: File) => {
    setBusy(true);
    setError(null);
    try {
      const updated = await uploadPartnerNetworkLogo(file);
      applyNetworkDetail(updated);
      setLogoUrl(updated.logoUrl);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível enviar a logo.');
      throw e;
    } finally {
      setBusy(false);
    }
  };

  const onSaveAndContinue = async () => {
    setBusy(true);
    setError(null);
    try {
      const trimmedName = name.trim();
      if (trimmedName.length >= 2) {
        const updated = await patchPartnerNetwork({
          name: trimmedName,
          social,
        });
        applyNetworkDetail(updated);
        setName(updated.name);
        setSocial({ ...emptyNetworkSocialContacts(), ...updated.social });
        setLogoUrl(updated.logoUrl);
      }
      onContinue();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível salvar.');
    } finally {
      setBusy(false);
    }
  };

  const locked = disabled || busy || loading;

  return (
    <div className="onb-step-body onb-wizard-card">
      <p className="onb-step-kicker">Passo 2 de 3 · opcional</p>
      <h2 className="onb-step-title">Dados da rede</h2>
      <p className="onb-step-lead">
        Logo, nome exibido aos alunos e contatos públicos da <strong>{networkNameHint}</strong>. Você pode
        concluir depois em <strong>Cadastro → Rede</strong> no portal.
      </p>

      {error ? (
        <p className="login-form-error" role="alert">
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className="muted">Carregando dados da rede…</p>
      ) : (
        <form
          className="network-edit-form onb-network-form"
          onSubmit={(ev) => {
            ev.preventDefault();
            void onSaveAndContinue();
          }}
        >
          <NetworkLogoUploadRow
            logoUrl={logoUrl}
            disabled={locked}
            onLocalError={setError}
            onUpload={onLogoUpload}
          />

          <div className="field network-edit-field-full">
            <label htmlFor="onb-network-name">Nome da rede (como os alunos veem)</label>
            <input
              id="onb-network-name"
              value={name}
              onChange={(ev) => setName(ev.target.value)}
              minLength={2}
              disabled={locked}
              placeholder="Nome fantasia da rede"
            />
          </div>

          <h3 className="network-edit-section-title">Contatos e redes</h3>
          <div className="network-edit-grid">
            {NETWORK_SOCIAL_FIELD_DEFS.map(({ key, label, placeholder }) => (
              <div key={key} className="field">
                <label htmlFor={`onb-network-social-${key}`}>{label}</label>
                <input
                  id={`onb-network-social-${key}`}
                  value={social[key]}
                  onChange={(ev) => setSocialField(key, ev.target.value)}
                  placeholder={placeholder}
                  disabled={locked}
                />
              </div>
            ))}
          </div>

          <div className="onb-step-actions">
            <button type="submit" className="btn btn-primary" disabled={locked}>
              {busy ? 'Salvando…' : 'Salvar e continuar'}
            </button>
            <button type="button" className="btn btn-secondary" disabled={locked} onClick={onSkip}>
              Pular por agora
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
