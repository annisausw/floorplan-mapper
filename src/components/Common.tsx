/**
 * @file Common UI Components
 * @description Reusable form inputs and UI elements
 */

import React from "react";

interface PropFieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}

/**
 * PropField Component
 * Reusable input field for property editing
 */
export function PropField({
  label,
  value,
  onChange,
  placeholder,
}: PropFieldProps) {
  return (
    <div style={{ marginBottom: 10 }}>
      <label
        style={{
          display: "block",
          fontSize: 10,
          fontWeight: 700,
          color: "#94a3b8",
          textTransform: "uppercase",
          marginBottom: 4,
        }}
      >
        {label}
      </label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: "100%",
          padding: "7px 10px",
          border: "1px solid #e2e8f0",
          borderRadius: 7,
          fontSize: 13,
          outline: "none",
          color: "#1e293b",
          boxSizing: "border-box",
        }}
      />
    </div>
  );
}

interface ToolButtonProps {
  active: boolean;
  onClick?: () => void;
  children: React.ReactNode;
}

/**
 * ToolButton Component
 * Standard tool button with active state styling
 */
export function ToolButton({ active, onClick, children }: ToolButtonProps) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "6px 11px",
        borderRadius: 7,
        cursor: "pointer",
        fontWeight: 700,
        fontSize: 12,
        border: "none",
        transition: "all 0.15s",
        background: active ? "#3b82f6" : "rgba(255,255,255,0.12)",
        color: active ? "white" : "rgba(255,255,255,0.85)",
        boxShadow: active ? "0 2px 8px rgba(59,130,246,0.5)" : "none",
      }}
    >
      {children}
    </button>
  );
}

interface SelectInputProps {
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  placeholder?: string;
  style?: React.CSSProperties;
}

/**
 * SelectInput Component
 * Custom styled select dropdown
 */
export function SelectInput({
  value,
  onChange,
  options,
  placeholder,
  style,
}: SelectInputProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        flex: 1,
        padding: "6px",
        fontSize: 11,
        borderRadius: 4,
        border: "1px solid #cbd5e1",
        ...style,
      }}
    >
      {placeholder && <option value="">{placeholder}</option>}
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}

interface FileInputProps {
  id: string;
  accept: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

/**
 * FileInput Component
 * Hidden file input for cleaner integration
 */
export function FileInput({ id, accept, onChange }: FileInputProps) {
  return (
    <input id={id} type="file" accept={accept} hidden onChange={onChange} />
  );
}

interface NumberInputProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  style?: React.CSSProperties;
}

/**
 * NumberInput Component
 * Styled number input
 */
export function NumberInput({
  value,
  onChange,
  min,
  max,
  style,
}: NumberInputProps) {
  return (
    <input
      type="number"
      min={min}
      max={max}
      value={value}
      onChange={(e) => onChange(parseInt(e.target.value) || 0)}
      style={{
        width: 60,
        padding: "5px 8px",
        borderRadius: 6,
        border: "1px solid rgba(255,255,255,0.15)",
        background: "rgba(255,255,255,0.08)",
        color: "white",
        fontSize: 12,
        outline: "none",
        ...style,
      }}
    />
  );
}

interface PrimaryButtonProps {
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  children: React.ReactNode;
}

/**
 * PrimaryButton Component
 * Main action button
 */
export function PrimaryButton({
  onClick,
  disabled,
  loading,
  children,
}: PrimaryButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      style={{
        width: "100%",
        padding: "8px",
        fontSize: 11,
        background: disabled ? "#e2e8f0" : "#3b82f6",
        color: disabled ? "#94a3b8" : "white",
        border: "none",
        borderRadius: 6,
        cursor: disabled ? "not-allowed" : "pointer",
        fontWeight: 700,
      }}
    >
      {loading ? "Loading..." : children}
    </button>
  );
}
