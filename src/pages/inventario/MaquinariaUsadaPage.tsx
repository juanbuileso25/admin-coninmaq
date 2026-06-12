import { useState, useMemo } from "react";
import {
  Plus, Search, Eye, EyeOff, Star, StarOff,
  Pencil, Trash2, AlertTriangle, Filter, ImageOff, Loader2, Clock, Calendar, Copy,
} from "lucide-react";
import { toast } from "sonner";
import { useMachines } from "../../hooks/useMachines";
import MachineDrawer from "../../components/inventario/MachineDrawer";
import type { Machine } from "../../types/machine";
import { CATEGORIES } from "../../types/machine";

/* ── Category badge colors ── */
const CAT_COLORS: Record<string, string> = {
  "Excavadora":         "bg-blue-950/60   text-blue-300   border-blue-800/40",
  "Miniexcavadora":     "bg-purple-950/60 text-purple-300 border-purple-800/40",
  "Cargador de Ruedas": "bg-orange-950/60 text-orange-300 border-orange-800/40",
  "Minicargador":       "bg-teal-950/60   text-teal-300   border-teal-800/40",
  "Retrocargadora":     "bg-amber-950/60  text-amber-300  border-amber-800/40",
};

const CONDITION_COLORS: Record<string, string> = {
  "Excelente": "bg-emerald-950/60 text-emerald-300 border-emerald-800/40",
  "Muy bueno": "bg-blue-950/60   text-blue-300   border-blue-800/40",
  "Bueno":     "bg-amber-950/60  text-amber-300  border-amber-800/40",
};

const formatCOP = (n: number) =>
  n === 0
    ? "Consultar"
    : new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);

/* ── Toggle switch ── */
function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      type="button" onClick={(e) => { e.stopPropagation(); onChange(); }}
      className={`relative w-9 h-5 rounded-full transition-colors duration-200 ${checked ? "bg-accent" : "bg-surface-5"}`}
    >
      <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all duration-200 ${checked ? "left-4" : "left-0.5"}`} />
    </button>
  );
}

/* ── Main page ── */
export default function MaquinariaUsadaPage() {
  const { machines, loading, error, addMachine, updateMachine, removeMachine, toggleField, refresh } = useMachines("used");

  const [search,     setSearch]     = useState("");
  const [catFilter,  setCatFilter]  = useState<string>("");
  const [drawerOpen,   setDrawerOpen]   = useState(false);
  const [editing,      setEditing]      = useState<Machine | null>(null);
  const [duplicating,  setDuplicating]  = useState<Machine | null>(null);
  const [deletingId,   setDeletingId]   = useState<string | null>(null);

  /* Filtered list */
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return machines.filter((m) => {
      const matchSearch = !q || m.model.toLowerCase().includes(q) || m.code.toLowerCase().includes(q) || m.brand.toLowerCase().includes(q);
      const matchCat    = !catFilter || m.category === catFilter;
      return matchSearch && matchCat;
    });
  }, [machines, search, catFilter]);

  /* Stats */
  const total    = machines.length;
  const visibles = machines.filter((m) => m.visible_web).length;
  const featured = machines.filter((m) => m.featured).length;

  /* Handlers */
  const openCreate    = () => { setEditing(null); setDuplicating(null); setDrawerOpen(true); };
  const openEdit      = (m: Machine) => { setEditing(m); setDuplicating(null); setDrawerOpen(true); };
  const openDuplicate = (m: Machine) => { setEditing(null); setDuplicating(m); setDrawerOpen(true); };
  const closeDrawer   = (changed: boolean) => { setDrawerOpen(false); setEditing(null); setDuplicating(null); if (changed) refresh(); };

  const handleSave = async (data: Omit<Machine, "id" | "created_at" | "updated_at">): Promise<Machine | undefined> => {
    try {
      let saved: Machine | undefined;
      if (editing) {
        await updateMachine(editing.id, data);
        saved = { ...editing, ...data };
      } else {
        saved = await addMachine(data);
      }
      return saved;
    } catch (e: unknown) {
      const err = e as { detail?: string };
      toast.error(err.detail ?? "Error al guardar");
      return undefined;
    }
  };

  const confirmDelete = async (id: string) => {
    try {
      await removeMachine(id);
      setDeletingId(null);
      toast.success("Máquina eliminada");
    } catch (e: unknown) {
      const err = e as { detail?: string };
      toast.error(err.detail ?? "Error al eliminar");
    }
  };

  /* ── Loading state ── */
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 gap-3 text-fg-5">
        <Loader2 size={20} className="animate-spin" />
        <span className="text-sm">Cargando inventario...</span>
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-[1200px]">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 animate-fade-up">
        <div>
          <p className="text-fg-6 text-xs uppercase tracking-wider mb-1">Inventario</p>
          <h1 className="text-fg text-xl font-semibold">Maquinaria Usada</h1>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-accent hover:bg-accent-light text-zinc-900 font-semibold
                     text-xs uppercase tracking-wider px-4 py-2.5 transition-all hover:shadow-glow hover:-translate-y-px flex-shrink-0"
        >
          <Plus size={15} /> Nuevo producto
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2.5 bg-red-950/30 border border-red-900/40 px-4 py-3 text-red-300 text-sm">
          <AlertTriangle size={15} className="flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 animate-fade-up" style={{ animationDelay: "60ms", animationFillMode: "both" }}>
        {[
          { label: "Total",      value: total,    color: "text-fg" },
          { label: "Visibles",   value: visibles, color: "text-emerald-400" },
          { label: "Destacados", value: featured, color: "text-accent" },
        ].map((s) => (
          <div key={s.label} className="bg-surface-2 border border-border px-4 py-3 flex items-center justify-between">
            <span className="text-fg-5 text-xs">{s.label}</span>
            <span className={`text-lg font-bold ${s.color}`}>{s.value}</span>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div
        className="flex flex-wrap items-center gap-3 animate-fade-up"
        style={{ animationDelay: "100ms", animationFillMode: "both" }}
      >
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-5" />
          <input
            value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por modelo, código o marca..."
            className="w-full bg-surface-2 border border-border text-sm text-fg-2 pl-9 pr-4 py-2.5
                       placeholder:text-fg-6 outline-none focus:border-accent transition-all"
          />
        </div>
        <div className="relative">
          <Filter size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-5 pointer-events-none" />
          <select
            value={catFilter} onChange={(e) => setCatFilter(e.target.value)}
            className="bg-surface-2 border border-border text-sm text-fg-3 pl-8 pr-8 py-2.5
                       outline-none focus:border-accent transition-all appearance-none cursor-pointer"
          >
            <option value="">Todas las categorías</option>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      {/* Table */}
      <div
        className="bg-surface-2 border border-border overflow-hidden animate-fade-up"
        style={{ animationDelay: "140ms", animationFillMode: "both" }}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-3 text-fg-5 text-[11px] uppercase tracking-wider font-medium w-14">Img</th>
                <th className="text-left px-4 py-3 text-fg-5 text-[11px] uppercase tracking-wider font-medium">Código</th>
                <th className="text-left px-4 py-3 text-fg-5 text-[11px] uppercase tracking-wider font-medium">Modelo</th>
                <th className="text-left px-4 py-3 text-fg-5 text-[11px] uppercase tracking-wider font-medium">Categoría</th>
                <th className="text-left px-4 py-3 text-fg-5 text-[11px] uppercase tracking-wider font-medium">Año / Horas</th>
                <th className="text-left px-4 py-3 text-fg-5 text-[11px] uppercase tracking-wider font-medium">Condición</th>
                <th className="text-left px-4 py-3 text-fg-5 text-[11px] uppercase tracking-wider font-medium">Precio</th>
                <th className="text-center px-4 py-3 text-fg-5 text-[11px] uppercase tracking-wider font-medium">Web</th>
                <th className="text-center px-4 py-3 text-fg-5 text-[11px] uppercase tracking-wider font-medium">Dest.</th>
                <th className="text-right px-4 py-3 text-fg-5 text-[11px] uppercase tracking-wider font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={10} className="text-center py-12 text-fg-6 text-sm">
                    No se encontraron productos
                  </td>
                </tr>
              )}
              {filtered.map((m) => (
                <>
                  <tr
                    key={m.id}
                    className="hover:bg-surface-3 transition-colors duration-100 group cursor-pointer"
                    onClick={() => openEdit(m)}
                  >
                    {/* Imagen */}
                    <td className="px-4 py-3">
                      <div className="w-10 h-10 bg-surface-4 border border-border flex items-center justify-center overflow-hidden flex-shrink-0">
                        {m.image_url ? (
                          <img
                            src={m.image_url} alt={m.model}
                            className="w-full h-full object-contain p-0.5"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                          />
                        ) : (
                          <ImageOff size={14} className="text-fg-6" />
                        )}
                      </div>
                    </td>

                    {/* Código */}
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs text-fg-4 bg-surface-4 border border-border px-2 py-0.5">
                        {m.code}
                      </span>
                    </td>

                    {/* Modelo */}
                    <td className="px-4 py-3">
                      <p className="text-fg-2 font-medium text-sm">{m.model}</p>
                      <p className="text-fg-6 text-[11px]">{m.brand}</p>
                    </td>

                    {/* Categoría */}
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 text-[11px] font-medium border ${CAT_COLORS[m.category] ?? ""}`}>
                        {m.category}
                      </span>
                    </td>

                    {/* Año / Horas */}
                    <td className="px-4 py-3">
                      <div className="space-y-0.5">
                        {m.year ? (
                          <div className="flex items-center gap-1 text-fg-3 text-xs">
                            <Calendar size={11} className="text-fg-5" /> {m.year}
                          </div>
                        ) : (
                          <span className="text-fg-6 text-xs">—</span>
                        )}
                        {m.hours_used && (
                          <div className="flex items-center gap-1 text-fg-4 text-[11px]">
                            <Clock size={10} className="text-fg-6" /> {m.hours_used}
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Condición */}
                    <td className="px-4 py-3">
                      {m.condition ? (
                        <span className={`inline-flex items-center px-2 py-0.5 text-[11px] font-medium border ${CONDITION_COLORS[m.condition] ?? "bg-surface-4 text-fg-4 border-border"}`}>
                          {m.condition}
                        </span>
                      ) : (
                        <span className="text-fg-6 text-xs">—</span>
                      )}
                    </td>

                    {/* Precio */}
                    <td className="px-4 py-3">
                      <p className={`text-sm font-semibold ${m.price === 0 ? "text-fg-5 italic" : "text-fg"}`}>
                        {formatCOP(m.price)}
                      </p>
                    </td>

                    {/* Visible web */}
                    <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-center gap-1.5">
                        <ToggleSwitch checked={m.visible_web} onChange={async () => {
                          try { await toggleField(m.id, "visible_web"); }
                          catch { toast.error("Error al actualizar visibilidad"); }
                        }} />
                        {m.visible_web
                          ? <Eye size={13} className="text-emerald-400" />
                          : <EyeOff size={13} className="text-fg-6" />}
                      </div>
                    </td>

                    {/* Destacado */}
                    <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-center gap-1.5">
                        <ToggleSwitch checked={m.featured} onChange={async () => {
                          try { await toggleField(m.id, "featured"); }
                          catch { toast.error("Error al actualizar destacado"); }
                        }} />
                        {m.featured
                          ? <Star size={13} className="text-accent fill-accent" />
                          : <StarOff size={13} className="text-fg-6" />}
                      </div>
                    </td>

                    {/* Acciones */}
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openEdit(m)}
                          className="w-8 h-8 flex items-center justify-center text-fg-5 hover:text-accent hover:bg-surface-4 transition-all"
                          title="Editar"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => openDuplicate(m)}
                          className="w-8 h-8 flex items-center justify-center text-fg-5 hover:text-sky-400 hover:bg-sky-950/20 transition-all"
                          title="Duplicar"
                        >
                          <Copy size={14} />
                        </button>
                        <button
                          onClick={() => setDeletingId(m.id)}
                          className="w-8 h-8 flex items-center justify-center text-fg-5 hover:text-red-400 hover:bg-red-950/20 transition-all"
                          title="Eliminar"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>

                  {/* Delete confirmation row */}
                  {deletingId === m.id && (
                    <tr key={`del-${m.id}`} className="bg-red-950/20 border-b border-red-900/30">
                      <td colSpan={10} className="px-4 py-3">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-2.5 text-red-300">
                            <AlertTriangle size={15} />
                            <span className="text-sm">
                              ¿Eliminar <strong>{m.model}</strong>? Esta acción no se puede deshacer.
                            </span>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <button
                              onClick={() => setDeletingId(null)}
                              className="px-4 py-1.5 text-xs text-fg-4 border border-border hover:border-border-light transition-all"
                            >
                              Cancelar
                            </button>
                            <button
                              onClick={() => confirmDelete(m.id)}
                              className="px-4 py-1.5 text-xs font-semibold text-white bg-red-700 hover:bg-red-600 transition-all"
                            >
                              Eliminar
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer count */}
        <div className="px-4 py-3 border-t border-border bg-surface-3">
          <p className="text-fg-6 text-xs">
            Mostrando <span className="text-fg-4">{filtered.length}</span> de{" "}
            <span className="text-fg-4">{total}</span> productos
          </p>
        </div>
      </div>

      {/* Drawer */}
      <MachineDrawer
        open={drawerOpen}
        machine={editing}
        duplicateFrom={duplicating}
        defaultMachineTypeSlug="used"
        onClose={closeDrawer}
        onSave={handleSave}
      />
    </div>
  );
}
