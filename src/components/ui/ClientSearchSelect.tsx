import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Search, X, Loader2 } from "lucide-react";
import { api, type ClientResponse } from "../../services/api";

interface Props {
  value: string | null;                 // client id
  displayValue?: string | null;         // client name (para mostrar cuando el nombre ya se sabe)
  onSelect: (client: ClientResponse | null) => void;
  placeholder?: string;
  disabled?: boolean;
  compact?: boolean;
}

export default function ClientSearchSelect({
  value, displayValue, onSelect, placeholder = "Buscar cliente...", disabled = false, compact = false,
}: Props) {
  const [open, setOpen]           = useState(false);
  const [query, setQuery]         = useState("");
  const [results, setResults]     = useState<ClientResponse[]>([]);
  const [loading, setLoading]     = useState(false);
  const [selectedName, setSelectedName] = useState<string | null>(displayValue ?? null);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
  const buttonRef                 = useRef<HTMLButtonElement>(null);
  const dropdownRef               = useRef<HTMLDivElement>(null);
  const debounceRef               = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { setSelectedName(displayValue ?? null); }, [displayValue]);

  // Cargar el nombre si tenemos value pero no displayValue
  useEffect(() => {
    if (value && !selectedName) {
      api.clients.get(value).then(c => setSelectedName(c.name)).catch(() => {});
    }
  }, [value, selectedName]);

  // Posicionar dropdown
  useEffect(() => {
    if (!open || !buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    setDropdownStyle({
      position: "fixed",
      top: rect.bottom + 4,
      left: rect.left,
      width: rect.width,
      zIndex: 9999,
    });
  }, [open]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        buttonRef.current && !buttonRef.current.contains(target) &&
        dropdownRef.current && !dropdownRef.current.contains(target)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Reposition on scroll
  useEffect(() => {
    if (!open) return;
    const reposition = () => {
      if (!buttonRef.current) return;
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownStyle({
        position: "fixed",
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
        zIndex: 9999,
      });
    };
    const close = () => setOpen(false);
    window.addEventListener("scroll", reposition, true);
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("scroll", reposition, true);
      window.removeEventListener("resize", close);
    };
  }, [open]);

  // Search with debounce
  useEffect(() => {
    if (!open) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await api.clients.list({ search: query || undefined, is_active: true });
        setResults(data.slice(0, 30));
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, open]);

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect(null);
    setSelectedName(null);
    setQuery("");
  };

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen(v => !v)}
        className={`w-full flex items-center gap-2 bg-surface-3 border rounded-sm text-left transition-colors
          ${compact ? "px-2.5 py-2 text-xs" : "px-4 py-3 text-sm"}
          ${open ? "border-accent/60" : "border-border hover:border-border-light"}
          ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
      >
        <span className={`flex-1 truncate ${value ? "text-fg" : "text-fg-6"}`}>
          {value ? (selectedName ?? "Cargando...") : placeholder}
        </span>
        {value ? (
          <span onClick={handleClear} className="p-0.5 text-fg-6 hover:text-fg transition-colors cursor-pointer">
            <X size={12} />
          </span>
        ) : (
          <ChevronDown
            size={14}
            className={`flex-shrink-0 transition-transform text-fg-6 ${open ? "rotate-180" : ""}`}
          />
        )}
      </button>

      {open && createPortal(
        <div
          ref={dropdownRef}
          style={dropdownStyle}
          className="bg-surface-2 border border-border shadow-lg max-h-80 overflow-hidden flex flex-col"
        >
          <div className="p-2 border-b border-border">
            <div className="relative">
              <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-fg-6" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar por nombre o NIT..."
                className="w-full bg-surface-3 border border-border pl-7 pr-2 py-1.5 text-xs text-fg-2 outline-none focus:border-accent"
              />
            </div>
          </div>

          <div className="overflow-y-auto flex-1">
            {loading && (
              <div className="flex items-center justify-center gap-2 py-4 text-fg-6 text-xs">
                <Loader2 size={12} className="animate-spin" /> Buscando...
              </div>
            )}
            {!loading && results.length === 0 && (
              <div className="text-center py-4 text-fg-6 text-xs">Sin resultados</div>
            )}
            {!loading && results.map(c => (
              <button
                key={c.id}
                type="button"
                onMouseDown={() => {
                  onSelect(c);
                  setSelectedName(c.name);
                  setOpen(false);
                  setQuery("");
                }}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-surface-3 transition-colors border-b border-border/50 last:border-b-0
                  ${value === c.id ? "text-accent" : "text-fg-2"}`}
              >
                <div className="font-medium truncate">{c.name}</div>
                <div className="text-fg-6 text-[11px]">
                  {c.document_type ?? ""} {c.document ?? ""}
                </div>
              </button>
            ))}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
