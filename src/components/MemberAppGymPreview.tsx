import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { memberAppGalleryPhotos, memberAppUnitLabel } from '../data/memberAppPreview';
import type { GymUnit, NetworkSocialContacts } from '../types';
import { MemberAppGuideListCard } from './MemberAppGuideListCard';
import {
  MemberAppBottomNavPreview,
  MemberAppGuideListHeader,
} from './MemberAppGuideListChrome';
import { MemberAppNetworkDetailPreview } from './MemberAppNetworkDetailPreview';
import './MemberAppGuideListCard.css';
import './MemberAppGuideListChrome.css';
import './MemberAppNetworkDetailPreview.css';
import './MemberAppGymPreview.css';

type AppScreen = 'network' | 'unit';

type Props = {
  networkName: string;
  logoUrl: string | null;
  units: GymUnit[];
  /** Abre já na tela de detalhe (ex.: edição de unidade). */
  initialScreen?: AppScreen;
  /** Unidade em foco — atualiza ao trocar de rota. */
  focusUnitId?: string;
  networkSocial?: NetworkSocialContacts | null;
  footer?: ReactNode | null;
};

export function MemberAppGymPreview({
  networkName,
  logoUrl,
  units,
  initialScreen = 'network',
  focusUnitId,
  networkSocial = null,
  footer,
}: Props) {
  const [screen, setScreen] = useState<AppScreen>(initialScreen);
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(
    focusUnitId ?? units[0]?.id ?? null,
  );
  const [galleryIndex, setGalleryIndex] = useState(0);

  useEffect(() => {
    if (focusUnitId && units.some((u) => u.id === focusUnitId)) {
      setSelectedUnitId(focusUnitId);
      setScreen(initialScreen);
    }
  }, [focusUnitId, initialScreen, units]);

  useEffect(() => {
    if (!units.length) {
      setSelectedUnitId(null);
      return;
    }
    if (!units.some((u) => u.id === selectedUnitId)) {
      setSelectedUnitId(units[0]!.id);
    }
  }, [units, selectedUnitId]);

  useEffect(() => {
    setGalleryIndex(0);
  }, [selectedUnitId, screen]);

  const selectedUnit = useMemo(() => {
    if (!units.length) return null;
    return units.find((u) => u.id === selectedUnitId) ?? units[0]!;
  }, [units, selectedUnitId]);

  const displayNetwork = networkName.trim() || 'Sua rede';

  const openUnitDetail = () => {
    if (!selectedUnit) return;
    setScreen('unit');
  };

  const galleryLength = selectedUnit ? memberAppGalleryPhotos(selectedUnit).length : 0;

  const cycleGallery = (delta: number) => {
    if (!galleryLength) return;
    setGalleryIndex((i) => (i + delta + galleryLength) % galleryLength);
  };

  return (
    <div className="member-app-preview" aria-label="Prévia interativa do app Movly">
      <div className="member-app-preview-toolbar">
        <span className="member-app-preview-kicker">Prévia no app</span>
        <div className="member-app-preview-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={screen === 'network'}
            className={`member-app-preview-tab${screen === 'network' ? ' is-active' : ''}`}
            onClick={() => setScreen('network')}
          >
            Guia (lista)
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={screen === 'unit'}
            className={`member-app-preview-tab${screen === 'unit' ? ' is-active' : ''}`}
            disabled={!selectedUnit}
            onClick={() => selectedUnit && setScreen('unit')}
          >
            Rede
          </button>
        </div>
      </div>

      <div
        className={`member-app-device${
          screen === 'unit' ? ' member-app-device--iphone' : ' member-app-device--guide'
        }`}
      >
        {screen === 'unit' ? <div className="member-app-device-notch" aria-hidden /> : null}
        <div
          className={`member-app-screen${
            screen === 'network' ? ' member-app-screen--guide' : ' member-app-screen--detail'
          }`}
        >
          {screen === 'unit' ? <MemberAppStatusBarIos /> : null}

          {screen === 'network' ? (
            <>
              <div className="member-app-guide-scroll member-app-guide-scroll--list">
                <MemberAppGuideListHeader unitCount={units.length || 1} />
                {!selectedUnit ? (
                  <p className="member-app-muted member-app-empty">
                    Cadastre ao menos uma unidade para ver o card no Guia do app.
                  </p>
                ) : (
                  <>
                    {units.length > 1 ? (
                      <div className="member-app-guide-unit-picker" role="list">
                        {units.map((unit) => (
                          <button
                            key={unit.id}
                            type="button"
                            role="listitem"
                            className={`member-app-guide-unit-pill${
                              unit.id === selectedUnit.id ? ' is-active' : ''
                            }`}
                            onClick={() => setSelectedUnitId(unit.id)}
                          >
                            {memberAppUnitLabel(unit)}
                          </button>
                        ))}
                      </div>
                    ) : null}
                    <MemberAppGuideListCard
                      networkName={displayNetwork}
                      logoUrl={logoUrl}
                      unit={selectedUnit}
                      unitCount={units.length}
                      galleryIndex={galleryIndex}
                      onGalleryPrev={() => cycleGallery(-1)}
                      onGalleryNext={() => cycleGallery(1)}
                      onOpenNetwork={openUnitDetail}
                    />
                  </>
                )}
              </div>
              <MemberAppBottomNavPreview />
            </>
          ) : selectedUnit ? (
            <MemberAppNetworkDetailPreview
              networkName={displayNetwork}
              logoUrl={logoUrl}
              networkSocial={networkSocial}
              units={units}
              selectedUnitId={selectedUnit.id}
              onSelectUnit={setSelectedUnitId}
              galleryIndex={galleryIndex}
              onGalleryDot={setGalleryIndex}
              onBack={() => setScreen('network')}
            />
          ) : (
            <p className="member-app-muted member-app-empty">Nenhuma unidade selecionada.</p>
          )}
        </div>
      </div>

      <p className="member-app-preview-hint muted">
        Na aba Guia, o card é como o aluno vê na listagem. Toque em «Ver rede» para abrir a tela interna.
      </p>
      {footer !== undefined ? footer : <MemberAppGymPreviewUnitLink unitId={selectedUnit?.id} />}
    </div>
  );
}

function MemberAppStatusBarIos() {
  return (
    <div className="member-app-status member-app-status--ios" aria-hidden>
      <span className="member-app-status-time">
        {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
      </span>
      <span />
      <span className="member-app-status-icons" aria-hidden>
        ●●● ▮
      </span>
    </div>
  );
}

export function MemberAppGymPreviewUnitLink({ unitId }: { unitId: string | undefined }) {
  if (!unitId) return null;
  return (
    <p className="member-app-preview-footer">
      <Link to={`/unidades/${encodeURIComponent(unitId)}`}>Editar esta unidade no portal</Link>
    </p>
  );
}