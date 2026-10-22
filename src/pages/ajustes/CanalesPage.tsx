import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Loader2, Plus, Pencil, Trash2, Radio, Lock, X } from "lucide-react";
import { toast } from "sonner";
import {
  api,
  type LeadChannelResponse,
  type LeadChannelCreate,
  type LeadChannelUpdate,
} from "../../services/api";

export default function CanalesPage() {
  const [channels, setChannels] = useState<LeadChannelResponse[]>([]);
  const [loading, setLoading]   = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing]   = useState<LeadChannelResponse | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const list = await api.leadChannels.list();
      setChannels(list);
    } catch (e: any) {
      toast.error(e?.detail ?? "Error cargando canales");
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const sorted = useMemo(
    () => [...channels].sort((a, b) => a.sort_order - b.sort_order || a.label.localeCompare(b.label)),
    [channels]
  );

  const toggleActive = async (ch: LeadChannelResponse) => {
    try {
      const upd = await api.leadChannels.update(ch.id, { is_active: !ch.is_active });
      setChannels(prev => prev.map(c => c.id === ch.id ? upd : c));
    } catch (e: any) {
      toast.error(e?.detail ?? "Error");
    }
  };

  const remove = async (ch: LeadChannelResponse) => {
    if (ch.is_system) { toast.error("No se puede eliminar un canal del sistema"); return; }
    if (!confirm(`¿Eliminar canal "${ch.label}"? Los leads que lo tengan quedarán sin canal.`)) return;
    try {
      await api.leadChannels.remove(ch.id);
      setChannels(prev => prev.filter(c => c.id !== ch.id));
      toast.success("Canal eliminado");
    } catch (e: any) {
      toast.error(e?.detail ?? "Error");
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-fg text-xl font-semibold flex items-center gap-2">
            <Radio size={18} className="text-accent" /> Canales de origen
          </h1>
          <p className="text-fg-5 text-xs mt-1">
            Fuente de los leads: WhatsApp, redes, ferias, referidos, etc. Las "huellas" se usarán para auto-asignar canal desde el bot (próximamente).
          </p>
        </div>
        <button
          onClick={() => { setEditing(null); setShowForm(true); }}
          className="flex items-center gap-1.5 bg-accent hover:bg-accent-light text-zinc-900 font-semibold text-xs uppercase tracking-wider px-3 py-2 transition-all"
        >
          <Plus size={13} /> Nuevo canal
        </button>
      </div>

      <div className="bg-surface-2 border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-surface-3">
              <tr>
                <Th>Orden</Th>
                <Th>Canal</Th>
                <Th>Code</Th>
                <Th>Huellas (bot)</Th>
                <Th>Activo</Th>
                <Th>Acciones</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr><td colSpan={6} className="py-10 text-center text-fg-5">
                  <Loader2 size={18} className="animate-spin inline text-accent" />
                </td></tr>
              ) : sorted.length === 0 ? (
                <tr><td colSpan={6} className="py-10 text-center text-fg-6 text-sm">
                  Sin canales
                </td></tr>
              ) : sorted.map(ch => (
                <tr key={ch.id} className="hover:bg-surface-3 transition-colors">
                  <td className="py-3 px-4 text-fg-5 text-xs font-mono">{ch.sort_order}</td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      {ch.color && (
                        <span className="inline-block w-3 h-3 shrink-0" style={{ background: ch.color }} />
                      )}
                      <span className="text-fg text-sm font-medium">{ch.label}</span>
                      {ch.is_system && (
                        <span title="Canal del sistema" className="text-fg-6"><Lock size={11} /></span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-fg-5 text-xs font-mono">{ch.code}</td>
                  <td className="py-3 px-4">
                    <div className="flex flex-wrap gap-1">
                      {ch.fingerprints.length === 0 ? (
                        <span className="text-fg-6 text-[10px] italic">—</span>
                      ) : ch.fingerprints.map((fp, i) => (
                        <span key={i} className="bg-surface-3 border border-border text-fg-4 text-[10px] px-1.5 py-0.5">
                          {fp}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <button
                      onClick={() => toggleActive(ch)}
                      className={`text-[10px] uppercase tracking-wider border px-2 py-0.5 ${
                        ch.is_active
                          ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/40"
                          : "bg-surface-3 text-fg-6 border-border"
                      }`}
                    >
                      {ch.is_active ? "Activo" : "Inactivo"}
                    </button>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => { setEditing(ch); setShowForm(true); }}
                        className="text-fg-5 hover:text-accent"
                        title="Editar"
                      >
                        <Pencil size={13} />
                      </button>
                      {!ch.is_system && (
                        <button onClick={() => remove(ch)} className="text-fg-5 hover:text-red-400" title="Eliminar">
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

      {showForm && (
        <CanalFormModal
          initial={editing}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSaved={(ch) => {
            setChannels(prev => {
              const idx = prev.findIndex(c => c.id === ch.id);
              return idx >= 0 ? prev.map((c, i) => i === idx ? ch : c) : [...prev, ch];
            });
            setShowForm(false); setEditing(null);
          }}
        />
      )}
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="py-2 px-4 text-left text-[10px] uppercase tracking-wider text-fg-5 font-semibold">{children}</th>;
}

// ─── Modal ──────────────────────────────────────────────────────────────────

function CanalFormModal({
  initial, onClose, onSaved,
}: {
  initial: LeadChannelResponse | null;
  onClose: () => void;
  onSaved: (ch: LeadChannelResponse) => void;
}) {
  const [code, setCode]         = useState(initial?.code ?? "");
  const [label, setLabel]       = useState(initial?.label ?? "");
  const [color, setColor]       = useState(initial?.color ?? "#64748B");
  const [sortOrder, setSortOrder] = useState<number>(initial?.sort_order ?? 100);
  const [fpInput, setFpInput]   = useState("");
  const [fingerprints, setFingerprints] = useState<string[]>(initial?.fingerprints ?? []);
  const [isActive, setIsActive] = useState(initial?.is_active ?? true);
  const [saving, setSaving]     = useState(false);

  const addFp = () => {
    const v = fpInput.trim().toLowerCase();
    if (!v) return;
    if (fingerprints.includes(v)) { setFpInput(""); return; }
    setFingerprints(prev => [...prev, v]);
    setFpInput("");
  };

  const removeFp = (i: number) => setFingerprints(prev => prev.filter((_, idx) => idx !== i));

  const submit = async () => {
    if (!label.trim()) { toast.error("Nombre requerido"); return; }
    if (!initial && !code.trim()) { toast.error("Code requerido"); return; }
    setSaving(true);
    try {
      let saved: LeadChannelResponse;
      if (initial) {
        const upd: LeadChannelUpdate = {
          label: label.trim(),
          color: color || null,
          sort_order: sortOrder,
          fingerprints,
          is_active: isActive,
        };
        saved = await api.leadChannels.update(initial.id, upd);
      } else {
        const create: LeadChannelCreate = {
          code: code.trim().toLowerCase().replace(/\s+/g, "_"),
          label: label.trim(),
          color: color || null,
          sort_order: sortOrder,
          fingerprints,
          is_active: isActive,
        };
        saved = await api.leadChannels.create(create);
      }
      toast.success(initial ? "Canal actualizado" : "Canal creado");
      onSaved(saved);
    } catch (e: any) {
      toast.error(e?.detail ?? "No se pudo guardar");
    } finally { setSaving(false); }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={saving ? undefined : onClose} />
      <div className="relative bg-surface-2 border border-border w-full max-w-xl max-h-[90vh] shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-5 py-3 border-b border-border shrink-0">
          <h2 className="text-fg font-semibold text-sm flex items-center gap-2">
            <Radio size={15} className="text-accent" /> {initial ? "Editar canal" : "Nuevo canal"}
          </h2>
          <button onClick={onClose} disabled={saving} className="text-fg-5 hover:text-fg disabled:opacity-40">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Nombre visible *">
              <input value={label} onChange={e => setLabel(e.target.value)} placeholder="WhatsApp"
                className="w-full bg-surface-3 border border-border text-fg px-2 py-2 text-sm outline-none focus:border-accent" />
            </Field>
            <Field label="Code (identificador)">
              <input
                value={code} onChange={e => setCode(e.target.value)}
                placeholder="instagram"
                disabled={!!initial}
                className="w-full bg-surface-3 border border-border text-fg px-2 py-2 text-sm font-mono outline-none focus:border-accent disabled:opacity-60"
              />
              {initial && <p className="text-fg-6 text-[10px] mt-1">No se puede cambiar después de crear.</p>}
            </Field>
            <Field label="Color">
              <div className="flex gap-2 items-center">
                <input type="color" value={color || "#64748B"} onChange={e => setColor(e.target.value)}
                  className="w-10 h-9 bg-surface-3 border border-border cursor-pointer" />
                <input type="text" value={color || ""} onChange={e => setColor(e.target.value)}
                  placeholder="#RRGGBB"
                  className="flex-1 bg-surface-3 border border-border text-fg px-2 py-2 text-sm font-mono outline-none focus:border-accent" />
              </div>
            </Field>
            <Field label="Orden (menor = primero)">
              <input type="number" value={sortOrder} onChange={e => setSortOrder(parseInt(e.target.value) || 0)}
                className="w-full bg-surface-3 border border-border text-fg px-2 py-2 text-sm outline-none focus:border-accent" />
            </Field>
          </div>

          <Field label="Huellas de detección (bot)">
            <p className="text-fg-6 text-[10px] mb-2">
              Palabras que, si aparecen en el primer mensaje del bot, lo auto-asignan a este canal. (Función pendiente)
            </p>
            <div className="flex gap-2 mb-2">
              <input
                value={fpInput}
                onChange={e => setFpInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addFp(); } }}
                placeholder="instagram, ig, vi su post..."
                className="flex-1 bg-surface-3 border border-border text-fg px-2 py-2 text-sm outline-none focus:border-accent"
              />
              <button type="button" onClick={addFp}
                className="px-3 py-2 text-xs text-fg-3 border border-border hover:border-accent hover:text-accent">
                Agregar
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {fingerprints.length === 0 ? (
                <span className="text-fg-6 text-[10px] italic">Sin huellas</span>
              ) : fingerprints.map((fp, i) => (
                <span key={i} className="bg-surface-3 border border-border text-fg-3 text-xs px-2 py-0.5 flex items-center gap-1">
                  {fp}
                  <button type="button" onClick={() => removeFp(i)} className="text-fg-6 hover:text-red-400">
                    <X size={10} />
                  </button>
                </span>
              ))}
            </div>
          </Field>

          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)}
              className="accent-accent" />
            <span className="text-fg-3 text-sm">Canal activo</span>
          </label>
        </div>

        <div className="flex justify-end gap-2 px-5 py-3 border-t border-border shrink-0 bg-surface-2">
          <button onClick={onClose} disabled={saving}
            className="px-4 py-2 text-xs text-fg-4 border border-border hover:border-border-light disabled:opacity-40">
            Cancelar
          </button>
          <button onClick={submit} disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-accent hover:bg-accent-light text-zinc-900 disabled:opacity-40">
            {saving && <Loader2 size={11} className="animate-spin" />}
            {initial ? "Guardar cambios" : "Crear canal"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[10px] uppercase tracking-wider text-fg-5 font-medium mb-1">{label}</label>
      {children}
    </div>
  );
}
