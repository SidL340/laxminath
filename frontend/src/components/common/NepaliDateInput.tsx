'use client';

import React, { useRef } from 'react';
import { formatDateInput, toEnglishDigits } from '@/lib/nepali-date';

interface NepaliDateInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
}

export default function NepaliDateInput({
  value,
  onChange,
  className = '',
  placeholder = 'YYYY-MM-DD (e.g. 2081-05-15)',
  ...rest
}: NepaliDateInputProps) {
  const prevValRef = useRef<string>(value || '');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const formatted = formatDateInput(raw, prevValRef.current);
    prevValRef.current = formatted;
    onChange(formatted);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Record current value prior to keypress for backspace detection
    prevValRef.current = value || '';
  };

  return (
    <input
      type="text"
      data-date-input="true"
      value={value || ''}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      placeholder={placeholder}
      maxLength={10}
      className={`font-mono ${className}`}
      {...rest}
    />
  );
}
