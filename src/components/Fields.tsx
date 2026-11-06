import { useEffect, useState } from "react";
export function NumberField({
  label,
  symbol,
  unit,
  value,
  onChange,
  min,
  step = "any",
  hint,
}: {
  label: string;
  symbol?: string;
  unit?: string;
  value: number | null;
  onChange: (v: number) => void;
  min?: number;
  step?: number | "any";
  hint?: string;
}) {
  const [text, setText] = useState(value === null ? "" : String(value));
  useEffect(() => setText(value === null ? "" : String(value)), [value]);
  return (
    <label className="number-field" title={hint}>
      <span>
        {label}
        {symbol && <em>{symbol}</em>}
      </span>
      <div>
        <input
          aria-label={label}
          type="number"
          value={text}
          min={min}
          step={step}
          onChange={(e) => setText(e.target.value)}
          onBlur={() => {
            if (value === null && text.trim() === "") return;
            const n = Number(text);
            onChange(Number.isFinite(n) ? n : 0);
            setText(String(Number.isFinite(n) ? n : 0));
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
          }}
        />
        {unit && <small>{unit}</small>}
      </div>
    </label>
  );
}
export function Cell({
  value,
  onChange,
  label,
  step = "any",
  min,
}: {
  value: number;
  onChange: (n: number) => void;
  label: string;
  step?: number | "any";
  min?: number;
}) {
  const [text, setText] = useState(String(value));
  useEffect(() => setText(String(value)), [value]);
  return (
    <input
      aria-label={label}
      type="number"
      min={min}
      step={step}
      value={text}
      onChange={(e) => setText(e.target.value)}
      onBlur={() => {
        const n = Number(text);
        onChange(Number.isFinite(n) ? n : 0);
        setText(String(Number.isFinite(n) ? n : 0));
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
      }}
    />
  );
}
export function Section({
  title,
  children,
  badge,
}: {
  title: string;
  children: React.ReactNode;
  badge?: string;
}) {
  return (
    <section className="property-section">
      <header>
        {title}
        {badge && <span>{badge}</span>}
      </header>
      <div>{children}</div>
    </section>
  );
}
