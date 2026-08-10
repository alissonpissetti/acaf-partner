import { useEffect, useRef, useState } from 'react';
import { lookupZip } from '../api/client';
import {
  BRAZILIAN_STATES,
  formatZip,
  type UnitAddressForm,
} from '../data/address';

type Props = {
  value: UnitAddressForm;
  onChange: (patch: Partial<UnitAddressForm>) => void;
  disabled?: boolean;
  embedded?: boolean;
};

export function UnitAddressFields({ value, onChange, disabled = false, embedded = false }: Props) {
  const [cepBusy, setCepBusy] = useState(false);
  const [cepError, setCepError] = useState('');
  const lastLookup = useRef('');

  const patch = (fields: Partial<UnitAddressForm>) => {
    onChange(fields);
  };

  useEffect(() => {
    const digits = value.zip.replace(/\D/g, '');
    if (digits.length !== 8 || digits === lastLookup.current) return;

    const timer = window.setTimeout(async () => {
      lastLookup.current = digits;
      setCepBusy(true);
      setCepError('');
      try {
        const result = await lookupZip(digits);
        patch({
          zip: result.zip,
          address: result.address,
          neighborhood: result.neighborhood,
          city: result.city,
          state: result.uf || value.state,
        });
      } catch (err) {
        setCepError(err instanceof Error ? err.message : 'CEP não encontrado.');
      } finally {
        setCepBusy(false);
      }
    }, 350);

    return () => window.clearTimeout(timer);
  }, [value.zip, value.state]);

  const setField = (field: keyof UnitAddressForm, next: string) => {
    patch({ [field]: next });
  };

  const fields = (
    <div className="form-grid form-grid-2 unit-address-fields">
      <div className="field">
        <label htmlFor="unit-zip">CEP</label>
        <input
          id="unit-zip"
          value={value.zip}
          onChange={(e) => setField('zip', formatZip(e.target.value))}
          placeholder="00000-000"
          inputMode="numeric"
          disabled={disabled || cepBusy}
        />
        {cepBusy ? <small className="field-hint">Buscando CEP…</small> : null}
        {cepError ? <small className="field-hint field-hint-error">{cepError}</small> : null}
      </div>

      <div className="field">
        <label htmlFor="unit-state">UF</label>
        <select
          id="unit-state"
          value={value.state}
          onChange={(e) => setField('state', e.target.value)}
          disabled={disabled}
        >
          <option value="">Selecione</option>
          {BRAZILIAN_STATES.map((uf) => (
            <option key={uf} value={uf}>
              {uf}
            </option>
          ))}
        </select>
      </div>

      <div className="field unit-address-span-2">
        <label htmlFor="unit-address">Logradouro</label>
        <input
          id="unit-address"
          value={value.address}
          onChange={(e) => setField('address', e.target.value)}
          placeholder="Rua, avenida…"
          disabled={disabled}
        />
      </div>

      <div className="field">
        <label htmlFor="unit-number">Número</label>
        <input
          id="unit-number"
          value={value.number}
          onChange={(e) => setField('number', e.target.value)}
          placeholder="123"
          disabled={disabled}
        />
      </div>

      <div className="field">
        <label htmlFor="unit-complement">Complemento</label>
        <input
          id="unit-complement"
          value={value.complement}
          onChange={(e) => setField('complement', e.target.value)}
          placeholder="Sala, bloco…"
          disabled={disabled}
        />
      </div>

      <div className="field">
        <label htmlFor="unit-neighborhood">Bairro</label>
        <input
          id="unit-neighborhood"
          value={value.neighborhood}
          onChange={(e) => setField('neighborhood', e.target.value)}
          disabled={disabled}
        />
      </div>

      <div className="field">
        <label htmlFor="unit-city">Cidade</label>
        <input
          id="unit-city"
          value={value.city}
          onChange={(e) => setField('city', e.target.value)}
          disabled={disabled}
        />
      </div>
    </div>
  );

  if (embedded) {
    return <div className="unit-address-fields-embedded">{fields}</div>;
  }

  return (
    <div className="unit-address-fields">
      <h2 className="section-title">Endereço</h2>
      {fields}
    </div>
  );
}
