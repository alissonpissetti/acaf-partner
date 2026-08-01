import { readImageAsDataUrl } from '../data/helpers';
import type { GymUnit } from '../types';

type Props = {
  unit: GymUnit;
  onChange: (patch: Partial<GymUnit>) => void;
};

export function PhotoUploadSection({ unit, onChange }: Props) {
  const onHero = async (file: File | undefined) => {
    if (!file) return;
    const heroPhotoDataUrl = await readImageAsDataUrl(file);
    onChange({ heroPhotoDataUrl });
  };

  const onGallery = async (files: FileList | null) => {
    if (!files?.length) return;
    const urls: string[] = [];
    for (const file of Array.from(files)) {
      urls.push(await readImageAsDataUrl(file));
    }
    onChange({ galleryPhotoDataUrls: [...unit.galleryPhotoDataUrls, ...urls].slice(0, 8) });
  };

  return (
    <div className="card photo-section">
      <h2 className="section-title">Fotos no Guia ACAF Connect</h2>
      <p className="page-subtitle" style={{ marginTop: 8 }}>
        Essas imagens aparecem no app ACAF Connect para os alunos da unidade.
      </p>

      <div className="photo-grid">
        <div className="photo-slot">
          <span className="photo-label">Capa (hero)</span>
          {unit.heroPhotoDataUrl ? (
            <img src={unit.heroPhotoDataUrl} alt="Capa da unidade" className="photo-preview hero" />
          ) : (
            <div className="photo-placeholder">Sem foto</div>
          )}
          <label className="btn btn-secondary photo-btn">
            Enviar capa
            <input type="file" accept="image/*" hidden onChange={(e) => void onHero(e.target.files?.[0])} />
          </label>
          {unit.heroPhotoDataUrl && (
            <button
              type="button"
              className="btn btn-ghost photo-remove"
              onClick={() => onChange({ heroPhotoDataUrl: null })}
            >
              Remover
            </button>
          )}
        </div>

        <div className="photo-slot wide">
          <span className="photo-label">Galeria ({unit.galleryPhotoDataUrls.length}/8)</span>
          <div className="gallery-row">
            {unit.galleryPhotoDataUrls.map((src, i) => (
              <div key={i} className="gallery-item">
                <img src={src} alt="" className="photo-preview thumb" />
                <button
                  type="button"
                  className="gallery-remove"
                  aria-label="Remover"
                  onClick={() =>
                    onChange({
                      galleryPhotoDataUrls: unit.galleryPhotoDataUrls.filter((_, j) => j !== i),
                    })
                  }
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          <label className="btn btn-secondary photo-btn">
            Adicionar fotos
            <input
              type="file"
              accept="image/*"
              multiple
              hidden
              onChange={(e) => void onGallery(e.target.files)}
            />
          </label>
        </div>
      </div>
    </div>
  );
}
