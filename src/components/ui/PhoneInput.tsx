import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

const COUNTRIES = [
  { code: "57",  name: "Colombia" },
  { code: "58",  name: "Venezuela" },
  { code: "593", name: "Ecuador" },
  { code: "51",  name: "Perú" },
  { code: "52",  name: "México" },
  { code: "507", name: "Panamá" },
  { code: "1",   name: "EE.UU." },
  { code: "55",  name: "Brasil" },
  { code: "56",  name: "Chile" },
  { code: "54",  name: "Argentina" },
];

interface Props {
  value: string;
  onChange: (fullNumber: string) => void;
  placeholder?: string;
  className?: string;
}

export default function PhoneInput({ value, onChange, placeholder = "3012345678", className }: Props) {
  const [dialCode, setDialCode] = useState("57");
  const [local, setLocal]       = useState("");
  const [open, setOpen]         = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);

  // Sincronizar hacia afuera
  useEffect(() => {
    const clean = local.replace(/\D/g, "");
    onChange(clean ? `${dialCode}${clean}` : "");
  }, [dialCode, local]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sincronizar desde afuera (prefill)
  useEffect(() => {
    if (!value) { setLocal(""); return; }
    const matched = COUNTRIES.find(c => value.startsWith(c.code));
    if (matched) {
      setDialCode(matched.code);
      setLocal(value.slice(matched.code.length));
    } else {
      setLocal(value);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Cerrar al hacer click fuera
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (!dropRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const selected = COUNTRIES.find(c => c.code === dialCode) ?? COUNTRIES[0];

  return (
    <div ref={dropRef} className={`flex relative ${className ?? ""}`}>
      {/* Selector de indicativo */}
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1.5 px-3 py-2 bg-surface-3 border border-r-0 border-border text-sm text-fg hover:bg-surface-4 transition-colors shrink-0 select-none"
      >
        <span className="text-fg-4 text-xs font-mono">+{selected.code}</span>
        <ChevronDown size={12} className={`text-fg-6 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {/* Dropdown — abre hacia arriba */}
      {open && (
        <div className="absolute bottom-full left-0 z-[9999] mb-1 bg-surface-3 border border-border shadow-xl min-w-[180px]">
          {COUNTRIES.map(c => (
            <button
              key={c.code}
              type="button"
              onClick={() => { setDialCode(c.code); setOpen(false); }}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left hover:bg-surface-4 transition-colors ${
                c.code === dialCode ? "bg-accent/10 text-accent" : "text-fg"
              }`}
            >
              <span className="flex-1">{c.name}</span>
              <span className="text-fg-5 font-mono text-xs">+{c.code}</span>
            </button>
          ))}
        </div>
      )}

      {/* Input del número local */}
      <input
        type="tel"
        value={local}
        onChange={e => setLocal(e.target.value.replace(/\D/g, ""))}
        placeholder={placeholder}
        className="flex-1 bg-surface-3 border border-border text-fg px-3 py-2 text-sm placeholder:text-fg-6 outline-none focus:border-accent font-mono"
      />
    </div>
  );
}
