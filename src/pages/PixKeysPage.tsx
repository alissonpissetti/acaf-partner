import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { UnitScopeBanner } from '../components/UnitSwitcher';
import {
  addPayoutMethod,
  loadPayoutMethods,
  maskPixKeyForDisplay,
  pixKeyTypeLabel,
  removePayoutMethod,
  updatePayoutMethod,
  normalizePixKeyInput,
  validatePixKey,
  type PixKeyType,
  type PayoutMethod,
} from '../data/payoutMethods';
import { useFlash } from '../flashContext';
import './PixKeysPage.css';

const PIX_KEY_TYPES: PixKeyType[] = ['cpf', 'cnpj', 'email', 'phone', 'evp'];

const emptyDraft = (): {
  pixKeyType: PixKeyType;
  pixKey: string;
  holderName: string;
  isDefault: boolean;
} => ({
  pixKeyType: 'cpf',
  pixKey: '',
  holderName: '',
  isDefault: false,
});

export function PixKeysPage() {
  const flash = useFlash();
  const [methods, setMethods] = useState<PayoutMethod[]>(() => loadPayoutMethods());
  const [draft, setDraft] = useState(emptyDraft);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formError, setFormError] = useState('');

  const editing = editingId != null;
  const sortedMethods = useMemo(
    () =>
      [...methods].sort((a, b) => {
        if (a.isDefault && !b.isDefault) return -1;
        if (!a.isDefault && b.isDefault) return 1;
        return b.createdAt.localeCompare(a.createdAt);
      }),
    [methods],
  );

  const resetForm = () => {
    setDraft(emptyDraft());
    setEditingId(null);
    setFormError('');
  };

  const startEdit = (method: PayoutMethod) => {
    setEditingId(method.id);
    setDraft({
      pixKeyType: method.pixKeyType,
      pixKey: method.pixKey,
      holderName: method.holderName,
      isDefault: method.isDefault ?? false,
    });
    setFormError('');
  };

  const submit = () => {
    setFormError('');
    const holderName = draft.holderName.trim();
    if (!holderName) {
      setFormError('Informe o nome do titular.');
      return;
    }
    const keyError = validatePixKey(draft.pixKeyType, draft.pixKey);
    if (keyError) {
      setFormError(keyError);
      return;
    }

    const normalized = normalizePixKeyInput(draft.pixKeyType, draft.pixKey);
    const duplicate = methods.some(
      (m) =>
        m.id !== editingId &&
        m.pixKeyType === draft.pixKeyType &&
        m.pixKey.toLowerCase() === normalized.toLowerCase(),
    );
    if (duplicate) {
      setFormError('Esta chave Pix já está cadastrada.');
      return;
    }

    if (editingId) {
      setMethods(
        updatePayoutMethod(methods, editingId, {
          pixKeyType: draft.pixKeyType,
          pixKey: draft.pixKey,
          holderName,
          isDefault: draft.isDefault,
        }),
      );
      flash.success('Chave Pix atualizada.');
    } else {
      setMethods(
        addPayoutMethod(methods, {
          pixKeyType: draft.pixKeyType,
          pixKey: draft.pixKey,
          holderName,
          isDefault: draft.isDefault || methods.length === 0,
        }),
      );
      flash.success('Chave Pix cadastrada.');
    }
    resetForm();
  };

  const onRemove = (id: string) => {
    if (!window.confirm('Remover esta chave Pix? Saques pendentes não serão afetados.')) return;
    setMethods(removePayoutMethod(methods, id));
    if (editingId === id) resetForm();
    flash.success('Chave Pix removida.');
  };

  const onSetDefault = (id: string) => {
    setMethods(updatePayoutMethod(methods, id, { isDefault: true }));
    flash.success('Chave padrão atualizada.');
  };

  return (
    <div className="page-stack pix-keys-page">
      <UnitScopeBanner />
      <header>
        <h1 className="page-title">Chaves Pix</h1>
        <p className="page-subtitle">
          Cadastre destinos para repasse. As chaves ficam disponíveis em{' '}
          <Link to="/financeiro/saques">Saques</Link>.
        </p>
      </header>

      <div className="card pix-keys-form-card">
        <h2 className="section-title">{editing ? 'Editar chave' : 'Nova chave Pix'}</h2>
        <div className="form-grid form-grid-2 pix-keys-form-grid">
          <div className="field">
            <label htmlFor="pix-key-type">Tipo da chave</label>
            <select
              id="pix-key-type"
              value={draft.pixKeyType}
              onChange={(ev) =>
                setDraft((prev) => ({
                  ...prev,
                  pixKeyType: ev.target.value as PixKeyType,
                  pixKey: '',
                }))
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
            <label htmlFor="pix-holder">Nome do titular</label>
            <input
              id="pix-holder"
              type="text"
              value={draft.holderName}
              placeholder="Como aparece no banco"
              onChange={(ev) => setDraft((prev) => ({ ...prev, holderName: ev.target.value }))}
            />
          </div>
          <div className="field field-span-2">
            <label htmlFor="pix-key">Chave Pix</label>
            <input
              id="pix-key"
              type="text"
              value={draft.pixKey}
              placeholder={
                draft.pixKeyType === 'email'
                  ? 'email@exemplo.com'
                  : draft.pixKeyType === 'evp'
                    ? '00000000-0000-0000-0000-000000000000'
                    : draft.pixKeyType === 'phone'
                      ? '(11) 99999-9999'
                      : 'Somente números'
              }
              onChange={(ev) => setDraft((prev) => ({ ...prev, pixKey: ev.target.value }))}
            />
          </div>
          <div className="field field-checkbox field-span-2">
            <label>
              <input
                type="checkbox"
                checked={draft.isDefault}
                onChange={(ev) => setDraft((prev) => ({ ...prev, isDefault: ev.target.checked }))}
              />
              Usar como destino padrão nos saques
            </label>
          </div>
        </div>
        {formError ? <p className="pix-keys-form-error">{formError}</p> : null}
        <div className="pix-keys-form-actions">
          <button type="button" className="btn btn-primary btn-sm" onClick={submit}>
            {editing ? 'Salvar alterações' : 'Cadastrar chave'}
          </button>
          {editing ? (
            <button type="button" className="btn btn-secondary btn-sm" onClick={resetForm}>
              Cancelar
            </button>
          ) : null}
        </div>
      </div>

      <div className="card">
        <h2 className="section-title">Chaves cadastradas</h2>
        {sortedMethods.length === 0 ? (
          <p className="pix-keys-empty">Nenhuma chave Pix cadastrada ainda.</p>
        ) : (
          <div className="table-wrap">
            <table className="data-table pix-keys-table">
              <thead>
                <tr>
                  <th>Tipo</th>
                  <th>Chave</th>
                  <th>Titular</th>
                  <th>Padrão</th>
                  <th aria-label="Ações" />
                </tr>
              </thead>
              <tbody>
                {sortedMethods.map((method) => (
                  <tr key={method.id}>
                    <td>{pixKeyTypeLabel(method.pixKeyType)}</td>
                    <td className="pix-keys-masked">
                      {maskPixKeyForDisplay(method.pixKey, method.pixKeyType)}
                    </td>
                    <td>{method.holderName}</td>
                    <td>
                      {method.isDefault ? (
                        <span className="pix-keys-default-badge">Padrão</span>
                      ) : (
                        <button
                          type="button"
                          className="btn-link"
                          onClick={() => onSetDefault(method.id)}
                        >
                          Tornar padrão
                        </button>
                      )}
                    </td>
                    <td className="pix-keys-actions">
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => startEdit(method)}
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm pix-keys-delete"
                        onClick={() => onRemove(method.id)}
                      >
                        Excluir
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
