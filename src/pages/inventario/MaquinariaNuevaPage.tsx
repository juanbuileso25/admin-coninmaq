import { useState, useMemo } from "react";
import {
  Plus, Search, Eye, EyeOff, Star, StarOff,
  Pencil, Trash2, AlertTriangle, Filter, ImageOff,
} from "lucide-react";
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
export default function MaquinariaNuevaPage() {
  const { machines, addMachine, updateMachine, removeMachine, toggleField } = useMachines();

  const [search,    setSearch]    = useState("");
  const [catFilter, setCatFilter] = useState<string>("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing,    setEditing]    = useState<Machine | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  /* Filtered list */
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return machines.filter((m) => {
      const matchSearch = !q || m.modelo.toLowerCase().includes(q) || m.codigo.toLowerCase().includes(q) || m.marca.toLowerCase().includes(q);
      const matchCat    = !catFilter || m.categoria === catFilter;
      return matchSearch && matchCat;
    });
  }, [machines, search, catFilter]);

  /* Stats */
  const total     = machines.length;
  const visibles  = machines.filter((m) => m.visible_web).length;
  const destacados = machines.filter((m) => m.destacado).length;

  /* Handlers */
  const openCreate = () => { setEditing(null); setDrawerOpen(true); };
  const openEdit   = (m: Machine) => { setEditing(m); setDrawerOpen(true); };
  const closeDrawer = () => { setDrawerOpen(false); setEditing(null); };

  const handleSave = (data: Omit<Machine, "id" | "created_at" | "updated_at">) => {
    if (editing) {
      updateMachine(editing.id, data);
    } else {
      addMachine(data);
    }
    closeDrawer();
  };

  const confirmDelete = (id: string) => { removeMachine(id); setDeletingId(null); };

  return (
    <div className="space-y-5 max-w-[1200px]">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 animate-fade-up">
        <div>
          <p className="text-zinc-600 text-xs uppercase tracking-wider mb-1">Inventario</p>
          <h1 className="text-white text-xl font-semibold">Maquinaria Nueva</h1>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-accent hover:bg-accent-light text-zinc-900 font-semibold
                     text-xs uppercase tracking-wider px-4 py-2.5 transition-all hover:shadow-glow hover:-translate-y-px flex-shrink-0"
        >
          <Plus size={15} /> Nuevo producto
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 animate-fade-up" style={{ animationDelay: "60ms", animationFillMode: "both" }}>
        {[
          { label: "Total",       value: total,      color: "text-white" },
          { label: "Visibles",    value: visibles,   color: "text-emerald-400" },
          { label: "Destacados",  value: destacados, color: "text-accent" },
        ].map((s) => (
          <div key={s.label} className="bg-surface-2 border border-border px-4 py-3 flex items-center justify-between">
            <span className="text-zinc-500 text-xs">{s.label}</span>
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
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por modelo, código o marca..."
            className="w-full bg-surface-2 border border-border text-sm text-zinc-200 pl-9 pr-4 py-2.5
                       placeholder:text-zinc-600 outline-none focus:border-accent transition-all"
          />
        </div>
        <div className="relative">
          <Filter size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
          <select
            value={catFilter} onChange={(e) => setCatFilter(e.target.value)}
            className="bg-surface-2 border border-border text-sm text-zinc-300 pl-8 pr-8 py-2.5
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
                <th className="text-left px-4 py-3 text-zinc-500 text-[11px] uppercase tracking-wider font-medium w-14">Img</th>
                <th className="text-left px-4 py-3 text-zinc-500 text-[11px] uppercase tracking-wider font-medium">Código</th>
                <th className="text-left px-4 py-3 text-zinc-500 text-[11px] uppercase tracking-wider font-medium">Modelo</th>
                <th className="text-left px-4 py-3 text-zinc-500 text-[11px] uppercase tracking-wider font-medium">Categoría</th>
                <th className="text-left px-4 py-3 text-zinc-500 text-[11px] uppercase tracking-wider font-medium">Precio</th>
                <th className="text-center px-4 py-3 text-zinc-500 text-[11px] uppercase tracking-wider font-medium">Web</th>
                <th className="text-center px-4 py-3 text-zinc-500 text-[11px] uppercase tracking-wider font-medium">Destacado</th>
                <th className="text-right px-4 py-3 text-zinc-500 text-[11px] uppercase tracking-wider font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-zinc-600 text-sm">
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
                        {m.imagen_url ? (
                          <img
                            src={m.imagen_url} alt={m.modelo}
                            className="w-full h-full object-contain p-0.5"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                          />
                        ) : (
                          <ImageOff size={14} className="text-zinc-600" />
                        )}
                      </div>
                    </td>

                    {/* Código */}
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs text-zinc-400 bg-surface-4 border border-border px-2 py-0.5">
                        {m.codigo}
                      </span>
                    </td>

                    {/* Modelo */}
                    <td className="px-4 py-3">
                      <p className="text-zinc-200 font-medium text-sm">{m.modelo}</p>
                      <p className="text-zinc-600 text-[11px]">{m.marca}</p>
                    </td>

                    {/* Categoría */}
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 text-[11px] font-medium border ${CAT_COLORS[m.categoria] ?? ""}`}>
                        {m.categoria}
                      </span>
                    </td>

                    {/* Precio */}
                    <td className="px-4 py-3">
                      <p className={`text-sm font-semibold ${m.precio === 0 ? "text-zinc-500 italic" : "text-white"}`}>
                        {formatCOP(m.precio)}
                      </p>
                      {m.mostrar_precio && m.precio > 0 && (
                        <p className="text-emerald-500 text-[10px]">Visible en web</p>
                      )}
                    </td>

                    {/* Visible web */}
                    <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-center gap-1.5">
                        <ToggleSwitch checked={m.visible_web} onChange={() => toggleField(m.id, "visible_web")} />
                        {m.visible_web
                          ? <Eye size={13} className="text-emerald-400" />
                          : <EyeOff size={13} className="text-zinc-600" />}
                      </div>
                    </td>

                    {/* Destacado */}
                    <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-center gap-1.5">
                        <ToggleSwitch checked={m.destacado} onChange={() => toggleField(m.id, "destacado")} />
                        {m.destacado
                          ? <Star size={13} className="text-accent fill-accent" />
                          : <StarOff size={13} className="text-zinc-600" />}
                      </div>
                    </td>

                    {/* Acciones */}
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openEdit(m)}
                          className="w-8 h-8 flex items-center justify-center text-zinc-500 hover:text-accent hover:bg-surface-4 transition-all"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => setDeletingId(m.id)}
                          className="w-8 h-8 flex items-center justify-center text-zinc-500 hover:text-red-400 hover:bg-red-950/20 transition-all"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>

                  {/* Delete confirmation row */}
                  {deletingId === m.id && (
                    <tr key={`del-${m.id}`} className="bg-red-950/20 border-b border-red-900/30">
                      <td colSpan={8} className="px-4 py-3">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-2.5 text-red-300">
                            <AlertTriangle size={15} />
                            <span className="text-sm">
                              ¿Eliminar <strong>{m.modelo}</strong>? Esta acción no se puede deshacer.
                            </span>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <button
                              onClick={() => setDeletingId(null)}
                              className="px-4 py-1.5 text-xs text-zinc-400 border border-border hover:border-border-light transition-all"
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
          <p className="text-zinc-600 text-xs">
            Mostrando <span className="text-zinc-400">{filtered.length}</span> de{" "}
            <span className="text-zinc-400">{total}</span> productos
          </p>
        </div>
      </div>

      {/* Drawer */}
      <MachineDrawer
        open={drawerOpen}
        machine={editing}
        onClose={closeDrawer}
        onSave={handleSave}
      />
    </div>
  );
}
