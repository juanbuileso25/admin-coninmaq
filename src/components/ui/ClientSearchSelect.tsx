import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Search, X, Loader2, Plus, UserPlus } from "lucide-react";
import { api, type ClientResponse } from "../../services/api";

const DOCUMENT_TYPES = [
  { value: "",      label: "—" },
  { value: "NIT",   label: "NIT" },
  { value: "CC",    label: "CC" },
  { value: "CE",    label: "CE" },
  { value: "PP",    label: "Pasaporte" },
  { value: "RUT",   label: "RUT" },
];

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
  const [createOpen, setCreateOpen] = useState(false);
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

          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              setCreateOpen(true);
              setOpen(false);
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-accent hover:bg-accent/10
                       border-t border-border transition-colors font-medium"
          >
            <UserPlus size={13} />
            {query.trim() ? `Crear cliente "${query.trim()}"` : "Crear nuevo cliente"}
          </button>
        </div>,
        document.body
      )}

      {createOpen && (
        <QuickCreateClientModal
          initialName={query.trim()}
          onClose={() => setCreateOpen(false)}
          onCreated={(c) => {
            setCreateOpen(false);
            onSelect(c);
            setSelectedName(c.name);
            setQuery("");
          }}
        />
      )}
    </div>
  );
}


function QuickCreateClientModal({
  initialName, onClose, onCreated,
}: {
  initialName: string;
  onClose: () => void;
  onCreated: (c: ClientResponse) => void;
}) {
  const [name, setName]                 = useState(initialName);
  const [documentType, setDocumentType] = useState("NIT");
  const [document, setDocument]         = useState("");
  const [mobile, setMobile]             = useState("");
  const [billingEmail, setBillingEmail] = useState("");
  const [saving, setSaving]             = useState(false);
  const [error, setError]               = useState<string | null>(null);

  async function handleSave() {
    if (!name.trim())     { setError("El nombre es obligatorio"); return; }
    if (!document.trim()) { setError("El documento es obligatorio"); return; }
    setSaving(true);
    setError(null);
    try {
      const payload: Record<string, unknown> = {
        name: name.trim(),
        document: document.trim(),
      };
      if (documentType) payload.document_type = documentType;
      if (mobile.trim()) payload.mobile = mobile.trim();
      if (billingEmail.trim()) payload.billing_email = billingEmail.trim();

      const created = await api.clients.create(payload);
      onCreated(created);
    } catch (e: any) {
      setError(e?.detail ?? e?.message ?? "Error al crear el cliente");
    } finally {
      setSaving(false);
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-surface-2 border border-border w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Plus size={16} className="text-accent" />
            <h2 className="text-fg font-semibold text-sm">Nuevo cliente</h2>
          </div>
          <button onClick={onClose} className="text-fg-5 hover:text-fg transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] uppercase tracking-wider text-fg-5 font-medium">
              Razón social / Nombre *
            </label>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Constructora XYZ S.A.S."
              className="bg-surface-3 border border-border text-sm text-fg-2 px-3 py-2 outline-none focus:border-accent"
            />
          </div>

          <div className="grid grid-cols-[110px_1fr] gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] uppercase tracking-wider text-fg-5 font-medium">Tipo doc</label>
              <select
                value={documentType}
                onChange={(e) => setDocumentType(e.target.value)}
                className="bg-surface-3 border border-border text-sm text-fg-2 px-2 py-2 outline-none focus:border-accent"
              >
                {DOCUMENT_TYPES.map((d) => (
                  <option key={d.value} value={d.value}>{d.label}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] uppercase tracking-wider text-fg-5 font-medium">Documento *</label>
              <input
                value={document}
                onChange={(e) => setDocument(e.target.value)}
                placeholder="900123456-7"
                className="bg-surface-3 border border-border text-sm text-fg-2 px-3 py-2 outline-none focus:border-accent"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] uppercase tracking-wider text-fg-5 font-medium">Celular</label>
              <input
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                placeholder="3001234567"
                className="bg-surface-3 border border-border text-sm text-fg-2 px-3 py-2 outline-none focus:border-accent"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] uppercase tracking-wider text-fg-5 font-medium">Email facturación</label>
              <input
                type="email"
                value={billingEmail}
                onChange={(e) => setBillingEmail(e.target.value)}
                placeholder="facturacion@cliente.com"
                className="bg-surface-3 border border-border text-sm text-fg-2 px-3 py-2 outline-none focus:border-accent"
              />
            </div>
          </div>

          {error && (
            <div className="text-red-400 text-xs bg-red-950/30 border border-red-900/40 px-3 py-2">{error}</div>
          )}

          <p className="text-fg-6 text-[10px]">
            Se crea con lo mínimo. Luego puedes completar dirección, contactos y documentos en <strong>Clientes</strong>.
          </p>
        </div>

        <div className="flex justify-end gap-2 px-5 py-4 border-t border-border">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs text-fg-4 border border-border hover:border-border-light transition-all"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !name.trim() || !document.trim()}
            className="px-4 py-2 text-xs font-semibold bg-accent hover:bg-accent-light text-zinc-900
                       transition-all hover:shadow-glow disabled:opacity-40 disabled:cursor-not-allowed
                       flex items-center gap-1.5"
          >
            {saving ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
            {saving ? "Creando..." : "Crear y seleccionar"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
