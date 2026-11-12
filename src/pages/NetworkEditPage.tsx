import { useCallback, useEffect, useState } from 'react';
import { fetchPartnerNetwork, patchPartnerNetwork, uploadPartnerNetworkLogo } from '../api/client';
import { NetworkLogoUploadRow } from '../components/NetworkLogoUploadRow';
import { UnitScopeBanner } from '../components/UnitSwitcher';
import { useFlash } from '../flashContext';
import { usePortal } from '../portalContext';
import type { NetworkSocialContacts } from '../types';
import { emptyNetworkSocialContacts, NETWORK_SOCIAL_FIELD_DEFS } from '../data/networkSocialFields';
import './NetworkEditPage.css';

export function NetworkEditPage() {
  const { applyNetworkDetail } = usePortal();
  const flash = useFlash();
  const [name, setName] = useState('');
  const [social, setSocial] = useState<NetworkSocialContacts>(emptyNetworkSocialContacts());
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const detail = await fetchPartnerNetwork();
      applyNetworkDetail(detail);
      setName(detail.name);
      setSocial({ ...emptyNetworkSocialContacts(), ...detail.social });
      setLogoUrl(detail.logoUrl);
    } catch (e) {
      const msg =
        e instanceof Error ? e.message : 'Não foi possível carregar os dados da rede.';
      setLoadError(msg);
    } finally {
      setLoading(false);
    }
  }, [applyNetworkDetail]);

  useEffect(() => {
    void load();
  }, [load]);

  const onSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setSaving(true);
    try {
      const updated = await patchPartnerNetwork({
        name: name.trim(),
        social,
      });
      applyNetworkDetail(updated);
      setName(updated.name);
      setSocial({ ...emptyNetworkSocialContacts(), ...updated.social });
      setLogoUrl(updated.logoUrl);
      flash.success('Dados da rede salvos.');
    } catch (e) {
      flash.error(e instanceof Error ? e.message : 'Não foi possível salvar.');
    } finally {
      setSaving(false);
    }
  };

  const onLogoUpload = async (file: File) => {
    setSaving(true);
    try {
      const updated = await uploadPartnerNetworkLogo(file);
      applyNetworkDetail(updated);
      setLogoUrl(updated.logoUrl);
      flash.success('Logo atualizada.');
    } catch (e) {
      flash.error(e instanceof Error ? e.message : 'Não foi possível enviar a logo.');
      throw e;
    } finally {
      setSaving(false);
    }
  };

  const setSocialField = (key: keyof NetworkSocialContacts, value: string) => {
    setSocial((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="page-stack network-edit-page">
      <UnitScopeBanner />

      <header className="network-edit-header">
        <div>
          <h1 className="page-title">Rede</h1>
          <p className="network-edit-lead">
            Nome exibido aos alunos, logo e contatos públicos da sua rede (site e redes sociais).
          </p>
        </div>
      </header>

      {loadError ? (
        <section className="panel network-edit-error">
          <div className="panel-body">
            <p role="alert">{loadError}</p>
            <p className="network-edit-hint-muted">
              Se você tem acesso a mais de uma rede, é preciso que o administrador unifique o acesso
              ou gerencie os dados pelo painel interno.
            </p>
            <button type="button" className="btn btn-secondary" onClick={() => void load()}>
              Tentar novamente
            </button>
          </div>
        </section>
      ) : null}

      {!loadError && (
        <section className="panel">
          <div className="panel-body">
            {loading ? (
              <p className="muted">Carregando…</p>
            ) : (
              <form className="network-edit-form" onSubmit={(ev) => void onSubmit(ev)}>
                <NetworkLogoUploadRow
                  logoUrl={logoUrl}
                  disabled={saving}
                  onUpload={onLogoUpload}
                  onLocalError={(msg) => flash.error(msg)}
                />

                <div className="field network-edit-field-full">
                  <label htmlFor="network-name">Nome da rede</label>
                  <input
                    id="network-name"
                    value={name}
                    onChange={(ev) => setName(ev.target.value)}
                    required
                    minLength={2}
                    disabled={saving}
                    placeholder="Nome fantasia da rede"
                  />
                </div>

                <h2 className="network-edit-section-title">Contatos e redes</h2>
                <div className="network-edit-grid">
                  {NETWORK_SOCIAL_FIELD_DEFS.map(({ key, label, placeholder }) => (
                    <div key={key} className="field">
                      <label htmlFor={`network-social-${key}`}>{label}</label>
                      <input
                        id={`network-social-${key}`}
                        value={social[key]}
                        onChange={(ev) => setSocialField(key, ev.target.value)}
                        placeholder={placeholder}
                        disabled={saving}
                      />
                    </div>
                  ))}
                </div>

                <div className="network-edit-actions">
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving ? 'Salvando…' : 'Salvar alterações'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
