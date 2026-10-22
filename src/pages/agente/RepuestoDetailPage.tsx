import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, FileText, Plus, Trash2, Loader2, Pencil, Check, X } from "lucide-react";
import { toast } from "sonner";
import { api, type SparePartRequest, type SparePartRequestItem, type BotMessageResponse } from "../../services/api";
import ChatViewer from "../../components/agente/ChatViewer";
import NuevoPresupuestoRepuestosDrawer from "../../components/agente/NuevoPresupuestoRepuestosDrawer";

const STATUSES = ["pendiente", "cotizado", "pedido", "entregado", "cancelado"] as const;

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pendiente:  "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
    cotizado:   "bg-blue-500/15   text-blue-400   border-blue-500/30",
    pedido:     "bg-purple-500/15 text-purple-400 border-purple-500/30",
    entregado:  "bg-green-500/15  text-green-400  border-green-500/30",
    cancelado:  "bg-red-500/15    text-red-400    border-red-500/30",
  };
  return (
    <span className={`px-2 py-0.5 text-[11px] font-bold border rounded-sm capitalize ${styles[status] ?? "bg-surface-3 text-fg-5 border-border"}`}>
      {status}
    </span>
  );
}

type Tab = "solicitud" | "conversacion";

export default function RepuestoDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [req, setReq]               = useState<SparePartRequest | null>(null);
  const [loading, setLoading]       = useState(true);
  const [messages, setMessages]     = useState<BotMessageResponse[]>([]);
  const [loadingChat, setLoadingChat] = useState(false);
  const [tab, setTab]               = useState<Tab>("solicitud");
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Editable fields
  const [status, setStatus] = useState("");
  const [notes, setNotes]   = useState("");
  const [saving, setSaving] = useState(false);

  // Items
  const [addItemOpen, setAddItemOpen] = useState(false);
  const [newItemDesc, setNewItemDesc] = useState("");
  const [newItemQty, setNewItemQty]   = useState(1);
  const [savingItem, setSavingItem]   = useState(false);
  const [editingItemId, setEditingItemId] = useState<number | null>(null);
  const [editDesc, setEditDesc] = useState("");
  const [editQty, setEditQty]   = useState(1);

  const refetchRequest = async () => {
    if (!id) return;
    const data = await api.spareParts.request(Number(id));
    setReq(data);
  };

  const addItem = async () => {
    if (!id) return;
    const desc = newItemDesc.trim();
    if (!desc) { toast.error("Ingresa la descripción"); return; }
    setSavingItem(true);
    try {
      await api.spareParts.addRequestItem(Number(id), { description: desc, quantity: Math.max(1, newItemQty) });
      setNewItemDesc(""); setNewItemQty(1); setAddItemOpen(false);
      await refetchRequest();
    } catch (e: any) {
      toast.error(e?.detail ?? "No se pudo añadir el item");
    } finally {
      setSavingItem(false);
    }
  };

  const startEdit = (it: SparePartRequestItem) => {
    setEditingItemId(it.id);
    setEditDesc(it.description);
    setEditQty(it.quantity);
  };

  const saveEdit = async () => {
    if (!id || !editingItemId) return;
    const desc = editDesc.trim();
    if (!desc) { toast.error("La descripción no puede estar vacía"); return; }
    try {
      await api.spareParts.updateRequestItem(Number(id), editingItemId, { description: desc, quantity: Math.max(1, editQty) });
      setEditingItemId(null);
      await refetchRequest();
    } catch (e: any) {
      toast.error(e?.detail ?? "No se pudo actualizar");
    }
  };

  const removeItem = async (itemId: number) => {
    if (!id) return;
    if (!confirm("¿Eliminar este repuesto de la solicitud?")) return;
    try {
      await api.spareParts.deleteRequestItem(Number(id), itemId);
      await refetchRequest();
    } catch (e: any) {
      toast.error(e?.detail ?? "No se pudo eliminar");
    }
  };

  useEffect(() => {
    if (!id) return;
    api.spareParts.request(Number(id))
      .then(data => {
        setReq(data);
        setStatus(data.status);
        setNotes(data.notes ?? "");
      })
      .catch(() => toast.error("No se pudo cargar la solicitud"))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!req?.session_id) return;
    setLoadingChat(true);
    api.bot.session(req.session_id)
      .then(s => setMessages(s.messages))
      .catch(() => null)
      .finally(() => setLoadingChat(false));
  }, [req?.session_id]);

  const patchStatus = async (newStatus: string) => {
    if (!req) return;
    setStatus(newStatus);
    setSaving(true);
    try {
      const updated = await api.spareParts.patchRequest(req.id, { status: newStatus });
      setReq(updated);
      toast.success("Estado actualizado");
    } catch {
      toast.error("No se pudo actualizar el estado");
      setStatus(req.status);
    } finally {
      setSaving(false);
    }
  };

  const saveNotes = async () => {
    if (!req || notes === (req.notes ?? "")) return;
    setSaving(true);
    try {
      const updated = await api.spareParts.patchRequest(req.id, { notes });
      setReq(updated);
    } catch {
      toast.error("No se pudo guardar las notas");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-40 text-fg-5 text-sm">
        Cargando solicitud...
      </div>
    );
  }

  if (!req) {
    return (
      <div className="text-fg-5 text-sm p-4">Solicitud no encontrada.</div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={() => navigate(-1)} className="text-fg-5 hover:text-fg transition-colors flex-shrink-0">
            <ArrowLeft size={18} />
          </button>
          <div className="min-w-0">
            <h1 className="text-fg font-bold text-xl">Solicitud de Repuesto</h1>
            <p className="text-fg-5 text-sm truncate">
              {req.request_number}{req.lead_name ? ` — ${req.lead_name}` : ""}{req.lead_phone ? ` (${req.lead_phone})` : ""}
            </p>
          </div>
        </div>
        <button
          onClick={() => setDrawerOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-accent text-black text-sm font-semibold hover:bg-accent/90 transition-colors flex-shrink-0"
        >
          <FileText size={14} />
          Generar cotización
        </button>
      </div>

      {/* Drawer */}
      <NuevoPresupuestoRepuestosDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onCreated={() => setDrawerOpen(false)}
        prefill={{
          request_id:       req.id,
          session_id:       req.session_id,
          lead_name:        req.lead_name,
          lead_email:       req.lead_email,
          lead_phone:       req.lead_phone,
          lead_company:     req.lead_company,
          lead_rut_nit:     req.lead_rut_nit,
          lead_address:     req.lead_address,
          quantity:         req.quantity,
          part_description: req.part_description,
        }}
      />

      {/* Tabs */}
      <div className="flex gap-0 border-b border-border">
        {([
          { key: "solicitud",    label: "Solicitud" },
          { key: "conversacion", label: "Conversación" },
        ] as { key: Tab; label: string }[]).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === key
                ? "border-accent text-fg"
                : "border-transparent text-fg-5 hover:text-fg"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── TAB: Solicitud ─────────────────────────────────────────────────── */}
      {tab === "solicitud" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">

          {/* Left: request card */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-surface-2 border border-border divide-y divide-border text-sm">
              <div className="px-4 py-3 flex justify-between items-center gap-3">
                <span className="text-fg-5 shrink-0">N° Solicitud</span>
                <span className="text-fg font-mono text-xs">{req.request_number}</span>
              </div>

              <div className="px-4 py-3 flex justify-between items-center gap-3">
                <span className="text-fg-5 shrink-0">Estado</span>
                <div className="flex items-center gap-2">
                  <StatusBadge status={status} />
                  <select
                    value={status}
                    onChange={e => patchStatus(e.target.value)}
                    disabled={saving}
                    className="bg-surface-3 border border-border text-fg text-xs px-2 py-1 outline-none focus:border-accent capitalize disabled:opacity-50"
                  >
                    {STATUSES.map(s => (
                      <option key={s} value={s} className="capitalize">{s}</option>
                    ))}
                  </select>
                </div>
              </div>

              {req.machine_brand && (
                <div className="px-4 py-3 flex justify-between items-center gap-3">
                  <span className="text-fg-5 shrink-0">Marca</span>
                  <span className="text-fg">{req.machine_brand}</span>
                </div>
              )}

              {req.machine_model && (
                <div className="px-4 py-3 flex justify-between items-center gap-3">
                  <span className="text-fg-5 shrink-0">Modelo</span>
                  <span className="text-fg">{req.machine_model}</span>
                </div>
              )}

              {req.machine_serial && (
                <div className="px-4 py-3 flex justify-between items-center gap-3">
                  <span className="text-fg-5 shrink-0">Serial</span>
                  <span className="text-fg font-mono text-xs">{req.machine_serial}</span>
                </div>
              )}

              {/* Items: lista editable de repuestos solicitados */}
              <div className="px-4 py-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-fg-5 block">Repuestos solicitados ({req.items?.length ?? 0})</span>
                  <button type="button" onClick={() => setAddItemOpen(v => !v)}
                    className="flex items-center gap-1 text-accent text-xs hover:text-accent/80 transition-colors">
                    <Plus size={12} /> Añadir repuesto
                  </button>
                </div>

                {addItemOpen && (
                  <div className="mb-3 border border-accent/40 bg-accent/5 p-2.5 space-y-2">
                    <input autoFocus type="text"
                      className="w-full bg-surface-3 border border-border text-fg px-2 py-1.5 text-sm placeholder:text-fg-6 outline-none focus:border-accent"
                      placeholder="Descripción del repuesto"
                      value={newItemDesc}
                      onChange={e => setNewItemDesc(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter") addItem(); }}
                    />
                    <div className="flex items-center gap-2">
                      <label className="text-fg-6 text-[10px] uppercase tracking-wider">Cant</label>
                      <input type="number" min={1}
                        className="w-20 bg-surface-3 border border-border text-fg px-2 py-1.5 text-sm outline-none focus:border-accent"
                        value={newItemQty}
                        onChange={e => setNewItemQty(parseInt(e.target.value) || 1)}
                      />
                      <div className="flex-1" />
                      <button type="button" onClick={() => { setAddItemOpen(false); setNewItemDesc(""); setNewItemQty(1); }}
                        className="px-3 py-1 text-xs text-fg-5 border border-border hover:border-border-light">
                        Cancelar
                      </button>
                      <button type="button" onClick={addItem} disabled={savingItem}
                        className="px-3 py-1 text-xs font-semibold bg-accent hover:bg-accent-light text-zinc-900 disabled:opacity-40">
                        {savingItem ? <Loader2 size={11} className="animate-spin" /> : "Añadir"}
                      </button>
                    </div>
                  </div>
                )}

                {(!req.items || req.items.length === 0) ? (
                  <div className="text-fg-6 text-xs text-center py-4 border border-dashed border-border">
                    Esta solicitud aún no tiene items.
                  </div>
                ) : (
                  <ul className="space-y-2">
                    {req.items.map(it => (
                      <li key={it.id} className="bg-surface-3 border border-border p-2.5">
                        {editingItemId === it.id ? (
                          <div className="space-y-2">
                            <input type="text" autoFocus
                              className="w-full bg-surface-2 border border-border text-fg px-2 py-1.5 text-sm outline-none focus:border-accent"
                              value={editDesc}
                              onChange={e => setEditDesc(e.target.value)}
                              onKeyDown={e => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") setEditingItemId(null); }}
                            />
                            <div className="flex items-center gap-2">
                              <label className="text-fg-6 text-[10px] uppercase tracking-wider">Cant</label>
                              <input type="number" min={1}
                                className="w-20 bg-surface-2 border border-border text-fg px-2 py-1.5 text-sm outline-none focus:border-accent"
                                value={editQty}
                                onChange={e => setEditQty(parseInt(e.target.value) || 1)}
                              />
                              <div className="flex-1" />
                              <button type="button" onClick={() => setEditingItemId(null)}
                                className="p-1 text-fg-5 hover:text-fg"><X size={14} /></button>
                              <button type="button" onClick={saveEdit}
                                className="p-1 text-emerald-400 hover:text-emerald-300"><Check size={14} /></button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-start gap-3">
                            <div className="flex-1 min-w-0">
                              <p className="text-fg text-sm">{it.description}</p>
                              {it.spare_part_code && (
                                <p className="text-fg-5 text-[11px] font-mono mt-0.5">
                                  Catálogo: {it.spare_part_code} · {it.spare_part_name}
                                </p>
                              )}
                              {it.photo_url && (
                                <a href={it.photo_url} target="_blank" rel="noopener noreferrer" className="inline-block mt-1.5">
                                  <img src={it.photo_url} alt="foto" className="max-h-16 border border-border hover:border-accent" />
                                </a>
                              )}
                            </div>
                            <span className="text-fg-5 text-xs shrink-0 whitespace-nowrap">×{it.quantity}</span>
                            <button type="button" onClick={() => startEdit(it)}
                              className="text-fg-6 hover:text-accent shrink-0" title="Editar">
                              <Pencil size={13} />
                            </button>
                            <button type="button" onClick={() => removeItem(it.id)}
                              className="text-fg-6 hover:text-red-400 shrink-0" title="Eliminar">
                              <Trash2 size={13} />
                            </button>
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {/* Notes */}
            <div className="bg-surface-2 border border-border p-4 space-y-2">
              <label className="text-fg-5 text-xs uppercase tracking-wider font-medium block">Notas internas</label>
              <textarea
                rows={4}
                className="w-full bg-surface-3 border border-border text-fg text-sm px-3 py-2.5 outline-none focus:border-accent resize-none placeholder:text-fg-6"
                placeholder="Agregar notas sobre esta solicitud..."
                value={notes}
                onChange={e => setNotes(e.target.value)}
                onBlur={saveNotes}
              />
              {saving && <p className="text-fg-5 text-xs">Guardando...</p>}
            </div>
          </div>

          {/* Right: client info */}
          <div className="bg-surface-2 border border-border divide-y divide-border text-sm">
            <div className="px-4 py-3">
              <span className="text-fg-5 text-xs uppercase tracking-wider font-medium">Cliente</span>
            </div>

            {req.lead_name && (
              <div className="px-4 py-3 flex justify-between items-center gap-3">
                <span className="text-fg-5">Nombre</span>
                <span className="text-fg">{req.lead_name}</span>
              </div>
            )}

            {req.lead_company && (
              <div className="px-4 py-3 flex justify-between items-center gap-3">
                <span className="text-fg-5">Empresa</span>
                <span className="text-fg">{req.lead_company}</span>
              </div>
            )}

            {req.lead_email && (
              <div className="px-4 py-3 flex justify-between items-center gap-3">
                <span className="text-fg-5">Email</span>
                <span className="text-fg text-xs">{req.lead_email}</span>
              </div>
            )}

            {req.lead_phone && (
              <div className="px-4 py-3 flex justify-between items-center gap-3">
                <span className="text-fg-5">Teléfono</span>
                <span className="text-fg font-mono text-xs">{req.lead_phone}</span>
              </div>
            )}

            {req.lead_rut_nit && (
              <div className="px-4 py-3 flex justify-between items-center gap-3">
                <span className="text-fg-5">NIT</span>
                <span className="text-fg font-mono text-xs">{req.lead_rut_nit}</span>
              </div>
            )}

            {req.lead_address && (
              <div className="px-4 py-3 flex justify-between items-center gap-3">
                <span className="text-fg-5">Dirección</span>
                <span className="text-fg text-xs text-right">{req.lead_address}</span>
              </div>
            )}

            <div className="px-4 py-3 flex justify-between items-start gap-3">
              <span className="text-fg-5 shrink-0">Sesión</span>
              <a
                href={`/agente/sesiones/${req.session_id}`}
                className="text-accent text-xs font-mono hover:underline break-all"
              >
                {req.session_id}
              </a>
            </div>

            <div className="px-4 py-3 flex justify-between items-center gap-3">
              <span className="text-fg-5">Fecha</span>
              <span className="text-fg-4 text-xs">{new Date(req.created_at).toLocaleString("es-CO")}</span>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB: Conversación ─────────────────────────────────────────────── */}
      {tab === "conversacion" && (
        <div className="border border-border min-h-[400px] overflow-hidden" style={{ backgroundColor: "#0b1014" }}>
          {loadingChat ? (
            <div className="flex items-center justify-center h-40 text-sm" style={{ color: "#8696a0" }}>
              Cargando conversación...
            </div>
          ) : (
            <ChatViewer messages={messages} />
          )}
        </div>
      )}
    </div>
  );
}
