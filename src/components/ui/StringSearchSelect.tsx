import { useEffect, useMemo, useRef, useState } from "react";
import { Search, X, ChevronDown } from "lucide-react";

export interface StringOption {
  id: string;
  label: string;
  sublabel?: string;
}

interface Props {
  value: string | null;
  displayValue?: string | null;
  placeholder?: string;
  options: StringOption[];
  onSelect: (opt: StringOption | null) => void;
  disabled?: boolean;
  clearable?: boolean;
  emptyText?: string;
}

/**
 * Select buscable para IDs de tipo string (ej. UUIDs de usuarios o máquinas).
 * Trabaja sobre una lista en memoria con filtrado client-side.
 */
export default function StringSearchSelect({
  value, displayValue, placeholder = "Buscar...",
  options, onSelect, disabled, clearable = true, emptyText = "Sin resultados",
}: Props) {
  const [query, setQuery] = useState("");
  const [open, setOpen]   = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const current = useMemo(
    () => options.find(o => o.id === value) || null,
    [options, value]
  );

  const shownLabel = displayValue ?? current?.label ?? "";

  const filtered = useMemo(() => {
    if (!query.trim()) return options;
    const q = query.toLowerCase();
    return options.filter(o =>
      o.label.toLowerCase().includes(q) ||
      (o.sublabel ?? "").toLowerCase().includes(q)
    );
  }, [options, query]);

  // Cerrar al click afuera
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  return (
    <div ref={ref} className="relative">
      <div className="relative">
        {open && <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-6 pointer-events-none" />}
        <input
          className={`w-full bg-surface-3 border border-border text-fg py-2 text-sm
                     placeholder:text-fg-6 outline-none focus:border-accent disabled:opacity-50
                     ${open ? "pl-8" : "pl-3"} pr-8`}
          placeholder={open ? placeholder : (shownLabel || placeholder)}
          value={open ? query : shownLabel}
          onFocus={() => { if (!disabled) { setOpen(true); setQuery(""); } }}
          onChange={e => setQuery(e.target.value)}
          disabled={disabled}
          readOnly={!open}
        />
        {value && clearable && !open ? (
          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); onSelect(null); }}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-fg-6 hover:text-fg-3"
          >
            <X size={13} />
          </button>
        ) : (
          <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-fg-6 pointer-events-none" />
        )}
      </div>

      {open && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-surface-2 border border-border shadow-xl max-h-60 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="px-3 py-2 text-xs text-fg-5">{emptyText}</div>
          ) : filtered.map(opt => (
            <button
              key={opt.id}
              type="button"
              onMouseDown={() => { onSelect(opt); setOpen(false); setQuery(""); }}
              className={`w-full text-left px-3 py-2 text-sm hover:bg-surface-3 transition-colors
                         ${value === opt.id ? "bg-surface-3 text-accent font-medium" : "text-fg-2"}`}
            >
              <div className="truncate">{opt.label}</div>
              {opt.sublabel && <div className="text-fg-6 text-[10px] truncate">{opt.sublabel}</div>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
