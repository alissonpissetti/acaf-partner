import { useMemo, useState } from 'react';
import { memberAppAddressLines, memberAppAddressPreviewLine } from '../data/address';
import {
  formatMemberAppPriceLine,
  memberAppGalleryPhotos,
  memberAppOpenHoursRows,
  memberAppUnitLabel,
  minDailyPassPriceForUnits,
  minPlanPriceForUnits,
} from '../data/memberAppPreview';
import {
  hasProfileSocialLinks,
  memberAppSocialIconSize,
  memberAppSocialItems,
  memberAppSocialLabelFontSize,
} from '../data/memberAppSocial';
import type { GymUnit, NetworkSocialContacts } from '../types';
import { BrandLogo } from './BrandLogo';
import { MemberAppSocialBrandIcon } from './MemberAppSocialBrandIcons';
import { MemberAppSocialLabel } from './MemberAppSocialLabel';
import './MemberAppNetworkDetailPreview.css';

type Props = {
  networkName: string;
  logoUrl: string | null;
  networkSocial?: NetworkSocialContacts | null;
  units: GymUnit[];
  selectedUnitId: string;
  onSelectUnit: (unitId: string) => void;
  galleryIndex: number;
  onGalleryDot: (index: number) => void;
  onBack?: () => void;
};

export function MemberAppNetworkDetailPreview({
  networkName,
  logoUrl,
  networkSocial,
  units,
  selectedUnitId,
  onSelectUnit,
  galleryIndex,
  onGalleryDot,
  onBack,
}: Props) {
  const selectedUnit = useMemo(
    () => units.find((u) => u.id === selectedUnitId) ?? units[0]!,
    [units, selectedUnitId],
  );

  const [expandedUnitId, setExpandedUnitId] = useState<string | null>(null);

  const gallery = memberAppGalleryPhotos(selectedUnit);
  const heroPhoto = gallery[galleryIndex] ?? null;
  const unitLabel = memberAppUnitLabel(selectedUnit);
  const minDaily = useMemo(() => minDailyPassPriceForUnits(units), [units]);
  const minPlan = useMemo(() => minPlanPriceForUnits(units), [units]);
  const priceLine =
    formatMemberAppPriceLine(units.length, minDaily, minPlan) ??
    'Ative planos ou diárias para exibir preços.';

  const socialItems = useMemo(() => {
    if (!networkSocial || !hasProfileSocialLinks(networkSocial)) return [];
    return memberAppSocialItems(networkSocial, false);
  }, [networkSocial]);

  const socialIconSize = memberAppSocialIconSize(socialItems.length);
  const socialLabelFontSize = memberAppSocialLabelFontSize(socialIconSize);

  const onUnitCardTap = (unit: GymUnit) => {
    onSelectUnit(unit.id);
    setExpandedUnitId((prev) => (prev === unit.id ? null : unit.id));
  };

  const description = selectedUnit.description?.trim();
  const showDaily = selectedUnit.dailyPassActive && selectedUnit.dailyPassPrice > 0;

  return (
    <div className="member-app-detail">
      <header className="member-app-detail-appbar">
        <button
          type="button"
          className="member-app-appbar-back"
          aria-label="Voltar"
          onClick={onBack}
        >
          ‹
        </button>
        <BrandLogo variant="lime" height={22} className="member-app-detail-logo" />
        <span className="member-app-detail-appbar-title">{networkName}</span>
      </header>

      <div className={`member-app-detail-hero${heroPhoto ? ' has-photo' : ''}`}>
        <div className="member-app-detail-hero-media">
          {heroPhoto ? (
            <img className="member-app-hero-photo" src={heroPhoto} alt="" />
          ) : (
            <div className="member-app-hero-fallback" />
          )}
          {heroPhoto ? <div className="member-app-hero-scrim member-app-hero-scrim--subtle" /> : null}
          {logoUrl ? <img className="member-app-hero-logo" src={logoUrl} alt="" /> : null}
        </div>
        <div className="member-app-detail-hero-caption">{unitLabel}</div>
        {gallery.length > 1 ? (
          <div className="member-app-gallery-dots member-app-gallery-dots--lime" aria-hidden>
            {gallery.map((url, i) => (
              <button
                key={`${url}-${i}`}
                type="button"
                className={`member-app-gallery-dot${i === galleryIndex ? ' is-active' : ''}`}
                onClick={() => onGalleryDot(i)}
              />
            ))}
          </div>
        ) : null}
      </div>

      <div className="member-app-detail-scroll">
        <div className="member-app-summary">
          {logoUrl ? <img className="member-app-summary-logo" src={logoUrl} alt="" /> : null}
          <div className="member-app-summary-text">
            <div className="member-app-summary-name">{networkName}</div>
            <div
              className={`member-app-summary-price${
                priceLine.includes('Ative') ? ' member-app-muted' : ''
              }`}
            >
              {priceLine}
            </div>
          </div>
        </div>

        <MemberAppDescriptionBlock description={description} />

        {socialItems.length > 0 ? (
          <section className="member-app-detail-block">
            <h3 className="member-app-section-title">Redes sociais</h3>
            <div className="member-app-social-row">
              {socialItems.map((item) => (
                <a
                  key={item.kind}
                  className="member-app-social-tile"
                  href={item.url}
                  target="_blank"
                  rel="noreferrer"
                  onClick={(e) => e.preventDefault()}
                  style={{ width: socialIconSize }}
                >
                  <MemberAppSocialBrandIcon kind={item.kind} size={socialIconSize} />
                  <MemberAppSocialLabel
                    className="member-app-social-label"
                    label={item.label}
                    width={socialIconSize}
                    fontSize={socialLabelFontSize}
                  />
                </a>
              ))}
            </div>
          </section>
        ) : null}

        <section className="member-app-detail-block">
          <h3 className="member-app-section-title">Unidades da rede</h3>
          <p className="member-app-section-hint">
            {units.length === 1
              ? 'Uma unidade cadastrada nesta rede'
              : `${units.length} unidades · toque para ver detalhes e contratar`}
          </p>
          <div className="member-app-network-units">
            {units.map((unit) => (
              <MemberAppNetworkUnitCard
                key={unit.id}
                unit={unit}
                selected={unit.id === selectedUnitId}
                expanded={unit.id === expandedUnitId}
                onTap={() => onUnitCardTap(unit)}
              />
            ))}
          </div>
        </section>

        {selectedUnit.modalities?.length ? (
          <section className="member-app-detail-block">
            <div className="member-app-amenities-card">
              <h3 className="member-app-section-title member-app-section-title--inset">Modalidades</h3>
              <div className="member-app-modality-chips">
                {selectedUnit.modalities.map((m) => (
                  <span key={m} className="member-app-modality-chip">
                    {m}
                  </span>
                ))}
              </div>
            </div>
          </section>
        ) : null}

        <section className="member-app-detail-block member-app-detail-block--access">
          <h3 className="member-app-section-title">Como acessar</h3>
          <button type="button" className="member-app-access-card">
            <span className="member-app-access-icon member-app-access-icon--plan" aria-hidden>
              <PlanIcon />
            </span>
            <span className="member-app-access-text">
              <strong>Assinatura mensal na unidade</strong>
              <span>Ative um plano app em Minha conta para ver opções aqui.</span>
            </span>
            <span className="member-app-access-chevron" aria-hidden>
              ›
            </span>
          </button>
          {showDaily ? (
            <button type="button" className="member-app-access-card">
              <span className="member-app-access-icon member-app-access-icon--daily" aria-hidden>
                <QrIcon />
              </span>
              <span className="member-app-access-text">
                <strong>Diária com check-in</strong>
                <span>
                  Válida hoje · R$ {selectedUnit.dailyPassPrice.toFixed(2)}
                </span>
              </span>
              <span className="member-app-access-chevron" aria-hidden>
                ›
              </span>
            </button>
          ) : null}
          <div className="member-app-plans-hint">
            <p>Vincule e ative um plano app para listar os planos compatíveis desta unidade.</p>
            <span className="member-app-plans-hint-link">Ir para Minha conta</span>
          </div>
        </section>
      </div>

      <MemberAppDetailStickyFooter unit={selectedUnit} />
    </div>
  );
}

function MemberAppNetworkUnitCard({
  unit,
  selected,
  expanded,
  onTap,
}: {
  unit: GymUnit;
  selected: boolean;
  expanded: boolean;
  onTap: () => void;
}) {
  const lines = memberAppAddressLines(unit);
  const preview = memberAppAddressPreviewLine(unit);
  const hoursRows = memberAppOpenHoursRows(unit);

  return (
    <button
      type="button"
      className={`member-app-unit-card${selected ? ' is-selected' : ''}${
        expanded ? ' is-expanded' : ''
      }`}
      onClick={onTap}
    >
      {selected ? <span className="member-app-unit-card-accent" aria-hidden /> : null}
      <div className="member-app-unit-card-inner">
        <div className="member-app-unit-card-head">
          <strong>{memberAppUnitLabel(unit)}</strong>
          <span className="member-app-unit-card-meta">
            <span className="member-app-unit-card-km">9,4 km</span>
            <span className="member-app-unit-card-chevron" aria-hidden>
              {expanded ? '˄' : '˅'}
            </span>
          </span>
        </div>
        {!expanded ? (
          <>
            <p className="member-app-unit-card-preview">{preview}</p>
            {selected ? (
              <p className="member-app-unit-card-active">Unidade ativa para contratação</p>
            ) : null}
          </>
        ) : (
          <div className="member-app-unit-card-expanded">
            <address className="member-app-unit-card-address">
              {lines.map((line) => (
                <span key={line}>{line}</span>
              ))}
            </address>
            {hoursRows.length ? (
              <div className="member-app-unit-card-hours">
                <div className="member-app-unit-card-hours-title">Horários de funcionamento</div>
                {hoursRows.slice(0, 7).map((row) => (
                  <div key={row.daysLabel} className="member-app-hour-row">
                    <span>{row.daysLabel}</span>
                    <span
                      className={
                        row.rangeLabel === 'Fechado' ? 'member-app-hour-row--closed' : undefined
                      }
                    >
                      {row.rangeLabel}
                    </span>
                  </div>
                ))}
              </div>
            ) : null}
            <div className="member-app-unit-card-footer">
              <span className="member-app-unit-card-map">Mapa</span>
              {selected ? <span className="member-app-unit-card-badge">Ativa</span> : null}
            </div>
          </div>
        )}
      </div>
    </button>
  );
}

function MemberAppDescriptionBlock({ description }: { description?: string }) {
  const [expanded, setExpanded] = useState(false);
  const text = description?.trim();
  if (!text) {
    return (
      <section className="member-app-detail-block">
        <h3 className="member-app-section-title">Descrição</h3>
        <p className="member-app-body-text member-app-muted">Sem descrição cadastrada.</p>
      </section>
    );
  }

  const long = text.length > 120;
  const visible = expanded || !long ? text : `${text.slice(0, 120).trim()}…`;

  return (
    <section className="member-app-detail-block">
      <h3 className="member-app-section-title">Descrição</h3>
      <p className="member-app-body-text">{visible}</p>
      {long ? (
        <button type="button" className="member-app-link-btn" onClick={() => setExpanded((v) => !v)}>
          {expanded ? 'Ver menos' : 'Ver mais'}
        </button>
      ) : null}
    </section>
  );
}

function MemberAppDetailStickyFooter({ unit }: { unit: GymUnit }) {
  const showDaily = unit.dailyPassActive && unit.dailyPassPrice > 0;

  return (
    <footer className="member-app-detail-sticky">
      {showDaily ? (
        <button type="button" className="member-app-detail-btn member-app-detail-btn--primary">
          <QrIcon />
          Comprar diária · R$ {unit.dailyPassPrice.toFixed(2)}
        </button>
      ) : null}
    </footer>
  );
}

function QrIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M4 4h6v6H4V4zm10 0h6v6h-6V4zM4 14h6v6H4v-6zm10 3h6v3h-6v-3z" />
    </svg>
  );
}

function PlanIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 2l3 5 5.5.8-4 3.9.9 5.4L12 15.8 6.6 17.1l.9-5.4-4-3.9L9 7l3-5z" />
    </svg>
  );
}