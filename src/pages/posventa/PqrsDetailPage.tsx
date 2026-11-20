import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft, Loader2, MessageSquareWarning, Paperclip, Save, Trash2,
} from "lucide-react";
import { toast } from "sonner";
import {
  api,
  PQRS_STATUSES,
  PQRS_TYPE_LABELS,
  PQRS_STATUS_LABELS,
  type PqrsDetail,
  type PqrsStatus,
  type PqrsType,
} from "../../services/api";


const STATUS_COLORS: Record<PqrsStatus, string> = {
  recibida:    "bg-slate-500/15 text-slate-300 border-slate-500/30",
  en_revision: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  respondida:  "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  cerrada:     "bg-zinc-500/15 text-zinc-300 border-zinc-500/30",
};

const TYPE_COLORS: Record<PqrsType, string> = {
  queja:      "bg-red-500/15 text-red-300 border-red-500/30",
  reclamo:    "bg-orange-500/15 text-orange-300 border-orange-500/30",
  sugerencia: "bg-sky-500/15 text-sky-300 border-sky-500/30",
};


export default function PqrsDetailPage() {
  const nav = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [pqrs, setPqrs] = useState<PqrsDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);

  const [status, setStatus]     = useState<PqrsStatus>("recibida");
  const [response, setResponse] = useState("");
  const [notes, setNotes]       = useState("");

  const load = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const p = await api.pqrs.get(Number(id));
      setPqrs(p);
      setStatus(p.status);
      setResponse(p.response ?? "");
      setNotes(p.internal_notes ?? "");
    } catch (e: any) {
      toast.error(e?.detail ?? "Error cargando PQRS");
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [id]);

  const save = async () => {
    if (!pqrs) return;
    setSaving(true);
    try {
      const upd = await api.pqrs.update(pqrs.id, {
        status,
        response: response.trim() || null,
        internal_notes: notes.trim() || null,
      });
      setPqrs(upd);
      toast.success("PQRS actualizada");
    } catch (e: any) {
      toast.error(e?.detail ?? "No se pudo guardar");
    } finally { setSaving(false); }
  };

  const remove = async () => {
    if (!pqrs) return;
    if (!confirm(`¿Eliminar ${pqrs.pqrs_number}? La PQRS quedará oculta pero su registro histórico se conserva.`)) return;
    try {
      await api.pqrs.remove(pqrs.id);
      toast.success("PQRS eliminada");
      nav("/posventa/pqrs");
    } catch (e: any) {
      toast.error(e?.detail ?? "Error");
    }
  };

  if (loading || !pqrs) {
    return (
      <div className="py-20 text-center text-fg-5">
        <Loader2 size={24} className="animate-spin inline text-accent" />
      </div>
    );
  }

  const dirty =
    status !== pqrs.status ||
    (response.trim() !== (pqrs.response ?? "").trim()) ||
    (notes.trim() !== (pqrs.internal_notes ?? "").trim());

  return (
    <div className="space-y-5 max-w-5xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <button
            onClick={() => nav("/posventa/pqrs")}
            className="text-fg-5 hover:text-accent mt-1"
            title="Volver"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-fg text-xl font-semibold flex items-center gap-2 font-mono">
              <MessageSquareWarning size={18} className="text-accent" />
              {pqrs.pqrs_number}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <span className={`text-[10px] uppercase tracking-wider border px-2 py-0.5 ${TYPE_COLORS[pqrs.type]}`}>
                {PQRS_TYPE_LABELS[pqrs.type]}
              </span>
              <span className={`text-[10px] uppercase tracking-wider border px-2 py-0.5 ${STATUS_COLORS[pqrs.status]}`}>
                {PQRS_STATUS_LABELS[pqrs.status]}
              </span>
              <span className="text-fg-5 text-xs">
                · {pqrs.motivo}
              </span>
            </div>
          </div>
        </div>
        <button
          onClick={remove}
          className="flex items-center gap-1.5 text-xs text-red-300 border border-red-500/40 hover:bg-red-500/10 px-3 py-2"
        >
          <Trash2 size={12} /> Eliminar
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Columna izquierda: contenido del cliente */}
        <div className="md:col-span-2 space-y-4">
          <Card title="Qué dijo el cliente">
            <p className="text-fg-3 text-sm whitespace-pre-wrap leading-relaxed">
              {pqrs.description}
            </p>
            <Meta label="Fecha del suceso" value={pqrs.occurred_at
              ? new Date(pqrs.occurred_at).toLocaleDateString("es-CO")
              : "—"
            } />
          </Card>

          <Card title={`Adjuntos (${pqrs.attachments.length})`}>
            {pqrs.attachments.length === 0 ? (
              <p className="text-fg-6 text-sm italic">Sin adjuntos.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {pqrs.attachments.map(att => {
                  const isImg = (att.mime_type ?? "").startsWith("image/");
                  return (
                    <a
                      key={att.id}
                      href={att.url}
                      target="_blank"
                      rel="noreferrer"
                      className="bg-surface-3 border border-border hover:border-accent/50 overflow-hidden group"
                    >
                      {isImg ? (
                        <img src={att.url} alt="" className="w-full h-24 object-cover" />
                      ) : (
                        <div className="h-24 flex items-center justify-center text-fg-5 group-hover:text-accent">
                          <Paperclip size={20} />
                        </div>
                      )}
                      <div className="px-2 py-1 text-[10px] text-fg-5 truncate">
                        {att.mime_type ?? "archivo"}
                      </div>
                    </a>
                  );
                })}
              </div>
            )}
          </Card>

          <Card title="Respuesta al cliente">
            <p className="text-fg-6 text-[11px] mb-2">
              Texto con la respuesta oficial que se le dará al cliente. Se guarda
              aparte de las notas internas.
            </p>
            <textarea
              value={response}
              onChange={e => setResponse(e.target.value)}
              rows={5}
              placeholder="Escribe la respuesta…"
              className="w-full bg-surface-3 border border-border text-fg px-3 py-2 text-sm outline-none focus:border-accent resize-none"
            />
            {pqrs.responded_at && (
              <p className="text-fg-6 text-[10px] mt-1">
                Marcado como respondida: {new Date(pqrs.responded_at).toLocaleString("es-CO")}
              </p>
            )}
          </Card>

          <Card title="Notas internas">
            <p className="text-fg-6 text-[11px] mb-2">
              Solo visible para el equipo. Investigaciones, coordinación con otros
              asesores, contexto adicional.
            </p>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
              placeholder="Notas internas…"
              className="w-full bg-surface-3 border border-border text-fg px-3 py-2 text-sm outline-none focus:border-accent resize-none"
            />
          </Card>
        </div>

        {/* Columna derecha: lifecycle + trazabilidad */}
        <div className="space-y-4">
          <Card title="Estado">
            <select
              value={status}
              onChange={e => setStatus(e.target.value as PqrsStatus)}
              className="w-full bg-surface-3 border border-border text-fg px-2 py-2 text-sm outline-none focus:border-accent"
            >
              {PQRS_STATUSES.map(s => (
                <option key={s} value={s}>{PQRS_STATUS_LABELS[s]}</option>
              ))}
            </select>
            <p className="text-fg-6 text-[10px] mt-2">
              Al pasar a "Respondida" o "Cerrada" se marca el timestamp automáticamente.
            </p>
          </Card>

          <Card title="Trazabilidad">
            <Meta label="Canal" value={pqrs.channel} />
            <Meta label="Sesión del bot" value={pqrs.source_session_id ?? "—"} mono />
            <Meta label="Lead" value={pqrs.source_lead_id ? `#${pqrs.source_lead_id}` : "—"} />
            <Meta label="Creada" value={new Date(pqrs.created_at).toLocaleString("es-CO")} />
            <Meta label="Última actualización" value={new Date(pqrs.updated_at).toLocaleString("es-CO")} />
            {pqrs.responded_at && (
              <Meta label="Respondida" value={new Date(pqrs.responded_at).toLocaleString("es-CO")} />
            )}
            {pqrs.closed_at && (
              <Meta label="Cerrada" value={new Date(pqrs.closed_at).toLocaleString("es-CO")} />
            )}
          </Card>

          <button
            onClick={save}
            disabled={!dirty || saving}
            className="w-full flex items-center justify-center gap-1.5 bg-accent hover:bg-accent-light text-zinc-900 font-semibold text-xs uppercase tracking-wider px-3 py-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
            Guardar cambios
          </button>
        </div>
      </div>
    </div>
  );
}


function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-surface-2 border border-border">
      <div className="px-4 py-2 border-b border-border">
        <h3 className="text-[10px] uppercase tracking-wider text-fg-5 font-semibold">{title}</h3>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function Meta({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start gap-2 py-1 text-xs">
      <span className="text-fg-6 min-w-[8rem]">{label}</span>
      <span className={`text-fg-3 ${mono ? "font-mono" : ""} break-all`}>{value}</span>
    </div>
  );
}
