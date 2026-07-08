import { useState, useEffect, useCallback } from "react";
import { Plus, Pencil, Trash2, AlertTriangle, Loader2, AlertCircle, Truck } from "lucide-react";
import { api, type SupplierResponse } from "../../services/api";

type ModalProps = {
  supplier: SupplierResponse | null;
  onClose: () => void;
  onSaved: () => void;
};

function SupplierModal({ supplier, onClose, onSaved }: ModalProps) {
  const isEdit = !!supplier;
  const [form, setForm] = useState({
    name:          supplier?.name          ?? "",
    country:       supplier?.country       ?? "",
    contact_name:  supplier?.contact_name  ?? "",
    contact_email: supplier?.contact_email ?? "",
    contact_phone: supplier?.contact_phone ?? "",
    website:       supplier?.website       ?? "",
    notes:         supplier?.notes         ?? "",
  });
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((prev) => ({ ...prev, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const payload = {
        name:          form.name,
        country:       form.country       || undefined,
        contact_name:  form.contact_name  || undefined,
        contact_email: form.contact_email || undefined,
        contact_phone: form.contact_phone || undefined,
        website:       form.website       || undefined,
        notes:         form.notes         || undefined,
      };
      if (isEdit) {
        await api.suppliers.update(supplier.id, payload);
      } else {
        await api.suppliers.create(payload);
      }
      onSaved();
    } catch (err: unknown) {
      const e = err as { detail?: string };
      setError(e?.detail ?? "Ocurrió un error. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-surface-2 border border-border w-full max-w-md shadow-card animate-fade-up">
        <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-accent to-transparent" />
        <div className="p-6">
          <h2 className="text-fg text-base font-semibold mb-5">
            {isEdit ? "Editar proveedor" : "Nuevo proveedor"}
          </h2>
          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-fg-4 text-xs font-medium uppercase tracking-wider">Nombre *</label>
              <input value={form.name} onChange={set("name")} required className="input-dark w-full" placeholder="ej. LONKING" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-fg-4 text-xs font-medium uppercase tracking-wider">País</label>
                <input value={form.country} onChange={set("country")} className="input-dark w-full" placeholder="China" />
              </div>
              <div className="space-y-1.5">
                <label className="text-fg-4 text-xs font-medium uppercase tracking-wider">Teléfono</label>
                <input value={form.contact_phone} onChange={set("contact_phone")} className="input-dark w-full" placeholder="+86..." />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-fg-4 text-xs font-medium uppercase tracking-wider">Contacto</label>
              <input value={form.contact_name} onChange={set("contact_name")} className="input-dark w-full" placeholder="Nombre del contacto" />
            </div>
            <div className="space-y-1.5">
              <label className="text-fg-4 text-xs font-medium uppercase tracking-wider">Email</label>
              <input value={form.contact_email} onChange={set("contact_email")} type="email" className="input-dark w-full" placeholder="contacto@proveedor.com" />
            </div>
            <div className="space-y-1.5">
              <label className="text-fg-4 text-xs font-medium uppercase tracking-wider">Sitio web</label>
              <input value={form.website} onChange={set("website")} className="input-dark w-full" placeholder="https://..." />
            </div>
            <div className="space-y-1.5">
              <label className="text-fg-4 text-xs font-medium uppercase tracking-wider">Notas</label>
              <textarea value={form.notes} onChange={set("notes")} rows={2} className="input-dark w-full resize-none" placeholder="Observaciones..." />
            </div>

            {error && (
              <div className="flex items-start gap-2.5 bg-red-950/40 border border-red-800/40 px-3 py-2.5">
                <AlertCircle size={13} className="text-red-400 mt-0.5 flex-shrink-0" />
                <p className="text-red-400 text-xs">{error}</p>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-1">
              <button type="button" onClick={onClose}
                className="px-4 py-2 text-xs text-fg-4 border border-border hover:border-border-light transition-all">
                Cancelar
              </button>
              <button type="submit" disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent-light text-zinc-900
                           font-semibold text-xs uppercase tracking-wider transition-all hover:shadow-glow disabled:opacity-60">
                {loading && <Loader2 size={13} className="animate-spin" />}
                {isEdit ? "Guardar" : "Crear proveedor"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function ProveedoresPage() {
  const [suppliers,    setSuppliers]    = useState<SupplierResponse[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [modalOpen,    setModalOpen]    = useState(false);
  const [editing,      setEditing]      = useState<SupplierResponse | null>(null);
  const [deletingId,   setDeletingId]   = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { setSuppliers(await api.suppliers.list()); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate  = () => { setEditing(null); setModalOpen(true); };
  const openEdit    = (s: SupplierResponse) => { setEditing(s); setModalOpen(true); };
  const closeModal  = () => { setModalOpen(false); setEditing(null); };
  const handleSaved = () => { closeModal(); load(); };

  const confirmDelete = async (id: string) => {
    setDeleteLoading(true);
    try { await api.suppliers.deactivate(id); setDeletingId(null); load(); }
    finally { setDeleteLoading(false); }
  };

  return (
    <div className="space-y-5 max-w-[800px]">
      <div className="flex items-start justify-between gap-4 animate-fade-up">
        <div>
          <p className="text-fg-6 text-xs uppercase tracking-wider mb-1">Ajustes</p>
          <h1 className="text-fg text-xl font-semibold">Proveedores</h1>
        </div>
        <button onClick={openCreate}
          className="flex items-center gap-2 bg-accent hover:bg-accent-light text-zinc-900 font-semibold
                     text-xs uppercase tracking-wider px-4 py-2.5 transition-all hover:shadow-glow hover:-translate-y-px flex-shrink-0">
          <Plus size={15} /> Nuevo proveedor
        </button>
      </div>

      <div className="bg-surface-2 border border-border overflow-hidden animate-fade-up" style={{ animationDelay: "60ms", animationFillMode: "both" }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-3 text-fg-5 text-[11px] uppercase tracking-wider font-medium">Proveedor</th>
                <th className="text-left px-4 py-3 text-fg-5 text-[11px] uppercase tracking-wider font-medium">País</th>
                <th className="text-left px-4 py-3 text-fg-5 text-[11px] uppercase tracking-wider font-medium">Contacto</th>
                <th className="text-left px-4 py-3 text-fg-5 text-[11px] uppercase tracking-wider font-medium">Email</th>
                <th className="text-right px-4 py-3 text-fg-5 text-[11px] uppercase tracking-wider font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading && (
                <tr><td colSpan={5} className="text-center py-10 text-fg-6 text-sm">
                  <Loader2 size={16} className="animate-spin inline-block mr-2" />Cargando...
                </td></tr>
              )}
              {!loading && suppliers.length === 0 && (
                <tr><td colSpan={5} className="text-center py-10 text-fg-6 text-sm">No hay proveedores registrados</td></tr>
              )}
              {!loading && suppliers.map((s) => (
                <>
                  <tr key={s.id} className="hover:bg-surface-3 transition-colors cursor-pointer group" onClick={() => openEdit(s)}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <Truck size={14} className="text-accent opacity-70 flex-shrink-0" />
                        <span className="text-fg-2 font-medium text-sm">{s.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-fg-5 text-xs">{s.country ?? "—"}</td>
                    <td className="px-4 py-3 text-fg-5 text-xs">{s.contact_name ?? "—"}</td>
                    <td className="px-4 py-3 text-fg-5 text-xs">{s.contact_email ?? "—"}</td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        <button onClick={() => openEdit(s)}
                          className="w-8 h-8 flex items-center justify-center text-fg-5 hover:text-accent hover:bg-surface-4 transition-all">
                          <Pencil size={14} />
                        </button>
                        <button onClick={() => setDeletingId(s.id)}
                          className="w-8 h-8 flex items-center justify-center text-fg-5 hover:text-red-400 hover:bg-red-950/20 transition-all">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                  {deletingId === s.id && (
                    <tr key={`del-${s.id}`} className="bg-red-950/20 border-b border-red-900/30">
                      <td colSpan={5} className="px-4 py-3">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-2.5 text-red-300">
                            <AlertTriangle size={15} />
                            <span className="text-sm">¿Desactivar el proveedor <strong>{s.name}</strong>?</span>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <button onClick={() => setDeletingId(null)}
                              className="px-4 py-1.5 text-xs text-fg-4 border border-border hover:border-border-light transition-all">
                              Cancelar
                            </button>
                            <button onClick={() => confirmDelete(s.id)} disabled={deleteLoading}
                              className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-red-700 hover:bg-red-600 transition-all disabled:opacity-60">
                              {deleteLoading && <Loader2 size={12} className="animate-spin" />}
                              Desactivar
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
        <div className="px-4 py-3 border-t border-border bg-surface-3">
          <p className="text-fg-6 text-xs"><span className="text-fg-4">{suppliers.length}</span> proveedores en total</p>
        </div>
      </div>

      {modalOpen && <SupplierModal supplier={editing} onClose={closeModal} onSaved={handleSaved} />}
    </div>
  );
}
