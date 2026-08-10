import { useEffect, useRef, useState } from 'react';
import {
  amountFromDigitStream,
  formatBrlInputDigits,
  FREE_BRL_INPUT_MAX_DIGITS,
  maxDigitsForAmount,
  parseBrlInput,
  roundBrlAmount,
} from '../data/currencyInput';
import './CurrencyBrlInput.css';

type Props = {
  id?: string;
  label: string;
  hint?: string;
  value: number;
  min?: number;
  max?: number;
  disabled?: boolean;
  showSteppers?: boolean;
  showRange?: boolean;
  step?: number;
  onChange: (value: number) => void;
};

export function CurrencyBrlInput({
  id,
  label,
  hint,
  value,
  min,
  max,
  disabled,
  showSteppers = false,
  showRange,
  step = 1,
  onChange,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [focused, setFocused] = useState(false);
  const [text, setText] = useState(() => formatBrlInputDigits(value));
  const hasBounds = min != null || max != null;
  const showRangeHint = showRange ?? hasBounds;

  useEffect(() => {
    if (!focused) {
      setText(formatBrlInputDigits(roundBrlAmount(value)));
    }
  }, [value, focused]);

  const finalize = (raw: string) => {
    let next = roundBrlAmount(parseBrlInput(raw));
    if (min != null) next = Math.max(min, next);
    if (max != null) next = Math.min(max, next);
    return next;
  };

  const onInputChange = (raw: string) => {
    const digitLimit =
      max != null ? maxDigitsForAmount(max) : FREE_BRL_INPUT_MAX_DIGITS;
    const digits = raw.replace(/\D/g, '').slice(0, digitLimit);
    const amount = amountFromDigitStream(digits);
    setText(formatBrlInputDigits(amount));
    onChange(amount);
  };

  const onBlur = () => {
    const next = finalize(text);
    onChange(next);
    setText(formatBrlInputDigits(next));
    setFocused(false);
  };

  const onFocus = () => {
    setFocused(true);
    requestAnimationFrame(() => inputRef.current?.select());
  };

  const atMin = min != null && value <= min + 0.001;
  const atMax = max != null && value >= max - 0.001;

  const nudge = (nudgeStep: number) => {
    let next = roundBrlAmount(value + nudgeStep);
    if (min != null) next = Math.max(min, next);
    if (max != null) next = Math.min(max, next);
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
          aria-valuenow={value}
          onFocus={onFocus}
          onBlur={onBlur}
          onChange={(e) => onInputChange(e.target.value)}
        />
        {showSteppers ? (
          <div className="currency-brl-steppers">
            <button
              type="button"
              className="currency-brl-step"
              disabled={disabled || atMin}
              aria-label="Diminuir um real"
              onClick={() => nudge(-step)}
            >
              −
            </button>
            <button
              type="button"
              className="currency-brl-step"
              disabled={disabled || atMax}
              aria-label="Aumentar um real"
              onClick={() => nudge(step)}
            >
              +
            </button>
          </div>
        ) : null}
      </div>
      {showRangeHint && min != null && max != null ? (
        <p className="currency-brl-range">
          Faixa permitida:{' '}
          {min.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} –{' '}
          {max.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
        </p>
      ) : null}
    </div>
  );
}
