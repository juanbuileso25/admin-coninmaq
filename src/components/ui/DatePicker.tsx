import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { DayPicker } from "react-day-picker";
import { es } from "react-day-picker/locale";
import { CalendarDays, X } from "lucide-react";

interface DatePickerProps {
  value:       string | null | undefined;   // "YYYY-MM-DD" o null
  onChange:    (value: string | null) => void;
  placeholder?: string;
  label?:      string;
  error?:      string;
  disabled?:   boolean;
}

function parseDate(str: string | null | undefined): Date | undefined {
  if (!str) return undefined;
  const [y, m, d] = str.split("-").map(Number);
  if (!y || !m || !d) return undefined;
  return new Date(y, m - 1, d);
}

function formatDisplay(date: Date | undefined): string {
  if (!date) return "";
  return date.toLocaleDateString("es-CO", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function toIso(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export default function DatePicker({
  value, onChange, placeholder = "dd/mm/aaaa", label, error, disabled = false,
}: DatePickerProps) {
  const [open, setOpen]               = useState(false);
  const [month, setMonth]             = useState<Date>(parseDate(value) ?? new Date());
  const [calendarStyle, setCalendarStyle] = useState<React.CSSProperties>({});
  const buttonRef                     = useRef<HTMLButtonElement>(null);
  const calendarRef                   = useRef<HTMLDivElement>(null);
  const selected                      = parseDate(value);

  // Posicionar el portal bajo el botón
  useEffect(() => {
    if (!open || !buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    setCalendarStyle({
      position: "fixed",
      top:      rect.bottom + 4,
      left:     rect.left,
      zIndex:   9999,
    });
  }, [open]);

  // Cerrar al hacer click fuera
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        buttonRef.current && !buttonRef.current.contains(target) &&
        calendarRef.current && !calendarRef.current.contains(target)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Cerrar al hacer scroll/resize
  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [open]);

  // Sincronizar mes visible cuando cambia el valor externo
  useEffect(() => {
    if (selected) setMonth(selected);
  }, [value]);

  const handleSelect = (date: Date | undefined) => {
    onChange(date ? toIso(date) : null);
    setOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
  };

  return (
    <div className="relative">
      {label && (
        <label className="block text-xs font-medium text-fg-4 mb-1.5">{label}</label>
      )}

      <button
        ref={buttonRef}
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((v) => !v)}
        className={`w-full flex items-center gap-2 bg-surface-3 border rounded-sm px-4 py-3 text-sm text-left transition-colors
          ${error   ? "border-red-500/60" : open ? "border-accent/60" : "border-border hover:border-border-light"}
          ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
      >
        <CalendarDays size={14} className={selected ? "text-accent flex-shrink-0" : "text-fg-6 flex-shrink-0"} />
        <span className={`flex-1 ${selected ? "text-fg" : "text-fg-6"}`}>
          {selected ? formatDisplay(selected) : placeholder}
        </span>
        {selected && !disabled && (
          <span onClick={handleClear} className="p-0.5 text-fg-6 hover:text-fg transition-colors cursor-pointer">
            <X size={12} />
          </span>
        )}
      </button>

      {error && <p className="text-red-400 text-xs mt-1">{error}</p>}

      {open && createPortal(
        <div ref={calendarRef} style={calendarStyle} className="bg-surface-2 border border-border shadow-lg">
          <DayPicker
            mode="single"
            selected={selected}
            onSelect={handleSelect}
            month={month}
            onMonthChange={setMonth}
            locale={es}
            showOutsideDays
            classNames={{
              root:            "p-3",
              months:          "flex flex-col",
              month:           "space-y-2",
              month_caption:   "flex items-center justify-between px-1 py-1",
              caption_label:   "text-sm font-semibold text-fg capitalize",
              nav:             "flex items-center gap-1",
              button_previous: "p-1 text-fg-5 hover:text-fg hover:bg-surface-3 transition-colors",
              button_next:     "p-1 text-fg-5 hover:text-fg hover:bg-surface-3 transition-colors",
              weeks:           "border-collapse",
              weekdays:        "flex",
              weekday:         "w-8 h-7 flex items-center justify-center text-[10px] font-medium text-fg-6 uppercase",
              week:            "flex mt-0.5",
              day:             "w-8 h-8 flex items-center justify-center text-xs text-fg-4 hover:bg-surface-3 cursor-pointer transition-colors",
              day_button:      "w-full h-full flex items-center justify-center",
              selected:        "bg-accent text-black font-semibold hover:bg-accent",
              today:           "text-accent font-semibold",
              outside:         "text-fg-6 opacity-40",
              disabled:        "opacity-30 cursor-not-allowed",
              range_start:     "bg-accent text-black rounded-l",
              range_end:       "bg-accent text-black rounded-r",
            }}
          />
        </div>,
        document.body
      )}
    </div>
  );
}
