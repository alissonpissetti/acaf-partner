import { useEffect, useId, type ReactNode } from 'react';
import './Modal.css';

type Props = {
  open: boolean;
  title?: string;
  onClose: () => void;
  children: ReactNode;
};

export function Modal({ open, title, onClose, children }: Props) {
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="modal-root" role="presentation">
      <button type="button" className="modal-backdrop" aria-label="Fechar" onClick={onClose} />
      <div
        className="modal-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
      >
        <div className="modal-header">
          {title ? (
            <h2 id={titleId} className="modal-title">
              {title}
            </h2>
          ) : null}
          <button type="button" className="modal-close" aria-label="Fechar" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}
