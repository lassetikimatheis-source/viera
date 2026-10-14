"use client";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Plus,
  X,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";
import { displayDate, dateKey, shiftDate } from "@/lib/vyra-data";
import { useVyra } from "./store";
export function IconButton({
  icon: Icon,
  label,
  onClick,
  disabled = false,
  className = "",
}: {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      className={`icon-button ${className}`}
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
    >
      <Icon size={21} strokeWidth={1.8} />
    </button>
  );
}
export function Title({
  title,
  eyebrow,
  action,
}: {
  title: string;
  eyebrow?: string;
  action?: ReactNode;
}) {
  return (
    <div className="page-title">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
      </div>
      {action}
    </div>
  );
}
export function SectionTitle({
  children,
  action,
  onClick,
}: {
  children: ReactNode;
  action?: string;
  onClick?: () => void;
}) {
  return (
    <div className="section-title">
      <h2>{children}</h2>
      {action && (
        <button className="text-button" onClick={onClick}>
          {action}
          <ChevronRight size={15} />
        </button>
      )}
    </div>
  );
}
export function BackTitle({ title }: { title: string }) {
  const { back } = useVyra();
  return (
    <div className="detail-title">
      <IconButton icon={ArrowLeft} label="Zurück" onClick={back} />
      <h1>{title}</h1>
    </div>
  );
}
export function DateNav() {
  const { day, setDay } = useVyra();
  return (
    <div className="date-nav">
      <IconButton
        icon={ChevronLeft}
        label="Vorheriger Tag"
        onClick={() => setDay(shiftDate(day, -1))}
      />
      <label>
        <span>{day === dateKey() ? "Heute" : displayDate(day, true)}</span>
        <input
          aria-label="Datum"
          type="date"
          value={day}
          max={dateKey()}
          onChange={(e) => e.target.value && setDay(e.target.value)}
        />
      </label>
      <IconButton
        icon={ChevronRight}
        label="Nächster Tag"
        disabled={day >= dateKey()}
        onClick={() => setDay(shiftDate(day, 1))}
      />
    </div>
  );
}
export function Meter({
  value,
  max,
  tone = "mint",
}: {
  value: number;
  max: number;
  tone?: string;
}) {
  return (
    <div
      className={`meter ${tone}`}
      role="progressbar"
      aria-valuenow={Math.round(value)}
      aria-valuemin={0}
      aria-valuemax={Math.max(value, max)}
    >
      <span
        style={{
          width: `${Math.min(100, Math.max(0, (value / Math.max(1, max)) * 100))}%`,
        }}
      />
    </div>
  );
}
export function Row({
  icon: Icon,
  title,
  text,
  value,
  tone = "mint",
  onClick,
}: {
  icon: LucideIcon;
  title: string;
  text?: string;
  value?: ReactNode;
  tone?: string;
  onClick: () => void;
}) {
  return (
    <button className="list-row" onClick={onClick}>
      <span className={`icon-tile ${tone}`}>
        <Icon size={20} />
      </span>
      <span className="row-copy">
        <strong>{title}</strong>
        {text && <small>{text}</small>}
      </span>
      {value && <span className="row-value">{value}</span>}
      <ChevronRight className="row-chevron" size={16} />
    </button>
  );
}
export function Empty({
  icon: Icon,
  title,
  text,
  action,
  onClick,
}: {
  icon: LucideIcon;
  title: string;
  text: string;
  action?: string;
  onClick?: () => void;
}) {
  return (
    <div className="empty-state">
      <Icon size={28} strokeWidth={1.4} />
      <h3>{title}</h3>
      <p>{text}</p>
      {action && (
        <button className="button secondary" onClick={onClick}>
          <Plus size={16} />
          {action}
        </button>
      )}
    </div>
  );
}
export function Toggle({
  label,
  text,
  checked,
  onChange,
}: {
  label: string;
  text?: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="toggle-row">
      <span>
        <strong>{label}</strong>
        {text && <small>{text}</small>}
      </span>
      <input
        type="checkbox"
        role="switch"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="toggle-track" aria-hidden="true" />
    </label>
  );
}
export function Sheet({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    d?.showModal();
    return () => d?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className="sheet"
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
    >
      <div className="sheet-head">
        <h2>{title}</h2>
        <IconButton icon={X} label="Schließen" onClick={onClose} />
      </div>
      <div className="sheet-content">{children}</div>
    </dialog>
  );
}
export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}
export function Segments({
  values,
  value,
  onChange,
}: {
  values: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="segments" role="group">
      {values.map((v) => (
        <button
          key={v}
          aria-pressed={v === value}
          className={v === value ? "selected" : ""}
          onClick={() => onChange(v)}
        >
          {v}
        </button>
      ))}
    </div>
  );
}
