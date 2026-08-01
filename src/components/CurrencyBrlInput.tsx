import { useEffect, useRef, useState } from 'react';
import { amountFromDigitStream, clampAmount, formatBrlInputDigits, parseBrlInput } from '../data/currencyInput';
import './CurrencyBrlInput.css';

type Props = {
  id?: string;
  label: string;
  hint?: string;
  value: number;
  min: number;
  max: number;
  disabled?: boolean;
  onChange: (value: number) => void;
};

export function CurrencyBrlInput({ id, label, hint, value, min, max, disabled, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [focused, setFocused] = useState(false);
  const [text, setText] = useState(() => formatBrlInputDigits(value));

  useEffect(() => {
    if (!focused) {
      setText(formatBrlInputDigits(clampAmount(value, min, max)));
    }
  }, [value, min, max, focused]);

  const commit = (raw: string, blur = false) => {
    const parsed = parseBrlInput(raw);
    const next = clampAmount(parsed, min, max);
    onChange(next);
    setText(formatBrlInputDigits(next));
    if (blur) setFocused(false);
  };

  const onInputChange = (raw: string) => {
    const digits = raw.replace(/\D/g, '').slice(0, 4);
    const amount = amountFromDigitStream(digits);
    const next = clampAmount(amount, min, max);
    setText(formatBrlInputDigits(next));
    onChange(next);
  };

  const onBlur = () => {
    commit(text, true);
  };

  const onFocus = () => {
    setFocused(true);
    requestAnimationFrame(() => inputRef.current?.select());
  };

  const atMin = value <= min + 0.001;
  const atMax = value >= max - 0.001;

  const nudge = (delta: number) => {
    const next = clampAmount(value + delta, min, max);
    onChange(next);
    setText(formatBrlInputDigits(next));
  };

  return (
    <div className="currency-brl-field">
      <label className="currency-brl-label" htmlFor={id}>
        {label}
      </label>
      {hint && <p className="currency-brl-hint">{hint}</p>}
      <div className={`currency-brl-control ${focused ? 'focused' : ''} ${disabled ? 'disabled' : ''}`}>
        <span className="currency-brl-prefix" aria-hidden="true">
          R$
        </span>
        <input
          ref={inputRef}
          id={id}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          disabled={disabled}
          className="currency-brl-input"
          value={text}
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={value}
          onFocus={onFocus}
          onBlur={onBlur}
          onChange={(e) => onInputChange(e.target.value)}
        />
        <div className="currency-brl-steppers">
          <button
            type="button"
            className="currency-brl-step"
            disabled={disabled || atMin}
            aria-label="Diminuir um real"
            onClick={() => nudge(-1)}
          >
            −
          </button>
          <button
            type="button"
            className="currency-brl-step"
            disabled={disabled || atMax}
            aria-label="Aumentar um real"
            onClick={() => nudge(1)}
          >
            +
          </button>
        </div>
      </div>
      <p className="currency-brl-range">
        Faixa permitida:{' '}
        {min.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} –{' '}
        {max.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
      </p>
    </div>
  );
}
