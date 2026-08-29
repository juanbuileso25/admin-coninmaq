import { useState, useEffect } from "react";
import { Plus, X, Pencil, Truck, Bike, ChevronRight, Loader2, Search, ArrowLeft, Trash2, FileText, ClipboardCheck } from "lucide-react";
import { toast } from "sonner";
import { api, type VehicleOut } from "../../services/api";
import DocumentosTab, { VEHICLE_DOC_TYPES_COUNT } from "./vehiculos/DocumentosTab";
import InspeccionesTab from "./vehiculos/InspeccionesTab";

type TabKey = "documentos" | "inspecciones";

export default function VehiculosPage() {
  const [vehicles, setVehicles] = useState<VehicleOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<VehicleOut | null>(null);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<TabKey>("documentos");

  const [showNew, setShowNew] = useState(false);
  const [newPlate, setNewPlate] = useState("");
  const [newTipo, setNewTipo] = useState<"carro" | "moto">("carro");
  const [newModelo, setNewModelo] = useState("");
  const [creating, setCreating] = useState(false);

  const [editing, setEditing] = useState(false);
  const [editPlate, setEditPlate] = useState("");
  const [editTipo, setEditTipo] = useState<"carro" | "moto">("carro");
  const [editModelo, setEditModelo] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingVeh, setDeletingVeh] = useState(false);

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
      const created = await api.companyDocs.createVehicle({
        plate: newPlate.trim().toUpperCase(),
        tipo: newTipo,
        modelo: newModelo.trim() || null,
      });
      setVehicles(prev => [created, ...prev]);
      setSelected(created);
      setShowNew(false); setNewPlate(""); setNewTipo("carro"); setNewModelo("");
      toast.success("Vehículo creado");
    } catch (e: any) { toast.error(e.detail ?? "Error al crear"); }
    finally { setCreating(false); }
  };

  const handleSaveEdit = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      const updated = await api.companyDocs.updateVehicle(selected.id, {
        plate: editPlate.trim().toUpperCase(),
        tipo: editTipo,
        modelo: editModelo.trim() || null,
      });
      setVehicles(prev => prev.map(v => v.id === updated.id ? updated : v));
      setSelected(updated); setEditing(false);
      toast.success("Vehículo actualizado");
    } catch (e: any) { toast.error(e.detail ?? "Error al guardar"); }
    finally { setSaving(false); }
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

  const handleVehicleUpdated = (updated: VehicleOut) => {
    setVehicles(prev => prev.map(v => v.id === updated.id ? updated : v));
    setSelected(updated);
  };

  const uniqueTypes = (v: VehicleOut) => new Set(v.documents.map(d => d.doc_type)).size;
  const docsCount = selected ? uniqueTypes(selected) : 0;
  const showDetail = !!selected;

  return (
    <div className="flex h-full overflow-hidden">
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
            const pct = (uniqueTypes(v) / VEHICLE_DOC_TYPES_COUNT) * 100;
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
                  {v.tipo === "moto"
                    ? <Bike size={14} className={isSelected ? "text-accent" : "text-fg-5"} />
                    : <Truck size={14} className={isSelected ? "text-accent" : "text-fg-5"} />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs font-mono font-semibold text-fg">{v.plate}</p>
                    <span className="text-[9px] uppercase tracking-wide text-fg-6 bg-surface-3 px-1 py-0.5 rounded-sm">{v.tipo}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex-1 h-1 bg-surface-3 rounded-full overflow-hidden">
                      <div className="h-1 bg-accent/60 rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-[10px] text-fg-6">{uniqueTypes(v)}/{VEHICLE_DOC_TYPES_COUNT}</span>
                  </div>
                </div>
                <ChevronRight size={12} className="text-fg-6 flex-shrink-0" />
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Panel derecho ── */}
      {showDetail ? (
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          {/* Header */}
          <div className="flex items-center gap-3 px-4 md:px-6 py-4 border-b border-border bg-surface-2 flex-shrink-0">
            <button onClick={() => setSelected(null)} className="md:hidden p-1.5 text-fg-5 hover:text-fg transition-colors flex-shrink-0">
              <ArrowLeft size={18} />
            </button>

            {editing ? (
              <div className="flex items-center gap-2 flex-1 flex-wrap">
                <input
                  className="bg-surface-3 border border-border text-fg text-sm px-3 py-1.5 outline-none focus:border-accent w-36 font-mono uppercase"
                  value={editPlate} onChange={e => setEditPlate(e.target.value.toUpperCase())}
                  onKeyDown={e => e.key === "Enter" && handleSaveEdit()} autoFocus placeholder="Placa"
                />
                <input
                  className="bg-surface-3 border border-border text-fg text-sm px-3 py-1.5 outline-none focus:border-accent w-40"
                  value={editModelo} onChange={e => setEditModelo(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleSaveEdit()} placeholder="Modelo (ej: Hilux 2020)"
                />
                <div className="flex gap-1">
                  <button type="button" onClick={() => setEditTipo("carro")}
                    className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold border transition-colors ${editTipo === "carro" ? "bg-accent text-black border-accent" : "border-border text-fg-5 hover:border-fg-4"}`}>
                    <Truck size={11} /> Carro
                  </button>
                  <button type="button" onClick={() => setEditTipo("moto")}
                    className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold border transition-colors ${editTipo === "moto" ? "bg-accent text-black border-accent" : "border-border text-fg-5 hover:border-fg-4"}`}>
                    <Bike size={11} /> Moto
                  </button>
                </div>
                <button onClick={handleSaveEdit} disabled={saving} className="px-3 py-1.5 bg-accent text-black text-xs font-semibold hover:bg-accent/90 disabled:opacity-50 flex items-center gap-1">
                  {saving ? <Loader2 size={12} className="animate-spin" /> : "Guardar"}
                </button>
                <button onClick={() => setEditing(false)} className="text-fg-5 hover:text-fg p-1"><X size={15} /></button>
              </div>
            ) : (
              <>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-sm font-semibold font-mono text-fg">{selected.plate}</h2>
                    <span className="text-[9px] uppercase tracking-wide text-fg-6 bg-surface-3 px-1.5 py-0.5 rounded-sm">{selected.tipo}</span>
                    {selected.modelo && <span className="text-[11px] text-fg-4">· {selected.modelo}</span>}
                  </div>
                  <p className="text-[11px] text-fg-5 mt-0.5">{docsCount} de {VEHICLE_DOC_TYPES_COUNT} tipos · {selected.documents.length} archivo{selected.documents.length !== 1 ? "s" : ""}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <div className="hidden sm:flex items-center gap-2">
                    <div className="w-24 h-1.5 bg-surface-3 rounded-full overflow-hidden">
                      <div className="h-1.5 bg-accent rounded-full transition-all" style={{ width: `${(docsCount / VEHICLE_DOC_TYPES_COUNT) * 100}%` }} />
                    </div>
                  </div>
                  <button onClick={() => { setEditPlate(selected.plate); setEditTipo(selected.tipo as "carro" | "moto"); setEditModelo(selected.modelo ?? ""); setEditing(true); }} className="p-2 text-fg-5 hover:text-fg hover:bg-surface-3 rounded-sm transition-colors">
                    <Pencil size={16} />
                  </button>
                  <button onClick={handleDeleteVehicle} disabled={deletingVeh} className="p-2 text-fg-5 hover:text-red-400 hover:bg-red-950/20 rounded-sm transition-colors">
                    {deletingVeh ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Tabs */}
          <div className="flex border-b border-border bg-surface-2 flex-shrink-0 px-4 md:px-6">
            <button
              onClick={() => setActiveTab("documentos")}
              className={`flex items-center gap-2 px-3 py-2.5 text-xs font-medium border-b-2 -mb-px transition-colors ${
                activeTab === "documentos"
                  ? "border-accent text-accent"
                  : "border-transparent text-fg-5 hover:text-fg-3"
              }`}
            >
              <FileText size={13} /> Documentos
            </button>
            <button
              onClick={() => setActiveTab("inspecciones")}
              className={`flex items-center gap-2 px-3 py-2.5 text-xs font-medium border-b-2 -mb-px transition-colors ${
                activeTab === "inspecciones"
                  ? "border-accent text-accent"
                  : "border-transparent text-fg-5 hover:text-fg-3"
              }`}
            >
              <ClipboardCheck size={13} /> Inspecciones
            </button>
          </div>

          {/* Contenido del tab */}
          {activeTab === "documentos"
            ? <DocumentosTab vehicle={selected} onVehicleUpdated={handleVehicleUpdated} />
            : <InspeccionesTab vehicle={selected} />
          }
        </div>
      ) : (
        <div className="hidden md:flex flex-1 flex-col items-center justify-center gap-3 text-fg-6">
          <Truck size={48} strokeWidth={1} />
          <p className="text-sm">Selecciona un vehículo para ver sus documentos e inspecciones</p>
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
            <label className="text-xs text-fg-5 block mb-1.5">Tipo *</label>
            <div className="flex gap-2 mb-4">
              <button type="button" onClick={() => setNewTipo("carro")}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-semibold border transition-colors ${newTipo === "carro" ? "bg-accent text-black border-accent" : "border-border text-fg-5 hover:border-fg-4"}`}>
                <Truck size={13} /> Carro
              </button>
              <button type="button" onClick={() => setNewTipo("moto")}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-semibold border transition-colors ${newTipo === "moto" ? "bg-accent text-black border-accent" : "border-border text-fg-5 hover:border-fg-4"}`}>
                <Bike size={13} /> Moto
              </button>
            </div>
            <label className="text-xs text-fg-5 block mb-1.5">Placa *</label>
            <input
              autoFocus
              className="w-full bg-surface-3 border border-border text-fg text-sm px-3 py-2.5 outline-none focus:border-accent placeholder:text-fg-6 font-mono uppercase"
              placeholder="Ej: ABC-123"
              value={newPlate} onChange={e => setNewPlate(e.target.value.toUpperCase())}
              onKeyDown={e => e.key === "Enter" && handleCreate()}
            />
            <label className="text-xs text-fg-5 block mt-3 mb-1.5">Modelo</label>
            <input
              className="w-full bg-surface-3 border border-border text-fg text-sm px-3 py-2.5 outline-none focus:border-accent placeholder:text-fg-6"
              placeholder="Ej: Hilux 2020"
              value={newModelo} onChange={e => setNewModelo(e.target.value)}
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
