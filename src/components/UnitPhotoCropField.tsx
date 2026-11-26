import { useCallback, useEffect, useId, useRef, useState } from 'react';
import Cropper, { type Area, type MediaSize } from 'react-easy-crop';
import 'react-easy-crop/react-easy-crop.css';
import {
  fetchImageObjectUrl,
  revokeObjectUrl,
  validateImageUploadFile,
} from '../lib/networkLogoCrop';
import { getCroppedUnitPhotoFile, UNIT_PHOTO_HERO_ASPECT, UNIT_PHOTO_MAX_BYTES } from '../lib/unitPhotoCrop';
import './UnitPhotoCropField.css';

const ACCEPT = 'image/png,image/jpeg,image/webp';

type Props = {
  savedPhotoUrl: string | null;
  aspect?: number;
  previewClassName?: string;
  disabled?: boolean;
  pickLabel?: string;
  adjustLabel?: string;
  hint?: string;
  /** Abre o recorte ao montar (fila da galeria ou modal). */
  bootFile?: File | null;
  bootRemoteUrl?: string | null;
  hidePickControls?: boolean;
  onCancel?: () => void;
  onConfirmUpload: (file: File) => Promise<void>;
};

export function UnitPhotoCropField({
  savedPhotoUrl,
  aspect = UNIT_PHOTO_HERO_ASPECT,
  previewClassName = 'unit-photo-preview hero',
  disabled = false,
  pickLabel = 'Enviar foto',
  adjustLabel = 'Ajustar enquadramento',
  hint = 'Arraste para enquadrar (para ver o topo, arraste para cima). O recorte segue a capa 16:9 do app.',
  bootFile = null,
  bootRemoteUrl = null,
  hidePickControls = false,
  onCancel,
  onConfirmUpload,
}: Props) {
  const inputId = useId();
  const zoomId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const cropSourceRef = useRef<'file' | 'server' | null>(null);

  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [pendingName, setPendingName] = useState<string | undefined>();
  const [pendingMime, setPendingMime] = useState<string | undefined>();
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [minZoom, setMinZoom] = useState(0.5);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [inlineMessage, setInlineMessage] = useState<string | null>(null);

  const resetCropInteraction = useCallback(() => {
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setMinZoom(0.5);
    setCroppedAreaPixels(null);
  }, []);

  const onMediaLoaded = useCallback(
    (_media: MediaSize) => {
      setMinZoom(0.5);
      setZoom(1);
      setCrop({ x: 0, y: 0 });
      setCroppedAreaPixels(null);
    },
    [],
  );

  const onCropComplete = useCallback((_area: Area, areaPixels: Area) => {
    setCroppedAreaPixels(areaPixels);
  }, []);

  const replaceCropSrc = useCallback((next: string | null) => {
    setCropSrc((prev) => {
      revokeObjectUrl(prev);
      return next;
    });
  }, []);

  const exitCropMode = useCallback(() => {
    cropSourceRef.current = null;
    replaceCropSrc(null);
    resetCropInteraction();
    setInlineMessage(null);
  }, [replaceCropSrc, resetCropInteraction]);

  useEffect(() => {
    return () => {
      setCropSrc((prev) => {
        revokeObjectUrl(prev);
        return null;
      });
    };
  }, []);

  const openCropFromFile = (file: File) => {
    const validation = validateImageUploadFile(file, UNIT_PHOTO_MAX_BYTES);
    if (validation) {
      setInlineMessage(validation);
      return;
    }
    replaceCropSrc(URL.createObjectURL(file));
    setPendingName(file.name);
    setPendingMime(file.type);
    cropSourceRef.current = 'file';
    resetCropInteraction();
    setInlineMessage(null);
  };

  const openCropFromRemote = async (remoteUrl: string) => {
    if (preparing) return;
    setPreparing(true);
    setInlineMessage(null);
    try {
      const url = await fetchImageObjectUrl(remoteUrl);
      replaceCropSrc(url);
      setPendingName('unit-photo');
      setPendingMime(undefined);
      cropSourceRef.current = 'server';
      resetCropInteraction();
    } catch (e) {
      setInlineMessage(e instanceof Error ? e.message : 'Não foi possível carregar a foto.');
    } finally {
      setPreparing(false);
    }
  };

  const openCropFromSaved = () => {
    if (!savedPhotoUrl) return;
    void openCropFromRemote(savedPhotoUrl);
  };

  useEffect(() => {
    if (bootFile) {
      openCropFromFile(bootFile);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- boot once per file
  }, [bootFile]);

  useEffect(() => {
    if (bootRemoteUrl) {
      void openCropFromRemote(bootRemoteUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- boot once per url
  }, [bootRemoteUrl]);

  const onFileChange = (ev: React.ChangeEvent<HTMLInputElement>) => {
    const file = ev.target.files?.[0];
    ev.target.value = '';
    if (!file) return;
    openCropFromFile(file);
  };

  const onConfirmCrop = async () => {
    if (!cropSrc || !croppedAreaPixels || uploading) return;
    setUploading(true);
    setInlineMessage(null);
    try {
      const file = await getCroppedUnitPhotoFile(cropSrc, croppedAreaPixels, {
        fileName: pendingName,
        mimeType: pendingMime,
      });
      cropSourceRef.current = null;
      await onConfirmUpload(file);
      exitCropMode();
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Não foi possível salvar a foto.';
      setInlineMessage(message);
    } finally {
      setUploading(false);
    }
  };

  const locked = disabled || preparing || uploading;
  const inCropMode = Boolean(cropSrc);
  const showStatic = !inCropMode && savedPhotoUrl;

  return (
    <div className="unit-photo-crop-field">
      <div
        className={
          inCropMode
            ? 'unit-photo-crop-preview unit-photo-crop-preview--crop'
            : `unit-photo-crop-preview ${previewClassName}`
        }
      >
        {inCropMode ? (
          <div className="unit-photo-crop-stage">
            <Cropper
              key={cropSrc}
              image={cropSrc!}
              crop={crop}
              zoom={zoom}
              minZoom={minZoom}
              maxZoom={4}
              aspect={aspect}
              cropShape="rect"
              showGrid
              objectFit="cover"
              restrictPosition
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
              onMediaLoaded={onMediaLoaded}
              style={{ containerStyle: { width: '100%', height: '100%' } }}
            />
          </div>
        ) : showStatic ? (
          <img src={savedPhotoUrl} alt="" />
        ) : (
          <span className="unit-photo-placeholder">{preparing ? 'Carregando…' : 'Sem foto'}</span>
        )}
      </div>

      {inCropMode ? (
        <div className="unit-photo-crop-controls">
          <label className="unit-photo-crop-zoom-label" htmlFor={zoomId}>
            Zoom
          </label>
          <input
            id={zoomId}
            type="range"
            min={minZoom}
            max={4}
            step={0.02}
            value={zoom}
            disabled={locked}
            className="unit-photo-crop-zoom"
            onChange={(ev) => setZoom(Number(ev.target.value))}
          />
          <p className="unit-photo-crop-hint">{hint}</p>
          <div className="unit-photo-crop-actions">
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              disabled={locked}
              onClick={() => {
                exitCropMode();
                onCancel?.();
              }}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              disabled={locked || !croppedAreaPixels}
              onClick={() => void onConfirmCrop()}
            >
              {uploading ? 'Salvando…' : 'Confirmar recorte'}
            </button>
          </div>
        </div>
      ) : hidePickControls ? null : (
        <div className="unit-photo-actions">
          <label className="unit-photo-file-label" htmlFor={inputId}>
            <input
              ref={inputRef}
              id={inputId}
              type="file"
              accept={ACCEPT}
              onChange={onFileChange}
              disabled={locked}
              className="unit-photo-file-input"
            />
            <span className="btn btn-secondary btn-sm">{savedPhotoUrl ? 'Enviar outra' : pickLabel}</span>
          </label>
          {savedPhotoUrl ? (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              disabled={locked}
              onClick={() => void openCropFromSaved()}
            >
              {adjustLabel}
            </button>
          ) : null}
        </div>
      )}

      {inlineMessage ? (
        <p className="unit-photo-crop-error" role="alert">
          {inlineMessage}
        </p>
      ) : null}
    </div>
  );
}