import { useEffect, useRef, useState } from 'react';
import './InstructorField.css';

const NEW_OPTION = '__new__';

type InstructorFieldProps = {
  value: string;
  instructors: string[];
  onChange: (name: string) => void;
  onRegister?: (name: string) => void;
  disabled?: boolean;
  id?: string;
};

export function InstructorField({
  value,
  instructors,
  onChange,
  onRegister,
  disabled = false,
  id,
}: InstructorFieldProps) {
  const trimmed = value.trim();
  const inList = trimmed
    ? instructors.some((n) => n.toLowerCase() === trimmed.toLowerCase())
    : false;

  const [mode, setMode] = useState<'select' | 'new'>(() =>
    trimmed && !inList ? 'new' : 'select',
  );
  const [draft, setDraft] = useState(trimmed);
  const cancelRef = useRef(false);

  useEffect(() => {
    const nextTrimmed = value.trim();
    const listed = nextTrimmed
      ? instructors.some((n) => n.toLowerCase() === nextTrimmed.toLowerCase())
      : false;
    setDraft(nextTrimmed);
    if (!nextTrimmed) {
      setMode('select');
    } else if (!listed) {
      setMode('new');
    } else {
      setMode('select');
    }
  }, [value, instructors]);

  const commitNew = () => {
    const name = draft.trim();
    if (!name) {
      onChange('');
      setMode('select');
      return;
    }
    onRegister?.(name);
    onChange(name);
    setMode('select');
  };

  const cancelNew = () => {
    setDraft(value);
    setMode('select');
  };

  if (mode === 'new') {
    return (
      <div className="instructor-field-append">
        <input
          id={id}
          type="text"
          className="instructor-field-append-input"
          value={draft}
          placeholder="Nome do professor"
          disabled={disabled}
          autoFocus
          onChange={(ev) => setDraft(ev.target.value)}
          onKeyDown={(ev) => {
            if (ev.key === 'Enter') {
              ev.preventDefault();
              commitNew();
            }
            if (ev.key === 'Escape') {
              ev.preventDefault();
              cancelNew();
            }
          }}
          onBlur={() => {
            if (cancelRef.current) {
              cancelRef.current = false;
              return;
            }
            commitNew();
          }}
        />
        <button
          type="button"
          className="btn btn-secondary instructor-field-append-cancel"
          disabled={disabled}
          aria-label="Cancelar novo professor"
          onMouseDown={() => {
            cancelRef.current = true;
          }}
          onClick={cancelNew}
        >
          ×
        </button>
      </div>
    );
  }

  const selectValue = inList ? trimmed : '';

  return (
    <select
      id={id}
      value={selectValue}
      disabled={disabled}
      onChange={(ev) => {
        const next = ev.target.value;
        if (next === NEW_OPTION) {
          setDraft('');
          setMode('new');
          return;
        }
        onChange(next);
      }}
    >
      <option value="">Selecione…</option>
      {instructors.map((name) => (
        <option key={name} value={name}>
          {name}
        </option>
      ))}
      <option value={NEW_OPTION}>Novo…</option>
    </select>
  );
}
