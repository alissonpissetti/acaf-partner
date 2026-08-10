import { useRef, useState } from 'react';
import {
  removeUnitGalleryPhoto,
  removeUnitHeroPhoto,
  setUnitHeroFromGallery,
  uploadUnitGalleryPhotos,
  uploadUnitHeroPhoto,
} from '../api/client';
import type { GymUnit } from '../types';

const ACCEPT = 'image/png,image/jpeg,image/webp';
const MAX_GALLERY = 8;

type Props = {
  unit: GymUnit;
  onChange: (patch: Partial<GymUnit>) => void;
  embedded?: boolean;
};

export function PhotoUploadSection({ unit, onChange, embedded = false }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const heroInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const heroPhoto = unit.heroPhotoDataUrl;
  const galleryPhotos = unit.galleryPhotoDataUrls ?? [];
  const galleryCount = galleryPhotos.length;
  const canAddGallery = galleryCount < MAX_GALLERY;

  const applyPhotos = (updated: GymUnit) => {
    onChange({
      heroPhotoDataUrl: updated.heroPhotoDataUrl ?? null,
      galleryPhotoDataUrls: updated.galleryPhotoDataUrls ?? [],
    });
  };

  const run = async (action: () => Promise<GymUnit>) => {
    setBusy(true);
    setError('');
    try {
      const updated = await action();
      applyPhotos(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível atualizar as fotos.');
    } finally {
      setBusy(false);
    }
  };

  const onHeroSelected = (ev: React.ChangeEvent<HTMLInputElement>) => {
    const file = ev.target.files?.[0];
    ev.target.value = '';
    if (!file) return;
    void run(() => uploadUnitHeroPhoto(unit.id, file));
  };

  const onGallerySelected = (ev: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(ev.target.files ?? []);
    ev.target.value = '';
    if (!files.length) return;
    void run(() => uploadUnitGalleryPhotos(unit.id, files));
  };

  const removeHero = () => {
    void run(() => removeUnitHeroPhoto(unit.id));
  };

  const removeGallery = (index: number) => {
    void run(() => removeUnitGalleryPhoto(unit.id, index));
  };

  const selectHeroFromGallery = (index: number) => {
    if (heroPhoto === galleryPhotos[index]) return;
    void run(() => setUnitHeroFromGallery(unit.id, index));
  };

  return (
    <div className={embedded ? 'unit-photos-field unit-photos-embedded' : 'card unit-photos-field'}>
      {!embedded ? (
        <div className="unit-photos-header">
          <div>
            <h2 className="section-title">Fotos no Guia ACAF Connect</h2>
            <p className="unit-photos-help">
              Capa principal e até {MAX_GALLERY} fotos na galeria — clique em uma foto da galeria
              para usá-la como capa.
            </p>
          </div>
        </div>
      ) : (
        <p className="unit-photos-help unit-photos-help-embedded">
          Capa principal e até {MAX_GALLERY} fotos na galeria — clique em uma foto da galeria
          para usá-la como capa.
        </p>
      )}

      <div className="unit-photos-grid">
        <div className="unit-photo-slot">
          <span className="unit-photo-label">Capa</span>
          <div className="unit-photo-preview hero">
            {heroPhoto ? (
              <img src={heroPhoto} alt="Capa da unidade" />
            ) : (
              <span className="unit-photo-placeholder">Sem foto</span>
            )}
          </div>
          <div className="unit-photo-actions">
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => heroInputRef.current?.click()}
              disabled={busy}
            >
              {heroPhoto ? 'Enviar outra capa' : 'Enviar capa'}
            </button>
            {heroPhoto ? (
              <button
                type="button"
                className="btn btn-ghost btn-sm unit-photo-remove-btn"
                onClick={removeHero}
                disabled={busy}
              >
                Remover capa
              </button>
            ) : null}
          </div>
          <input
            ref={heroInputRef}
            type="file"
            accept={ACCEPT}
            hidden
            onChange={onHeroSelected}
            disabled={busy}
          />
        </div>

        <div className="unit-photo-slot wide">
          <span className="unit-photo-label">
            Galeria ({galleryCount}/{MAX_GALLERY})
          </span>
          <div className="unit-photo-gallery">
            {galleryPhotos.map((src, index) => {
              const isCover = heroPhoto === src;
              return (
                <div
                  key={`${src}-${index}`}
                  className={`unit-photo-gallery-item ${isCover ? 'is-cover' : ''}`}
                >
                  <button
                    type="button"
                    className="unit-photo-gallery-select"
                    onClick={() => selectHeroFromGallery(index)}
                    disabled={busy}
                    aria-label={isCover ? 'Foto de capa atual' : 'Usar como capa'}
                    aria-pressed={isCover}
                  >
                    <img src={src} alt="" />
                    {isCover ? <span className="unit-photo-cover-badge">Capa</span> : null}
                  </button>
                  <button
                    type="button"
                    className="unit-photo-gallery-remove"
                    aria-label="Remover foto"
                    onClick={() => removeGallery(index)}
                    disabled={busy}
                  >
                    ×
                  </button>
                </div>
              );
            })}
            {canAddGallery ? (
              <button
                type="button"
                className="unit-photo-gallery-add"
                onClick={() => galleryInputRef.current?.click()}
                disabled={busy}
              >
                +
              </button>
            ) : null}
          </div>
          <div className="unit-photo-actions">
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => galleryInputRef.current?.click()}
              disabled={!canAddGallery || busy}
            >
              Adicionar fotos
            </button>
            <small className="unit-photos-format-hint">PNG, JPG ou WEBP · até 5 MB cada</small>
          </div>
          <input
            ref={galleryInputRef}
            type="file"
            accept={ACCEPT}
            multiple
            hidden
            onChange={onGallerySelected}
            disabled={!canAddGallery || busy}
          />
        </div>
      </div>

      {busy ? <p className="unit-photos-status muted">Enviando fotos…</p> : null}
      {error ? <p className="error-text">{error}</p> : null}
    </div>
  );
}
