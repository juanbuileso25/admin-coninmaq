import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { X, Package, ImageOff, ChevronDown, Search, Check } from "lucide-react";
import { api, type MachineResponse } from "../../services/api";

interface Props {
  onClose: () => void;
  onCreated: () => void;
}

export default function NewMachineModal({ onClose, onCreated }: Props) {
  const [catalog, setCatalog] = useState<MachineResponse[]>([]);
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [catalogQuery, setCatalogQuery] = useState("");
  const [selectedCatalog, setSelectedCatalog] = useState<MachineResponse | null>(null);
  const [catalogOpen, setCatalogOpen] = useState(false);

  const [manualMode, setManualMode] = useState(false);
  const [plate, setPlate] = useState("");
  const [nickname, setNickname] = useState("");
  const [year, setYear] = useState("");
  const [engineSerial, setEngineSerial] = useState("");
  const [notes, setNotes] = useState("");

  // Modo manual (fallback)
  const [manualCode, setManualCode] = useState("");
  const [manualModel, setManualModel] = useState("");
  const [manualBrand, setManualBrand] = useState("");
  const [manualType, setManualType] = useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoadingCatalog(true);
      try {
        const data = await api.machines.list({ machine_type: "rental" });
        setCatalog(data);
      } finally {
        setLoadingCatalog(false);
      }
    })();
  }, []);

  const filteredCatalog = useMemo(() => {
    if (!catalogQuery.trim()) return catalog;
    const q = catalogQuery.toLowerCase();
    return catalog.filter(m =>
      m.code.toLowerCase().includes(q) ||
      m.model.toLowerCase().includes(q) ||
      m.brand.toLowerCase().includes(q)
    );
  }, [catalog, catalogQuery]);

  const canSave = plate.trim() && (manualMode ? (manualCode.trim() && manualModel.trim()) : !!selectedCatalog);

  async function handleSave() {
    if (!canSave) return;
    setSaving(true);
    setError(null);
    try {
      await api.rental.createMachine({
        plate: plate.trim(),
        nickname: nickname.trim() || undefined,
        year: year ? Number(year) : undefined,
        engine_serial: engineSerial.trim() || undefined,
        notes: notes.trim() || undefined,
        catalog_machine_id: manualMode ? null : selectedCatalog?.id,
        code: manualMode ? manualCode.trim() : undefined,
        model: manualMode ? manualModel.trim() : undefined,
        brand: manualMode ? (manualBrand.trim() || undefined) : undefined,
        machine_type: manualMode ? (manualType.trim() || undefined) : undefined,
      });
      onCreated();
    } catch (e: any) {
      setError(e?.detail ?? "Error al crear la máquina");
    } finally {
      setSaving(false);
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-surface-2 border border-border w-full max-w-lg animate-fade-up max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-fg font-semibold text-sm">Nueva unidad de renta</h2>
          <button onClick={onClose} className="text-fg-5 hover:text-fg transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4">

          {/* Toggle modo */}
          <div className="flex items-center gap-2 text-xs">
            <button
              onClick={() => setManualMode(false)}
              className={`px-3 py-1.5 font-medium border transition-all
                ${!manualMode
                  ? "bg-accent/10 border-accent text-accent"
                  : "border-border text-fg-4 hover:border-border-light"}`}
            >
              <Package size={12} className="inline mr-1" /> Desde catálogo
            </button>
            <button
              onClick={() => setManualMode(true)}
              className={`px-3 py-1.5 font-medium border transition-all
                ${manualMode
                  ? "bg-accent/10 border-accent text-accent"
                  : "border-border text-fg-4 hover:border-border-light"}`}
            >
              Manual
            </button>
          </div>

          {!manualMode ? (
            <>
              {/* Selector catálogo */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] uppercase tracking-wider text-fg-5 font-medium">Modelo del catálogo *</label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setCatalogOpen(v => !v)}
                    className="w-full flex items-center gap-3 bg-surface-3 border border-border px-3 py-2 text-left hover:border-border-light transition-colors"
                  >
                    {selectedCatalog ? (
                      <>
                        {selectedCatalog.image_url ? (
                          <img src={selectedCatalog.image_url} alt="" className="w-10 h-10 object-cover border border-border flex-shrink-0" />
                        ) : (
                          <div className="w-10 h-10 bg-surface-4 border border-border flex items-center justify-center flex-shrink-0">
                            <ImageOff size={14} className="text-fg-6" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="text-fg-2 text-sm font-medium truncate">{selectedCatalog.code} · {selectedCatalog.brand}</div>
                          <div className="text-fg-6 text-xs truncate">{selectedCatalog.model}</div>
                        </div>
                      </>
                    ) : (
                      <span className="text-fg-6 text-sm flex-1">
                        {loadingCatalog ? "Cargando catálogo..." : "Selecciona un modelo del catálogo de renta"}
                      </span>
                    )}
                    <ChevronDown size={14} className="text-fg-6 flex-shrink-0" />
                  </button>

                  {catalogOpen && (
                    <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-surface-2 border border-border shadow-xl max-h-72 overflow-y-auto">
                      <div className="sticky top-0 bg-surface-2 border-b border-border p-2">
                        <div className="relative">
                          <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-fg-6" />
                          <input
                            autoFocus
                            value={catalogQuery}
                            onChange={(e) => setCatalogQuery(e.target.value)}
                            placeholder="Buscar por código, modelo o marca..."
                            className="w-full bg-surface-3 border border-border pl-7 pr-2 py-1.5 text-xs text-fg-2 outline-none focus:border-accent"
                          />
                        </div>
                      </div>
                      {filteredCatalog.length === 0 ? (
                        <div className="px-3 py-6 text-center text-fg-6 text-xs">
                          {catalog.length === 0
                            ? <>Aún no hay máquinas de renta en el catálogo.<br />Agrégalas primero en Inventario → Renta.</>
                            : "Sin resultados"}
                        </div>
                      ) : (
                        filteredCatalog.map(m => (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => { setSelectedCatalog(m); setCatalogOpen(false); setCatalogQuery(""); }}
                            className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-surface-3 transition-colors border-b border-border/50 last:border-b-0"
                          >
                            {m.image_url ? (
                              <img src={m.image_url} alt="" className="w-8 h-8 object-cover border border-border flex-shrink-0" />
                            ) : (
                              <div className="w-8 h-8 bg-surface-4 border border-border flex items-center justify-center flex-shrink-0">
                                <ImageOff size={11} className="text-fg-6" />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="text-fg-2 text-sm truncate">{m.code} · {m.brand}</div>
                              <div className="text-fg-6 text-xs truncate">{m.model}</div>
                            </div>
                            {selectedCatalog?.id === m.id && <Check size={13} className="text-accent flex-shrink-0" />}
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Código *" value={manualCode} onChange={setManualCode} placeholder="CDM6225" />
                <Field label="Marca" value={manualBrand} onChange={setManualBrand} placeholder="LONKING" />
              </div>
              <Field label="Modelo *" value={manualModel} onChange={setManualModel} placeholder="Lonking CDM6225 martillo" />
              <Field label="Tipo" value={manualType} onChange={setManualType} placeholder="minicargador, martillo..." />
            </>
          )}

          {/* Datos únicos de la unidad */}
          <div className="border-t border-border pt-4">
            <p className="text-[10px] uppercase tracking-wider text-fg-5 font-medium mb-3">Datos de esta unidad</p>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Placa / Serial *" value={plate} onChange={setPlate} placeholder="9598-CDM" />
              <Field label="Apodo" value={nickname} onChange={setNickname} placeholder="MOMOS, TERESITA..." />
            </div>

            <div className="grid grid-cols-2 gap-3 mt-3">
              <Field label="Año" value={year} onChange={setYear} type="number" placeholder="2025" />
              <Field label="Serial motor" value={engineSerial} onChange={setEngineSerial} placeholder="ABC12345" />
            </div>

            <div className="flex flex-col gap-1 mt-3">
              <label className="text-[10px] uppercase tracking-wider text-fg-5 font-medium">Notas</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="bg-surface-3 border border-border text-sm text-fg-2 px-3 py-2 outline-none focus:border-accent resize-none"
              />
            </div>
          </div>

          {error && (
            <div className="text-red-400 text-xs bg-red-950/30 border border-red-900/40 px-3 py-2">{error}</div>
          )}
        </div>

        <div className="flex justify-end gap-2 px-5 py-4 border-t border-border">
          <button onClick={onClose} className="px-4 py-2 text-xs text-fg-4 border border-border hover:border-border-light transition-all">Cancelar</button>
          <button
            onClick={handleSave}
            disabled={!canSave || saving}
            className="px-4 py-2 text-xs font-semibold bg-accent hover:bg-accent-light text-zinc-900 transition-all hover:shadow-glow disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {saving ? "Guardando..." : "Crear unidad"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

function Field({
  label, value, onChange, placeholder, type = "text",
}: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[10px] uppercase tracking-wider text-fg-5 font-medium">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="bg-surface-3 border border-border text-sm text-fg-2 px-3 py-2 outline-none focus:border-accent transition-all placeholder:text-fg-6"
      />
    </div>
  );
}
