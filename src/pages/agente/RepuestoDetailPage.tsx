import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, FileText } from "lucide-react";
import { toast } from "sonner";
import { api, type SparePartRequest, type BotMessageResponse } from "../../services/api";
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

              {req.part_description && (
                <div className="px-4 py-3">
                  <span className="text-fg-5 block mb-1.5">Repuesto solicitado</span>
                  <p className="text-fg">{req.part_description}</p>
                </div>
              )}

              {req.quantity != null && (
                <div className="px-4 py-3 flex justify-between items-center gap-3">
                  <span className="text-fg-5 shrink-0">Cantidad</span>
                  <span className="text-fg font-semibold">{req.quantity}</span>
                </div>
              )}

              {req.photo_url && (
                <div className="px-4 py-4">
                  <span className="text-fg-5 block mb-2">Foto</span>
                  <a href={req.photo_url} target="_blank" rel="noopener noreferrer">
                    <img
                      src={req.photo_url}
                      alt="foto del repuesto"
                      className="max-w-[300px] border border-border hover:border-accent transition-colors"
                    />
                  </a>
                </div>
              )}
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
        <div className="bg-surface-2 border border-border min-h-[400px]">
          {loadingChat ? (
            <div className="flex items-center justify-center h-40 text-fg-5 text-sm">
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
