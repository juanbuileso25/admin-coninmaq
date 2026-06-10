import { useState, useEffect, useRef, useCallback } from "react";
import { Search, X } from "lucide-react";

export interface SelectOption { id: number; label: string }

interface Props {
  value:        number | null;
  displayValue: string;
  placeholder:  string;
  onSearch:     (query: string) => Promise<SelectOption[]>;
  onSelect:     (id: number | null, label: string) => void;
  disabled?:    boolean;
}

export default function SearchSelect({ value, displayValue, placeholder, onSearch, onSelect, disabled }: Props) {
  const [query,    setQuery]    = useState("");
  const [options,  setOptions]  = useState<SelectOption[]>([]);
  const [open,     setOpen]     = useState(false);
  const [loading,  setLoading]  = useState(false);
  const containerRef            = useRef<HTMLDivElement>(null);
  const debounceRef             = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Display label or the search query when focused
  const inputValue = open ? query : (value ? displayValue : "");

  const runSearch = useCallback(async (q: string) => {
    setLoading(true);
    try {
      const results = await onSearch(q);
      setOptions(results);
    } catch {
      setOptions([]);
    } finally {
      setLoading(false);
    }
  }, [onSearch]);

  const handleFocus = () => {
    setOpen(true);
    setQuery("");
    runSearch("");
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const q = e.target.value;
    setQuery(q);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runSearch(q), 300);
  };

  const handleSelect = (opt: SelectOption) => {
    onSelect(opt.id, opt.label);
    setOpen(false);
    setQuery("");
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect(null, "");
    setQuery("");
  };

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-6 pointer-events-none" />
        <input
          className="w-full bg-surface-3 border border-border-light text-fg pl-8 pr-8 py-2.5 text-sm
                     placeholder:text-fg-6 outline-none focus:border-accent focus:shadow-glow-xs disabled:opacity-50"
          placeholder={placeholder}
          value={inputValue}
          onFocus={handleFocus}
          onChange={handleChange}
          disabled={disabled}
          readOnly={!open}
        />
        {value && !open && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-fg-6 hover:text-fg-3 transition-colors"
          >
            <X size={13} />
          </button>
        )}
      </div>

      {open && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-surface-2 border border-border shadow-lg max-h-52 overflow-y-auto">
          {loading && (
            <div className="px-3 py-2 text-xs text-fg-5">Buscando...</div>
          )}
          {!loading && options.length === 0 && (
            <div className="px-3 py-2 text-xs text-fg-5">Sin resultados</div>
          )}
          {!loading && options.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onMouseDown={() => handleSelect(opt)}
              className={`w-full text-left px-3 py-2 text-sm hover:bg-surface-3 transition-colors
                         ${value === opt.id ? "text-accent font-medium" : "text-fg-2"}`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
