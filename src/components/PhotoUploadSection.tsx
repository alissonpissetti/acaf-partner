import { useRef, useState } from 'react';
import {
  removeUnitGalleryPhoto,
  removeUnitHeroPhoto,
  setUnitHeroFromGallery,
  uploadUnitGalleryPhotos,
  uploadUnitHeroPhoto,
} from '../api/client';
import type { GymUnit } from '../types';
import { Modal } from './Modal';
import { UnitPhotoCropField } from './UnitPhotoCropField';

const ACCEPT = 'image/png,image/jpeg,image/webp';
const MAX_GALLERY = 8;
const GALLERY_DRAG_MIME = 'application/x-acaf-gallery-index';

type GalleryCropState =
  | { kind: 'new'; files: File[]; index: number }
  | { kind: 'adjust'; galleryIndex: number; imageUrl: string };

type Props = {
  unit: GymUnit;
  onChange: (patch: Partial<GymUnit>) => void;
  embedded?: boolean;
};

export function PhotoUploadSection({ unit, onChange, embedded = false }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [galleryCrop, setGalleryCrop] = useState<GalleryCropState | null>(null);
  const [coverDropActive, setCoverDropActive] = useState(false);
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
      return updated;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível atualizar as fotos.');
      return null;
    } finally {
      setBusy(false);
    }
  };

  const uploadHero = async (file: File): Promise<void> => {
    await run(() => uploadUnitHeroPhoto(unit.id, file));
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

  const onGalleryDragStart = (ev: React.DragEvent, index: number) => {
    if (busy) return;
    ev.dataTransfer.setData(GALLERY_DRAG_MIME, String(index));
    ev.dataTransfer.effectAllowed = 'copy';
  };

  const onCoverDragOver = (ev: React.DragEvent) => {
    if (busy) return;
    if (!ev.dataTransfer.types.includes(GALLERY_DRAG_MIME)) return;
    ev.preventDefault();
    ev.dataTransfer.dropEffect = 'copy';
    setCoverDropActive(true);
  };

  const onCoverDragLeave = (ev: React.DragEvent) => {
    if (ev.currentTarget.contains(ev.relatedTarget as Node)) return;
    setCoverDropActive(false);
  };

  const onCoverDrop = (ev: React.DragEvent) => {
    ev.preventDefault();
    setCoverDropActive(false);
    if (busy) return;
    const raw = ev.dataTransfer.getData(GALLERY_DRAG_MIME);
    const index = Number.parseInt(raw, 10);
    if (Number.isNaN(index) || index < 0 || index >= galleryPhotos.length) return;
    selectHeroFromGallery(index);
  };

  const onGallerySelected = (ev: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(ev.target.files ?? []);
    ev.target.value = '';
    if (!files.length) return;
    setGalleryCrop({ kind: 'new', files, index: 0 });
  };

  const closeGalleryCrop = () => setGalleryCrop(null);

  const onGalleryCropConfirm = async (file: File) => {
    if (!galleryCrop) return;
    if (galleryCrop.kind === 'new') {
      const updated = await run(() => uploadUnitGalleryPhotos(unit.id, [file]));
      if (!updated) return;
      const nextIndex = galleryCrop.index + 1;
      if (nextIndex < galleryCrop.files.length) {
        setGalleryCrop({ kind: 'new', files: galleryCrop.files, index: nextIndex });
      } else {
        closeGalleryCrop();
      }
      return;
    }

    const { galleryIndex, imageUrl } = galleryCrop;
    const wasCover = heroPhoto === imageUrl;
    const updatedAfterRemove = await run(() => removeUnitGalleryPhoto(unit.id, galleryIndex));
    if (!updatedAfterRemove) return;
    const updatedAfterUpload = await run(() => uploadUnitGalleryPhotos(unit.id, [file]));
    if (!updatedAfterUpload) return;
    if (wasCover) {
      const newIndex = (updatedAfterUpload.galleryPhotoDataUrls?.length ?? 1) - 1;
      if (newIndex >= 0) {
        await run(() => setUnitHeroFromGallery(unit.id, newIndex));
      }
    }
    closeGalleryCrop();
  };

  const galleryModalTitle =
    galleryCrop?.kind === 'new'
      ? `Recorte ${galleryCrop.index + 1} de ${galleryCrop.files.length}`
      : 'Ajustar foto da galeria';

  const galleryModalKey =
    galleryCrop?.kind === 'new'
      ? `${galleryCrop.index}-${galleryCrop.files[galleryCrop.index]?.name}`
      : galleryCrop?.kind === 'adjust'
        ? `adjust-${galleryCrop.galleryIndex}`
        : 'closed';

  return (
    <div className={embedded ? 'unit-photos-field unit-photos-embedded' : 'card unit-photos-field'}>
      {!embedded ? (
        <div className="unit-photos-header">
          <div>
            <h2 className="section-title">Fotos no Guia de academias</h2>
            <p className="unit-photos-help">
              Capa principal e até {MAX_GALLERY} fotos na galeria — recorte 16:9. Use o botão{' '}
              <strong>Capa</strong> na miniatura, ou arraste uma foto até o bloco da capa.
            </p>
          </div>
        </div>
      ) : (
        <p className="unit-photos-help unit-photos-help-embedded">
          Capa e galeria (16:9). Botão <strong>Capa</strong> na miniatura ou arraste para o bloco da
          capa · zoom e arraste no recorte antes de confirmar.
        </p>
      )}

      <div className="unit-photos-grid">
        <div
          className={`unit-photo-slot unit-photo-slot-hero${coverDropActive ? ' is-cover-drop-active' : ''}`}
          onDragOver={onCoverDragOver}
          onDragLeave={onCoverDragLeave}
          onDrop={onCoverDrop}
        >
          <span className="unit-photo-label">
            Capa{coverDropActive ? ' · solte aqui' : ''}
          </span>
          <UnitPhotoCropField
            savedPhotoUrl={heroPhoto}
            disabled={busy}
            pickLabel="Enviar capa"
            onConfirmUpload={uploadHero}
          />
          {heroPhoto ? (
            <div className="unit-photo-actions">
              <button
                type="button"
                className="btn btn-ghost btn-sm unit-photo-remove-btn"
                onClick={removeHero}
                disabled={busy}
              >
                Remover capa
              </button>
            </div>
          ) : null}
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
                  className={`unit-photo-gallery-item${isCover ? ' is-cover' : ''}`}
                  draggable={!busy}
                  onDragStart={(ev) => onGalleryDragStart(ev, index)}
                >
                  <div className="unit-photo-gallery-thumb" aria-hidden>
                    <img src={src} alt="" draggable={false} />
                    {isCover ? <span className="unit-photo-cover-badge">Capa</span> : null}
                  </div>
                  <button
                    type="button"
                    className="unit-photo-gallery-adjust"
                    disabled={busy}
                    onClick={() => setGalleryCrop({ kind: 'adjust', galleryIndex: index, imageUrl: src })}
                  >
                    Ajustar
                  </button>
                  {!isCover ? (
                    <button
                      type="button"
                      className="unit-photo-gallery-set-cover"
                      disabled={busy}
                      title="Usar como capa"
                      aria-label="Usar como capa"
                      onClick={() => selectHeroFromGallery(index)}
                    >
                      Capa
                    </button>
                  ) : null}
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

      <Modal
        open={galleryCrop !== null}
        title={galleryModalTitle}
        onClose={closeGalleryCrop}
        panelClassName="unit-photo-crop-modal"
      >
        {galleryCrop ? (
          <UnitPhotoCropField
            key={galleryModalKey}
            savedPhotoUrl={null}
            disabled={busy}
            hidePickControls
            bootFile={galleryCrop.kind === 'new' ? galleryCrop.files[galleryCrop.index] ?? null : null}
            bootRemoteUrl={galleryCrop.kind === 'adjust' ? galleryCrop.imageUrl : null}
            onCancel={closeGalleryCrop}
            onConfirmUpload={onGalleryCropConfirm}
          />
        ) : null}
      </Modal>
    </div>
  );
}