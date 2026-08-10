import { useRef } from 'react';
import {
  payoutMethodSummary,
  pixKeyTypeLabel,
  type PayoutMethod,
  type PixKeyType,
} from '../data/payoutMethods';
import './PixDestinationField.css';

export const NEW_PIX_OPTION = '__new_pix__';

const PIX_KEY_TYPES: PixKeyType[] = ['cpf', 'cnpj', 'email', 'phone', 'evp'];

export type PixDraft = {
  pixKeyType: PixKeyType;
  pixKey: string;
  holderName: string;
};

type PixDestinationFieldProps = {
  methods: PayoutMethod[];
  mode: 'select' | 'new';
  selectedMethodId: string;
  draft: PixDraft;
  disabled?: boolean;
  id?: string;
  onModeChange: (mode: 'select' | 'new') => void;
  onSelectMethod: (id: string) => void;
  onDraftChange: (draft: PixDraft) => void;
};

export function PixDestinationField({
  methods,
  mode,
  selectedMethodId,
  draft,
  disabled = false,
  id,
  onModeChange,
  onSelectMethod,
  onDraftChange,
}: PixDestinationFieldProps) {
  const cancelRef = useRef(false);

  const cancelNew = () => {
    onDraftChange({ pixKeyType: 'cpf', pixKey: '', holderName: '' });
    onModeChange('select');
    if (methods[0]) onSelectMethod(methods[0].id);
  };

  if (mode === 'new') {
    return (
      <div className="pix-destination-field">
        <div className="pix-destination-new-grid">
          <div className="field">
            <label htmlFor={id ? `${id}-type` : 'pix-draft-type'}>Tipo</label>
            <select
              id={id ? `${id}-type` : 'pix-draft-type'}
              className="pix-destination-input"
              value={draft.pixKeyType}
              disabled={disabled}
              onChange={(ev) =>
                onDraftChange({ ...draft, pixKeyType: ev.target.value as PixKeyType, pixKey: '' })
              }
            >
              {PIX_KEY_TYPES.map((type) => (
                <option key={type} value={type}>
                  {pixKeyTypeLabel(type)}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor={id ? `${id}-holder` : 'pix-draft-holder'}>Titular</label>
            <input
              id={id ? `${id}-holder` : 'pix-draft-holder'}
              type="text"
              className="pix-destination-input"
              value={draft.holderName}
              placeholder="Nome no banco"
              disabled={disabled}
              onChange={(ev) => onDraftChange({ ...draft, holderName: ev.target.value })}
            />
          </div>
          <div className="field pix-destination-key-field">
            <label htmlFor={id ? `${id}-key` : 'pix-draft-key'}>Chave Pix</label>
            <div className="pix-destination-append">
              <input
                id={id ? `${id}-key` : 'pix-draft-key'}
                type="text"
                className="pix-destination-input pix-destination-append-input"
                value={draft.pixKey}
                placeholder={
                  draft.pixKeyType === 'email'
                    ? 'email@exemplo.com'
                    : draft.pixKeyType === 'evp'
                      ? 'Chave aleatória'
                      : 'Somente números'
                }
                disabled={disabled}
                autoFocus
                onChange={(ev) => onDraftChange({ ...draft, pixKey: ev.target.value })}
              />
              {methods.length > 0 ? (
                <button
                  type="button"
                  className="btn btn-secondary pix-destination-append-cancel"
                  disabled={disabled}
                  aria-label="Voltar às chaves salvas"
                  onMouseDown={() => {
                    cancelRef.current = true;
                  }}
                  onClick={cancelNew}
                >
                  ×
                </button>
              ) : null}
            </div>
          </div>
        </div>
        <p className="pix-destination-new-hint">
          A chave será salva ao registrar o saque e ficará disponível nas próximas solicitações.
        </p>
      </div>
    );
  }

  return (
    <select
      id={id}
      className="withdrawals-select pix-destination-select"
      value={selectedMethodId}
      disabled={disabled}
      onChange={(ev) => {
        const next = ev.target.value;
        if (next === NEW_PIX_OPTION) {
          onDraftChange({ pixKeyType: 'cpf', pixKey: '', holderName: '' });
          onModeChange('new');
          return;
        }
        onSelectMethod(next);
      }}
    >
      {methods.length === 0 ? (
        <option value="">Nenhuma chave salva</option>
      ) : null}
      {methods.map((m) => (
        <option key={m.id} value={m.id}>
          {payoutMethodSummary(m)}
        </option>
      ))}
      <option value={NEW_PIX_OPTION}>Nova chave…</option>
    </select>
  );
}
