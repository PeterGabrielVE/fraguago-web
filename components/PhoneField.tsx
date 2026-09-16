'use client';

import { useEffect, useState } from 'react';

const phonePrefixes = ['0414', '0424', '0416', '0426', '0412', '0422'];

export function isValidPhone(value: string) {
  if (!value) return true;
  const digits = value.replace(/\D/g, '');
  const matchingPrefix = phonePrefixes.find((prefix) => digits.startsWith(prefix));
  return matchingPrefix ? digits.length === matchingPrefix.length + 7 : digits.length > 0;
}

function splitPhone(value: string) {
  const digits = value.replace(/\D/g, '');
  if (!digits) return { mode: 'empty', prefix: '', number: '' };

  const prefix = phonePrefixes.find((option) => digits.startsWith(option));

  return prefix
    ? { mode: 'local', prefix, number: digits.slice(prefix.length, prefix.length + 7) }
    : { mode: 'foreign', prefix: '', number: digits };
}

export default function PhoneField({
  value,
  onChange,
  required = false,
  className = '',
}: {
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  className?: string;
}) {
  const [mode, setMode] = useState(() => splitPhone(value).mode);
  const [prefix, setPrefix] = useState(() => splitPhone(value).prefix);
  const [number, setNumber] = useState(() => splitPhone(value).number);

  useEffect(() => {
    const next = splitPhone(value);
    setMode(next.mode);
    setPrefix(next.prefix);
    setNumber(next.number);
  }, [value]);

  function updateLocalNumber(nextNumber: string) {
    const digits = nextNumber.replace(/\D/g, '').slice(0, 7);
    setNumber(digits);
    onChange(`${prefix}${digits}`);
  }

  function updateForeignNumber(nextNumber: string) {
    const digits = nextNumber.replace(/\D/g, '');
    setNumber(digits);
    onChange(digits);
  }

  function changeMode(nextMode: string) {
    if (!nextMode) {
      setMode('empty');
      setPrefix('');
      setNumber('');
      onChange('');
      return;
    }

    if (nextMode === 'foreign') {
      setMode('foreign');
      setPrefix('');
      setNumber(value.replace(/\D/g, ''));
      onChange(value.replace(/\D/g, ''));
      return;
    }

    setMode('local');
    setPrefix(nextMode);
    setNumber('');
    onChange(nextMode);
  }

  return (
    <div className={`flex gap-2 ${className}`}>
      <select
        value={mode === 'foreign' ? 'foreign' : prefix}
        onChange={(event) => changeMode(event.target.value)}
        aria-label="Código telefónico"
        className="w-32 shrink-0 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
      >
        <option value="">Selecciona...</option>
        {phonePrefixes.map((option) => <option key={option} value={option}>{option}</option>)}
        <option value="foreign">Extranjero</option>
      </select>
      <input
        type="text"
        inputMode="numeric"
        pattern={mode === 'foreign' ? '[0-9]+' : '[0-9]{7}'}
        title={mode === 'foreign' ? 'Ingresa solo números' : 'Ingresa exactamente 7 dígitos'}
        maxLength={mode === 'foreign' ? undefined : 7}
        disabled={mode === 'empty'}
        required={required}
        value={number}
        onChange={(event) => mode === 'foreign' ? updateForeignNumber(event.target.value) : updateLocalNumber(event.target.value)}
        placeholder={mode === 'foreign' ? 'Número completo' : '7 dígitos'}
        aria-label="Número telefónico"
        className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
      />
    </div>
  );
}