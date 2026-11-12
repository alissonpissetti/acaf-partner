import { useCallback, useEffect, useId, useRef, useState } from 'react';
import Cropper, { type Area } from 'react-easy-crop';
import 'react-easy-crop/react-easy-crop.css';
import {
  fetchImageObjectUrl,
  getCroppedNetworkLogoFile,
  revokeObjectUrl,
  validateNetworkLogoFile,
} from '../lib/networkLogoCrop';
import '../pages/NetworkEditPage.css';
import './NetworkLogoUploadRow.css';

const ACCEPT = 'image/png,image/jpeg,image/webp';

type Props = {
  logoUrl: string | null;
  disabled?: boolean;
  onUpload: (file: File) => Promise<void>;
  onLocalError?: (message: string) => void;
};

export function NetworkLogoUploadRow({ logoUrl, disabled = false, onUpload, onLocalError }: Props) {
  const inputId = useId();
  const zoomId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const cropSourceRef = useRef<'file' | 'server' | null>(null);

  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [pendingName, setPendingName] = useState<string | undefined>();
  const [pendingMime, setPendingMime] = useState<string | undefined>();
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [inlineMessage, setInlineMessage] = useState<string | null>(null);

  const reportError = (message: string) => {
    onLocalError?.(message);
  };

  const resetCropInteraction = useCallback(() => {
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
  }, []);

  const onCropComplete = useCallback((_area: Area, areaPixels: Area) => {
    setCroppedAreaPixels(areaPixels);
  }, []);

  const replaceCropSrc = useCallback((next: string | null) => {
    setCropSrc((prev) => {
      revokeObjectUrl(prev);
      return next;
    });
  }, []);

  useEffect(() => {
    return () => {
      setCropSrc((prev) => {
        revokeObjectUrl(prev);
        return null;
      });
    };
  }, []);

  useEffect(() => {
    if (cropSourceRef.current === 'file') return;

    let cancelled = false;

    const syncFromServer = async () => {
      if (!logoUrl) {
        replaceCropSrc(null);
        cropSourceRef.current = null;
        return;
      }

      setPreparing(true);
      setInlineMessage(null);
      try {
        const url = await fetchImageObjectUrl(logoUrl);
        if (cancelled) {
          revokeObjectUrl(url);
          return;
        }
        replaceCropSrc(url);
        setPendingName('logo');
        setPendingMime(undefined);
        cropSourceRef.current = 'server';
        resetCropInteraction();
      } catch {
        if (!cancelled) {
          replaceCropSrc(null);
          cropSourceRef.current = null;
        }
      } finally {
        if (!cancelled) setPreparing(false);
      }
    };

    void syncFromServer();
    return () => {
      cancelled = true;
    };
  }, [logoUrl, replaceCropSrc, resetCropInteraction]);

  const openCropFromFile = (file: File) => {
    const validation = validateNetworkLogoFile(file);
    if (validation) {
      reportError(validation);
      return;
    }
    replaceCropSrc(URL.createObjectURL(file));
    setPendingName(file.name);
    setPendingMime(file.type);
    cropSourceRef.current = 'file';
    resetCropInteraction();
    setInlineMessage(null);
  };

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
      const file = await getCroppedNetworkLogoFile(cropSrc, croppedAreaPixels, {
        fileName: pendingName,
        mimeType: pendingMime,
      });
      cropSourceRef.current = null;
      await onUpload(file);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Não foi possível enviar a logo.';
      setInlineMessage(message);
    } finally {
      setUploading(false);
    }
  };

  const locked = disabled || preparing || uploading;
  const canAdjust = Boolean(cropSrc);
  const showStaticPreview = !cropSrc && logoUrl;

  return (
    <div className="network-edit-logo-row">
      <div
        className={`network-edit-logo-preview${canAdjust ? ' network-edit-logo-preview--crop' : ''}`}
      >
        {canAdjust ? (
          <Cropper
            image={cropSrc!}
            crop={crop}
            zoom={zoom}
            aspect={1}
            cropShape="rect"
            showGrid={false}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
          />
        ) : showStaticPreview ? (
          // eslint-disable-next-line jsx-a11y/img-redundant-alt
          <img src={logoUrl} alt="Logo da rede" className="network-edit-logo-img" />
        ) : (
          <span className="network-edit-logo-placeholder">
            {preparing ? 'Carregando…' : 'Sem logo'}
          </span>
        )}
      </div>

      <div className="network-logo-inline-controls">
        {canAdjust ? (
          <>
            <label className="network-logo-inline-zoom-label" htmlFor={zoomId}>
              Zoom
            </label>
            <input
              id={zoomId}
              type="range"
              min={1}
              max={3}
              step={0.02}
              value={zoom}
              disabled={locked}
              className="network-logo-inline-zoom"
              onChange={(ev) => setZoom(Number(ev.target.value))}
            />
            <p className="network-logo-inline-hint">Arraste a prévia para posicionar a marca.</p>
          </>
        ) : null}

        <div className="network-logo-inline-actions">
          <label className="network-edit-file-label" htmlFor={inputId}>
            <input
              ref={inputRef}
              id={inputId}
              type="file"
              accept={ACCEPT}
              onChange={onFileChange}
              disabled={locked}
              className="network-edit-file-input"
            />
            <span className="btn btn-secondary">Enviar logo</span>
          </label>
          {canAdjust ? (
            <button
              type="button"
              className="btn btn-primary"
              disabled={locked || !croppedAreaPixels}
              onClick={() => void onConfirmCrop()}
            >
              {uploading ? 'Salvando…' : 'Confirmar upload'}
            </button>
          ) : null}
          <p className="network-edit-hint-muted">PNG, JPG ou WEBP · até 2 MB</p>
        </div>

        {inlineMessage ? (
          <p className="network-logo-inline-hint network-logo-inline-hint--warn" role="status">
            {inlineMessage}
          </p>
        ) : null}
      </div>
    </div>
  );
}
