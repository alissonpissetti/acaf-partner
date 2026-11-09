import { Link } from 'react-router-dom';
import { payoutMethodSummary, type PayoutMethod } from '../data/payoutMethods';
import './PixDestinationField.css';

type PixDestinationFieldProps = {
  methods: PayoutMethod[];
  selectedMethodId: string;
  disabled?: boolean;
  id?: string;
  onSelectMethod: (id: string) => void;
};

/**
 * Apenas chaves já cadastradas em Chaves Pix — não cria chave nova neste fluxo.
 */
export function PixDestinationField({
  methods,
  selectedMethodId,
  disabled = false,
  id,
  onSelectMethod,
}: PixDestinationFieldProps) {
  if (methods.length === 0) {
    return (
      <div className="pix-destination-field pix-destination-empty" id={id}>
        <p className="pix-destination-empty-text">
          Nenhuma chave cadastrada. Cadastre em{' '}
          <Link to="/financeiro/chaves-pix">Chaves Pix</Link> antes de solicitar um saque.
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
      onChange={(ev) => onSelectMethod(ev.target.value)}
    >
      {methods.map((m) => (
        <option key={m.id} value={m.id}>
          {payoutMethodSummary(m)}
        </option>
      ))}
    </select>
  );
}
