import { useState, useEffect, useRef } from "react";
import { Plus, Upload, Trash2, X, Pencil, Truck, ChevronRight, Loader2, Search, CheckCircle2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { api, type VehicleOut } from "../../services/api";

const VEHICLE_DOC_LABELS: Record<string, string> = {
  matricula:                    "Matrícula",
  soat:                         "SOAT vigente",
  revision_tecnico_mecanica:    "Revisión técnico-mecánica",
  poliza_seguros:               "Póliza de seguros",
  declaracion_importacion:      "Declaración de importación (si aplica)",
  hoja_de_vida:                 "Hoja de vida de la máquina",
  convenio_colaboracion:        "Convenio de colaboración (si aplica)",
  simit:                        "Certificado SIMIT",
  lista_chequeo_preoperacional: "Lista de chequeo preoperacional",
  cronograma_mantenimiento:     "Cronograma de mantenimiento",
  mantenimientos_realizados:    "Mantenimientos realizados",
  ficha_tecnica:                "Ficha técnica del equipo",
};

const TOTAL_TYPES = Object.keys(VEHICLE_DOC_LABELS).length;

export default function VehiculosPage() {
  const [vehicles,  setVehicles]  = useState<VehicleOut[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [selected,  setSelected]  = useState<VehicleOut | null>(null);
  const [search,    setSearch]    = useState("");

  const [showNew,   setShowNew]   = useState(false);
  const [newPlate,  setNewPlate]  = useState("");
  const [creating,  setCreating]  = useState(false);

  const [editing,   setEditing]   = useState(false);
  const [editPlate, setEditPlate] = useState("");
  const [saving,    setSaving]    = useState(false);

  const fileRef        = useRef<HTMLInputElement>(null);
  const [uploadType,   setUploadType]   = useState<string | null>(null);
  const [deletingType, setDeletingType] = useState<string | null>(null);
  const [deletingVeh,  setDeletingVeh]  = useState(false);

  const load = async () => {
    try {
      const data = await api.companyDocs.listVehicles();
      setVehicles(data);
      setSelected(prev => prev ? (data.find(v => v.id === prev.id) ?? null) : null);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const filtered = vehicles.filter(v =>
    v.plate.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreate = async () => {
    if (!newPlate.trim()) return;
    setCreating(true);
    try {
      const created = await api.companyDocs.createVehicle({ plate: newPlate.trim().toUpperCase() });
      setVehicles(prev => [created, ...prev]);
      setSelected(created);
      setShowNew(false); setNewPlate("");
      toast.success("Vehículo creado");
    } catch (e: any) { toast.error(e.detail ?? "Error al crear"); }
    finally { setCreating(false); }
  };

  const handleSaveEdit = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      const updated = await api.companyDocs.updateVehicle(selected.id, { plate: editPlate.trim().toUpperCase() });
      setVehicles(prev => prev.map(v => v.id === updated.id ? updated : v));
      setSelected(updated); setEditing(false);
      toast.success("Placa actualizada");
    } catch (e: any) { toast.error(e.detail ?? "Error al guardar"); }
    finally { setSaving(false); }
  };

  const handleUploadClick = (docType: string) => {
    setUploadType(docType);
    fileRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selected || !uploadType) return;
    e.target.value = "";
    const tid = toast.loading("Subiendo...");
    try {
      const updated = await api.companyDocs.uploadVehicleDoc(selected.id, uploadType, file);
      setVehicles(prev => prev.map(v => v.id === updated.id ? updated : v));
      setSelected(updated);
      toast.success("Documento subido", { id: tid });
    } catch (err: any) { toast.error(err.detail ?? "Error al subir", { id: tid }); }
    finally { setUploadType(null); }
  };

  const handleDeleteDoc = async (docType: string) => {
    if (!selected) return;
    setDeletingType(docType);
    try {
      await api.companyDocs.deleteVehicleDoc(selected.id, docType);
      const updated = { ...selected, documents: selected.documents.filter(d => d.doc_type !== docType) };
      setVehicles(prev => prev.map(v => v.id === selected.id ? updated : v));
      setSelected(updated);
      toast.success("Documento eliminado");
    } catch (e: any) { toast.error(e.detail ?? "Error"); }
    finally { setDeletingType(null); }
  };

  const handleDeleteVehicle = async () => {
    if (!selected || !confirm(`¿Eliminar vehículo "${selected.plate}"?`)) return;
    setDeletingVeh(true);
    try {
      await api.companyDocs.deleteVehicle(selected.id);
      setVehicles(prev => prev.filter(v => v.id !== selected.id));
      setSelected(null);
      toast.success("Vehículo eliminado");
    } catch (e: any) { toast.error(e.detail ?? "Error"); }
    finally { setDeletingVeh(false); }
  };

  const docsCount = selected?.documents.length ?? 0;

  // En móvil: si hay seleccionado, mostrar sólo el panel derecho
  const showList   = !selected || typeof window !== "undefined" && window.innerWidth >= 768;
  const showDetail = !!selected;

  return (
    <div className="flex h-full overflow-hidden">
      <input ref={fileRef} type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png,.webp" onChange={handleFileChange} />

      {/* ── Lista ── oculta en móvil cuando hay seleccionado */}
      <div className={`
        w-full md:w-64 lg:w-72 flex-shrink-0 border-r border-border flex flex-col bg-surface-2
        ${selected ? "hidden md:flex" : "flex"}
      `}>
        <div className="p-4 border-b border-border space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold text-fg uppercase tracking-wider">Vehículos</h2>
            <button onClick={() => setShowNew(true)} className="flex items-center gap-1 px-2.5 py-1.5 bg-accent text-black text-xs font-semibold hover:bg-accent/90 transition-colors">
              <Plus size={12} /> Nuevo
            </button>
          </div>
          <div className="relative">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-fg-6" />
            <input
              className="w-full bg-surface-3 border border-border text-fg text-xs px-2.5 py-2 pl-7 outline-none focus:border-accent placeholder:text-fg-6 font-mono uppercase"
              placeholder="Buscar placa..."
              value={search} onChange={e => setSearch(e.target.value.toUpperCase())}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center py-10"><Loader2 size={16} className="animate-spin text-fg-6" /></div>
          ) : filtered.length === 0 ? (
            <p className="text-center text-fg-6 text-xs py-10">Sin resultados</p>
          ) : filtered.map(v => {
            const pct = (v.documents.length / TOTAL_TYPES) * 100;
            const isSelected = selected?.id === v.id;
            return (
              <button
                key={v.id}
                onClick={() => setSelected(v)}
                className={`w-full text-left px-4 py-3 border-b border-border transition-colors flex items-center gap-3 ${
                  isSelected ? "bg-accent-muted border-l-2 border-l-accent pl-[14px]" : "hover:bg-surface-3"
                }`}
              >
                <div className={`w-8 h-8 rounded-sm flex items-center justify-center flex-shrink-0 ${isSelected ? "bg-accent/20" : "bg-surface-3"}`}>
                  <Truck size={14} className={isSelected ? "text-accent" : "text-fg-5"} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-mono font-semibold text-fg">{v.plate}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex-1 h-1 bg-surface-3 rounded-full overflow-hidden">
                      <div className="h-1 bg-accent/60 rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-[10px] text-fg-6">{v.documents.length}/{TOTAL_TYPES}</span>
                  </div>
                </div>
                <ChevronRight size={12} className="text-fg-6 flex-shrink-0" />
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Panel derecho ── ocupa todo en móvil */}
      {showDetail ? (
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          {/* Header */}
          <div className="flex items-center gap-3 px-4 md:px-6 py-4 border-b border-border bg-surface-2 flex-shrink-0">
            {/* Botón volver — solo móvil */}
            <button onClick={() => setSelected(null)} className="md:hidden p-1.5 text-fg-5 hover:text-fg transition-colors flex-shrink-0">
              <ArrowLeft size={18} />
            </button>

            {editing ? (
              <div className="flex items-center gap-2 flex-1 flex-wrap">
                <input
                  className="bg-surface-3 border border-border text-fg text-sm px-3 py-1.5 outline-none focus:border-accent w-36 font-mono uppercase"
                  value={editPlate} onChange={e => setEditPlate(e.target.value.toUpperCase())}
                  onKeyDown={e => e.key === "Enter" && handleSaveEdit()} autoFocus
                />
                <button onClick={handleSaveEdit} disabled={saving} className="px-3 py-1.5 bg-accent text-black text-xs font-semibold hover:bg-accent/90 disabled:opacity-50 flex items-center gap-1">
                  {saving ? <Loader2 size={12} className="animate-spin" /> : "Guardar"}
                </button>
                <button onClick={() => setEditing(false)} className="text-fg-5 hover:text-fg p-1"><X size={15} /></button>
              </div>
            ) : (
              <>
                <div className="flex-1 min-w-0">
                  <h2 className="text-sm font-semibold font-mono text-fg">{selected.plate}</h2>
                  <p className="text-[11px] text-fg-5 mt-0.5">{docsCount} de {TOTAL_TYPES} documentos</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <div className="hidden sm:flex items-center gap-2">
                    <div className="w-24 h-1.5 bg-surface-3 rounded-full overflow-hidden">
                      <div className="h-1.5 bg-accent rounded-full transition-all" style={{ width: `${(docsCount / TOTAL_TYPES) * 100}%` }} />
                    </div>
                  </div>
                  <button onClick={() => { setEditPlate(selected.plate); setEditing(true); }} className="p-2 text-fg-5 hover:text-fg hover:bg-surface-3 rounded-sm transition-colors">
                    <Pencil size={16} />
                  </button>
                  <button onClick={handleDeleteVehicle} disabled={deletingVeh} className="p-2 text-fg-5 hover:text-red-400 hover:bg-red-950/20 rounded-sm transition-colors">
                    {deletingVeh ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Slots */}
          <div className="flex-1 overflow-y-auto p-4 md:p-6">
            <div className="space-y-2">
              {Object.entries(VEHICLE_DOC_LABELS).map(([docType, label]) => {
                const doc = selected.documents.find(d => d.doc_type === docType);
                const isUp = uploadType === docType;
                const isDel = deletingType === docType;
                return (
                  <div key={docType} className="flex items-center gap-3 px-3 md:px-4 py-3 bg-surface-2 border border-border">
                    {doc
                      ? <CheckCircle2 size={15} className="text-emerald-400 flex-shrink-0" />
                      : <div className="w-[15px] h-[15px] rounded-full border-2 border-fg-6 flex-shrink-0" />
                    }
                    <span className="text-xs md:text-sm text-fg-3 flex-1 min-w-0 leading-snug">{label}</span>
                    {doc ? (
                      <div className="flex items-center gap-1.5 md:gap-2 flex-shrink-0">
                        <a href={doc.file_url} target="_blank" rel="noopener noreferrer"
                          className="text-xs px-2 md:px-2.5 py-1.5 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 transition-colors whitespace-nowrap">
                          Ver
                        </a>
                        <button onClick={() => handleUploadClick(docType)} disabled={isUp} title="Reemplazar" className="p-2 text-fg-5 hover:text-fg border border-border hover:border-fg-4 transition-colors">
                          {isUp ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
                        </button>
                        <button onClick={() => handleDeleteDoc(docType)} disabled={isDel} title="Eliminar" className="p-2 text-fg-5 hover:text-red-400 border border-border hover:border-red-500/30 transition-colors">
                          {isDel ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => handleUploadClick(docType)} disabled={isUp}
                        className="flex-shrink-0 flex items-center gap-1.5 text-xs px-2 md:px-2.5 py-1.5 border border-dashed border-fg-6 text-fg-5 hover:border-accent hover:text-accent transition-colors whitespace-nowrap">
                        {isUp ? <Loader2 size={11} className="animate-spin" /> : <Upload size={11} />}
                        Subir
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        <div className="hidden md:flex flex-1 flex-col items-center justify-center gap-3 text-fg-6">
          <Truck size={48} strokeWidth={1} />
          <p className="text-sm">Selecciona un vehículo para ver sus documentos</p>
          {!loading && vehicles.length === 0 && (
            <button onClick={() => setShowNew(true)} className="mt-2 flex items-center gap-2 px-4 py-2 border border-dashed border-fg-6 text-fg-5 hover:border-accent hover:text-accent transition-colors text-sm">
              <Plus size={14} /> Agregar primer vehículo
            </button>
          )}
        </div>
      )}

      {/* Modal nuevo */}
      {showNew && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={e => e.target === e.currentTarget && setShowNew(false)}>
          <div className="bg-surface-2 border border-border w-full max-w-xs p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-sm font-semibold text-fg">Nuevo vehículo</h3>
              <button onClick={() => setShowNew(false)} className="text-fg-5 hover:text-fg"><X size={16} /></button>
            </div>
            <label className="text-xs text-fg-5 block mb-1.5">Placa *</label>
            <input
              autoFocus
              className="w-full bg-surface-3 border border-border text-fg text-sm px-3 py-2.5 outline-none focus:border-accent placeholder:text-fg-6 font-mono uppercase"
              placeholder="Ej: ABC-123"
              value={newPlate} onChange={e => setNewPlate(e.target.value.toUpperCase())}
              onKeyDown={e => e.key === "Enter" && handleCreate()}
            />
            <button
              onClick={handleCreate} disabled={creating || !newPlate.trim()}
              className="mt-4 w-full bg-accent text-black text-sm font-semibold py-2.5 hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {creating ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
              Crear
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
