import { useMemo, type ReactNode } from 'react';
import { enabledUnitPlans, memberAppGalleryPhotos, memberAppUnitLabel } from '../data/memberAppPreview';
import type { GymUnit } from '../types';
import './MemberAppGuideListCard.css';

type Props = {
  networkName: string;
  logoUrl: string | null;
  unit: GymUnit;
  unitCount: number;
  galleryIndex: number;
  onGalleryPrev: () => void;
  onGalleryNext: () => void;
  onOpenNetwork: () => void;
  footerExtra?: ReactNode;
};

export function MemberAppGuideListCard({
  networkName,
  logoUrl,
  unit,
  unitCount,
  galleryIndex,
  onGalleryPrev,
  onGalleryNext,
  onOpenNetwork,
  footerExtra,
}: Props) {
  const gallery = memberAppGalleryPhotos(unit);
  const heroPhoto = gallery[galleryIndex] ?? null;
  const hasGallery = gallery.length > 1;
  const visibleModalities = (unit.modalities ?? []).slice(0, 3);
  const modalitiesAll = unit.modalities ?? [];
  const modalitiesSummary = useMemo(() => {
    if (!modalitiesAll.length) return null;
    if (modalitiesAll.length <= 4) return modalitiesAll.join(', ');
    return `${modalitiesAll.slice(0, 4).join(', ')} +${modalitiesAll.length - 4}`;
  }, [modalitiesAll]);

  const plans = enabledUnitPlans(unit);
  const planFrom = plans.length ? Math.min(...plans.map((p) => p.pricePerMonth)) : null;
  const showDaily = unit.dailyPassActive && unit.dailyPassPrice > 0;
  const showIncluded = plans.length > 0;

  const hood = unit.neighborhood?.trim() || memberAppUnitLabel(unit);
  const cityLabel = (unit.city ?? '').split('/')[0]?.trim() || unit.city || '';
  const unitLine =
    unitCount > 1 ? `Unidade ${memberAppUnitLabel(unit)}` : null;

  return (
    <article className="member-app-guide-card">
      <button type="button" className="member-app-guide-card-top" onClick={onOpenNetwork}>
        <div className="member-app-guide-hero">
          {heroPhoto ? (
            <img className="member-app-guide-hero-photo" src={heroPhoto} alt="" />
          ) : (
            <div className="member-app-guide-hero-fallback" aria-hidden />
          )}
          <div className="member-app-guide-hero-scrim" aria-hidden />
          <span className="member-app-guide-distance">
            <span className="member-app-guide-distance-label">Mais perto</span>
            <span className="member-app-guide-distance-km">0.0 km</span>
          </span>
          <button
            type="button"
            className="member-app-guide-fav"
            aria-label="Favoritar (prévia)"
            onClick={(e) => e.stopPropagation()}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 6 4 4 6.5 4c1.54 0 3.04.73 4 1.89C11.46 4.73 12.96 4 14.5 4 17 4 19 6 19 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
                stroke="currentColor"
                strokeWidth="1.6"
              />
            </svg>
          </button>
          {hasGallery ? (
            <>
              <button
                type="button"
                className="member-app-guide-gallery-nav member-app-guide-gallery-nav--prev"
                aria-label="Foto anterior"
                onClick={(e) => {
                  e.stopPropagation();
                  onGalleryPrev();
                }}
              >
                ‹
              </button>
              <button
                type="button"
                className="member-app-guide-gallery-nav member-app-guide-gallery-nav--next"
                aria-label="Próxima foto"
                onClick={(e) => {
                  e.stopPropagation();
                  onGalleryNext();
                }}
              >
                ›
              </button>
            </>
          ) : null}
          {logoUrl ? (
            <img className="member-app-guide-hero-logo" src={logoUrl} alt="" />
          ) : null}
        </div>

        <div className="member-app-guide-body">
          <h4 className="member-app-guide-network-name">{networkName}</h4>
          {unitLine ? <p className="member-app-guide-unit-line">{unitLine}</p> : null}
          <div className="member-app-guide-meta">
            <svg className="member-app-guide-pin" width="15" height="15" viewBox="0 0 24 24" aria-hidden>
              <path
                fill="currentColor"
                d="M12 11.5A2.5 2.5 0 1 0 12 6.5a2.5 2.5 0 0 0 0 5zm0-7C9.24 4.5 7 6.74 7 9.5c0 4.25 5 9.74 5 9.74s5-5.49 5-9.74c0-2.76-2.24-5-5-5z"
              />
            </svg>
            <span className="member-app-guide-meta-km">0.0 km</span>
          </div>
          <p className="member-app-guide-location">
            <strong>{hood}</strong>
            {cityLabel ? <> · {cityLabel}</> : null}
          </p>
          {modalitiesSummary ? (
            <p className="member-app-guide-aulas">
              <strong>Aulas:</strong> {modalitiesSummary}
            </p>
          ) : null}
          {visibleModalities.length ? (
            <div className="member-app-guide-mod-rows">
              {visibleModalities.map((mod, index) => (
                <div
                  key={mod}
                  className={`member-app-guide-mod-row${
                    showIncluded && index < 2 ? ' is-included' : ''
                  }`}
                >
                  <span>{mod}</span>
                  {showIncluded && index < 2 ? (
                    <svg
                      className="member-app-guide-mod-check"
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      aria-hidden
                    >
                      <path
                        fill="#16a34a"
                        d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1.07 14.54-3.74-3.74 1.41-1.41 2.33 2.33 5.66-5.65 1.41 1.41-7.08 7.07z"
                      />
                    </svg>
                  ) : null}
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </button>

      <div className="member-app-guide-card-footer">
        {showDaily || planFrom != null ? (
          <div className="member-app-guide-pricing-row">
            {showDaily ? (
              <div className="member-app-guide-price-tile">
                <div className="member-app-guide-price-top">
                  <span className="member-app-guide-price-icon" aria-hidden>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M3 3h8v8H3V3zm10 0h8v8h-8V3zM3 13h8v8H3v-8zm12 2h2v2h-2v-2zm-2 2h2v2h-2v-2zm2 2h2v2h-2v-2zm-2 2h2v2h-2v-2z" />
                    </svg>
                  </span>
                  <div className="member-app-guide-price-label">Diária nesta unidade</div>
                </div>
                <div className="member-app-guide-price-value">
                  R$ {unit.dailyPassPrice.toFixed(2)}
                </div>
              </div>
            ) : null}
            {planFrom != null ? (
              <div className="member-app-guide-price-tile">
                <div className="member-app-guide-price-top">
                  <span className="member-app-guide-price-icon" aria-hidden>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M20 4H4c-1.11 0-1.99.89-1.99 2L2 18c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z" />
                    </svg>
                  </span>
                  <div className="member-app-guide-price-label">Planos desde</div>
                </div>
                <div className="member-app-guide-price-value">
                  R$ {planFrom.toFixed(0)}/mês
                </div>
              </div>
            ) : null}
          </div>
        ) : (
          <p className="member-app-guide-pricing-empty muted">
            Ative diária ou planos para exibir valores no card.
          </p>
        )}
        <button type="button" className="member-app-guide-cta" onClick={onOpenNetwork}>
          {unitCount > 1 ? `Ver rede · ${unitCount} unidades` : 'Ver rede'}
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M8.59 16.59 13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z" />
          </svg>
        </button>
        {footerExtra}
      </div>
    </article>
  );
}