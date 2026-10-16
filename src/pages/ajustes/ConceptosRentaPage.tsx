import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, X, Loader2, Tag } from "lucide-react";
import { createPortal } from "react-dom";
import { api, type RentalBillingConcept } from "../../services/api";
import { toast } from "sonner";

function formatCOP(v: number | null | undefined): string {
  if (v == null) return "—";
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(v);
}

const CATEGORIES = [
  { value: "", label: "Sin categoría" },
  { value: "transporte", label: "Transporte" },
  { value: "combustible", label: "Combustible" },
  { value: "mantenimiento", label: "Mantenimiento" },
  { value: "operador", label: "Operador" },
  { value: "otro", label: "Otro" },
];

export default function ConceptosRentaPage() {
  const [items, setItems] = useState<RentalBillingConcept[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<RentalBillingConcept | null>(null);
  const [showInactive, setShowInactive] = useState(false);

  async function load() {
    setLoading(true);
    try {
      setItems(await api.rental.listBillingConcepts(!showInactive));
    } catch {
      toast.error("Error al cargar conceptos");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [showInactive]);

  async function handleDelete(id: string, name: string) {
    if (!confirm(`¿Desactivar "${name}"? Dejará de aparecer en la lista pero no se perderá en reportes históricos.`)) return;
    await api.rental.deleteBillingConcept(id);
    toast.success("Concepto desactivado");
    load();
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4 animate-fade-up">
        <div>
          <p className="text-fg-6 text-xs uppercase tracking-wider mb-1">Ajustes</p>
          <h1 className="text-fg text-xl font-semibold">Conceptos de facturación · Renta</h1>
          <p className="text-fg-5 text-xs mt-1">
            Catálogo reutilizable para añadir ítems al reporte (transporte, combustible, mantenimiento, etc.).
          </p>
        </div>
        <button
          onClick={() => { setEditing(null); setShowModal(true); }}
          className="flex items-center gap-2 bg-accent hover:bg-accent-light text-zinc-900 font-semibold
                     text-xs uppercase tracking-wider px-4 py-2.5 transition-all hover:shadow-glow"
        >
          <Plus size={15} /> Nuevo concepto
        </button>
      </div>

      <div className="flex items-center gap-3 animate-fade-up">
        <label className="flex items-center gap-2 text-xs text-fg-4 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={showInactive}
            onChange={(e) => setShowInactive(e.target.checked)}
            className="accent-accent"
          />
          Mostrar inactivos
        </label>
        <span className="text-xs text-fg-6 ml-auto">{items.length} conceptos</span>
      </div>

      <div className="bg-surface-2 border border-border overflow-hidden animate-fade-up">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[800px]">
            <thead>
              <tr className="border-b border-border bg-surface-3 text-fg-5 text-[10px] uppercase tracking-wider">
                <th className="text-left px-3 py-2 font-medium">Nombre</th>
                <th className="text-left px-3 py-2 font-medium">Descripción</th>
                <th className="text-left px-3 py-2 font-medium">Categoría</th>
                <th className="text-right px-3 py-2 font-medium">Cant. por defecto</th>
                <th className="text-right px-3 py-2 font-medium">Vr unit por defecto</th>
                <th className="text-center px-3 py-2 font-medium">Estado</th>
                <th className="text-right px-3 py-2 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading && (
                <tr><td colSpan={7} className="text-center py-10 text-fg-6 text-sm">
                  <Loader2 size={14} className="inline animate-spin mr-2" /> Cargando...
                </td></tr>
              )}
              {!loading && items.length === 0 && (
                <tr><td colSpan={7} className="text-center py-12 text-fg-6 text-sm">
                  Sin conceptos. Crea el primero con el botón arriba.
                </td></tr>
              )}
              {!loading && items.map(c => (
                <tr key={c.id} className="hover:bg-surface-3 transition-colors">
                  <td className="px-3 py-2.5 text-fg-2 text-sm font-medium">{c.name}</td>
                  <td className="px-3 py-2.5 text-fg-4 text-xs truncate max-w-[260px]">{c.description ?? "—"}</td>
                  <td className="px-3 py-2.5 text-fg-4 text-xs">
                    {c.category ? (
                      <span className="inline-flex items-center gap-1 bg-accent/10 text-accent border border-accent/30 px-2 py-0.5 text-[11px] rounded-sm">
                        <Tag size={10} /> {c.category}
                      </span>
                    ) : "—"}
                  </td>
                  <td className="px-3 py-2.5 text-right text-fg-3 text-xs font-mono">{c.default_qty}</td>
                  <td className="px-3 py-2.5 text-right text-fg-3 text-xs font-mono">{formatCOP(c.default_unit_value)}</td>
                  <td className="px-3 py-2.5 text-center">
                    {c.is_active ? (
                      <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold px-2 py-0.5 rounded-sm">ACTIVO</span>
                    ) : (
                      <span className="bg-surface-4 text-fg-5 border border-border text-[10px] font-bold px-2 py-0.5 rounded-sm">INACTIVO</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <div className="inline-flex items-center gap-1">
                      <button
                        onClick={() => { setEditing(c); setShowModal(true); }}
                        className="text-fg-5 hover:text-accent transition-colors p-1"
                        title="Editar"
                      >
                        <Pencil size={13} />
                      </button>
                      {c.is_active && (
                        <button
                          onClick={() => handleDelete(c.id, c.name)}
                          className="text-fg-5 hover:text-red-400 transition-colors p-1"
                          title="Desactivar"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <ConceptoModal
          concept={editing}
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); load(); }}
        />
      )}
    </div>
  );
}


function ConceptoModal({
  concept, onClose, onSaved,
}: {
  concept: RentalBillingConcept | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!concept;
  const [name, setName] = useState(concept?.name ?? "");
  const [description, setDescription] = useState(concept?.description ?? "");
  const [category, setCategory] = useState(concept?.category ?? "");
  const [defaultQty, setDefaultQty] = useState(String(concept?.default_qty ?? 1));
  const [defaultUnit, setDefaultUnit] = useState(concept?.default_unit_value?.toString() ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    if (!name.trim()) { setError("El nombre es obligatorio"); return; }
    setSaving(true);
    setError(null);
    try {
      const payload = {
        name: name.trim(),
        description: description.trim() || null,
        category: category || null,
        default_qty: Number(defaultQty) || 1,
        default_unit_value: defaultUnit ? Number(defaultUnit) : null,
      };
      if (isEdit && concept) {
        await api.rental.updateBillingConcept(concept.id, payload);
      } else {
        await api.rental.createBillingConcept(payload);
      }
      onSaved();
    } catch (e: any) {
      setError(e?.detail ?? "Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-surface-2 border border-border w-full max-w-lg shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-fg font-semibold text-sm">{isEdit ? "Editar concepto" : "Nuevo concepto"}</h2>
          <button onClick={onClose} className="text-fg-5 hover:text-fg transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] uppercase tracking-wider text-fg-5 font-medium">Nombre *</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Transporte de devolución, ACPM, Mantenimiento 500h..."
              className="bg-surface-3 border border-border text-sm text-fg-2 px-3 py-2 outline-none focus:border-accent"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] uppercase tracking-wider text-fg-5 font-medium">Descripción (opcional)</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={2}
              placeholder="Detalle adicional que aparecerá en el reporte"
              className="bg-surface-3 border border-border text-sm text-fg-2 px-3 py-2 outline-none focus:border-accent resize-none"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] uppercase tracking-wider text-fg-5 font-medium">Categoría</label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value)}
                className="bg-surface-3 border border-border text-sm text-fg-2 px-3 py-2 outline-none focus:border-accent"
              >
                {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] uppercase tracking-wider text-fg-5 font-medium">Cantidad por defecto</label>
              <input
                type="number"
                step="0.01"
                value={defaultQty}
                onChange={e => setDefaultQty(e.target.value)}
                className="bg-surface-3 border border-border text-sm text-fg-2 px-3 py-2 outline-none focus:border-accent"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] uppercase tracking-wider text-fg-5 font-medium">Vr unit por defecto</label>
              <input
                type="number"
                value={defaultUnit}
                onChange={e => setDefaultUnit(e.target.value)}
                placeholder="500000"
                className="bg-surface-3 border border-border text-sm text-fg-2 px-3 py-2 outline-none focus:border-accent"
              />
            </div>
          </div>

          {error && (
            <div className="text-red-400 text-xs bg-red-950/30 border border-red-900/40 px-3 py-2">{error}</div>
          )}

          <p className="text-fg-6 text-[10px]">
            Al usar este concepto en un reporte, los valores quedan congelados (snapshot). Si editas después, los
            reportes históricos siguen con el nombre y valor original.
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
            disabled={saving || !name.trim()}
            className="px-4 py-2 text-xs font-semibold bg-accent hover:bg-accent-light text-zinc-900 transition-all hover:shadow-glow disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {saving ? "Guardando..." : (isEdit ? "Guardar cambios" : "Crear concepto")}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
