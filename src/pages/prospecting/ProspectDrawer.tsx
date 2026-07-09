import { useEffect, useState } from "react";
import { X, Mail, Phone, Globe, MapPin, Calendar, MessageSquare, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { useAbility } from "../../context/AbilityContext";
import { api, type ProspectResponse, type ProspectMessageResponse, type ProspectStatus } from "../../services/api";

const STATUS_OPTIONS: { value: ProspectStatus; label: string }[] = [
  { value: "nuevo",          label: "Nuevo" },
  { value: "contactado",     label: "Contactado" },
  { value: "interesado",     label: "Interesado" },
  { value: "negociacion",    label: "Negociación" },
  { value: "cerrado_ganado", label: "Cerrado — Ganado" },
  { value: "cerrado_perdido",label: "Cerrado — Perdido" },
  { value: "descartado",     label: "Descartado" },
];

const SEQ_LABELS: Record<number, string> = { 1: "Día 1", 3: "Día 3", 7: "Día 7", 14: "Día 14" };

interface Props {
  prospect: ProspectResponse;
  onClose: () => void;
  onUpdated: (p: ProspectResponse) => void;
}

export default function ProspectDrawer({ prospect, onClose, onUpdated }: Props) {
  const ability  = useAbility();
  const canEdit  = ability.can("update", "Prospecting");

  const [messages, setMessages] = useState<ProspectMessageResponse[]>([]);
  const [status, setStatus]     = useState<ProspectStatus>(prospect.status);
  const [saving, setSaving]     = useState(false);
  const [tab, setTab]           = useState<"info" | "mensajes">("info");

  useEffect(() => {
    api.prospecting.messages(prospect.id).then(setMessages).catch(() => null);
  }, [prospect.id]);

  const save = async () => {
    if (status === prospect.status) return;
    setSaving(true);
    try {
      const updated = await api.prospecting.updateProspect(prospect.id, { status });
      onUpdated(updated);
      toast.success("Estado actualizado");
    } catch {
      toast.error("Error al actualizar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="relative w-full max-w-lg bg-surface border-l border-border flex flex-col h-full overflow-hidden animate-fade-in">

        {/* Header */}
        <div className="flex items-start justify-between px-5 py-4 border-b border-border shrink-0">
          <div>
            <h2 className="text-fg font-bold text-base">{prospect.company_name}</h2>
            <p className="text-fg-5 text-xs mt-0.5">{prospect.source} · {prospect.category ?? "sin categoría"}</p>
          </div>
          <button onClick={onClose} className="text-fg-5 hover:text-fg transition-colors mt-0.5">
            <X size={18} />
          </button>
        </div>

        {/* Score bar */}
        <div className="flex items-center gap-4 px-5 py-3 bg-surface-2 border-b border-border shrink-0">
          <div className="text-center">
            <div className={`text-2xl font-bold ${
              (prospect.fit_score ?? 0) >= 80 ? "text-green-400"
              : (prospect.fit_score ?? 0) >= 60 ? "text-yellow-400"
              : "text-red-400"
            }`}>
              {prospect.fit_score ?? "—"}
            </div>
            <div className="text-fg-6 text-[10px]">ICP Score</div>
          </div>
          <div className="h-8 w-px bg-border" />
          <div className="flex-1 text-xs text-fg-4 italic">"{prospect.score_reason ?? "Sin razón"}"</div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border shrink-0">
          {(["info", "mensajes"] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2.5 text-xs font-semibold uppercase tracking-wider transition-colors ${
                tab === t ? "text-accent border-b-2 border-accent" : "text-fg-5 hover:text-fg-3"
              }`}
            >
              {t === "info" ? "Información" : `Mensajes (${messages.length})`}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">

          {tab === "info" && (
            <>
              {/* Datos de contacto */}
              <div className="space-y-2">
                {prospect.email && (
                  <a href={`mailto:${prospect.email}`} className="flex items-center gap-2 text-sm text-fg-3 hover:text-accent transition-colors">
                    <Mail size={14} className="text-fg-6 shrink-0" /> {prospect.email}
                  </a>
                )}
                {prospect.phone && (
                  <a href={`tel:${prospect.phone}`} className="flex items-center gap-2 text-sm text-fg-3 hover:text-accent transition-colors">
                    <Phone size={14} className="text-fg-6 shrink-0" /> {prospect.phone}
                  </a>
                )}
                {prospect.website && (
                  <a href={prospect.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-fg-3 hover:text-accent transition-colors">
                    <Globe size={14} className="text-fg-6 shrink-0" /> {prospect.website}
                  </a>
                )}
                {prospect.address && (
                  <div className="flex items-center gap-2 text-sm text-fg-4">
                    <MapPin size={14} className="text-fg-6 shrink-0" /> {prospect.address}
                  </div>
                )}
              </div>

              <div className="h-px bg-border" />

              {/* Detalles */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-fg-6 text-xs mb-0.5">Ciudad</p>
                  <p className="text-fg-3">{prospect.city ?? "—"}</p>
                </div>
                <div>
                  <p className="text-fg-6 text-xs mb-0.5">Rating Google</p>
                  <p className="text-fg-3">{prospect.rating ? `⭐ ${prospect.rating}` : "—"}</p>
                </div>
                <div>
                  <p className="text-fg-6 text-xs mb-0.5">Tipo de negocio</p>
                  <p className="text-fg-3 capitalize">{prospect.deal_type ?? "—"}</p>
                </div>
                <div>
                  <p className="text-fg-6 text-xs mb-0.5">Equipo probable</p>
                  <p className="text-fg-3">{prospect.equipment ?? "—"}</p>
                </div>
                {prospect.next_followup && (
                  <div className="col-span-2">
                    <p className="text-fg-6 text-xs mb-0.5">Próximo seguimiento</p>
                    <div className="flex items-center gap-1.5 text-fg-3">
                      <Calendar size={13} className="text-fg-6" />
                      {new Date(prospect.next_followup).toLocaleDateString("es-CO", { dateStyle: "long" })}
                    </div>
                  </div>
                )}
                <div>
                  <p className="text-fg-6 text-xs mb-0.5">Captado</p>
                  <p className="text-fg-5 text-xs">{new Date(prospect.created_at).toLocaleDateString("es-CO")}</p>
                </div>
                {prospect.last_contact && (
                  <div>
                    <p className="text-fg-6 text-xs mb-0.5">Último contacto</p>
                    <p className="text-fg-5 text-xs">{new Date(prospect.last_contact).toLocaleDateString("es-CO")}</p>
                  </div>
                )}
              </div>

              <div className="h-px bg-border" />

              {/* Cambiar estado */}
              {canEdit && (
                <div className="space-y-2">
                  <p className="text-fg-5 text-xs font-semibold uppercase tracking-wider">Estado del pipeline</p>
                  <div className="relative">
                    <select
                      value={status}
                      onChange={e => setStatus(e.target.value as ProspectStatus)}
                      className="w-full appearance-none bg-surface-3 border border-border text-fg text-sm px-3 py-2.5 pr-8 outline-none focus:border-accent"
                    >
                      {STATUS_OPTIONS.map(o => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-fg-5 pointer-events-none" />
                  </div>
                  {status !== prospect.status && (
                    <button
                      onClick={save}
                      disabled={saving}
                      className="w-full py-2 bg-accent-muted border border-accent/30 text-accent text-sm font-semibold hover:bg-accent/20 disabled:opacity-50 transition-colors"
                    >
                      {saving ? "Guardando..." : "Guardar cambio"}
                    </button>
                  )}
                </div>
              )}
            </>
          )}

          {tab === "mensajes" && (
            <div className="space-y-3">
              {messages.length === 0 && (
                <div className="flex flex-col items-center gap-2 py-10 text-fg-5">
                  <MessageSquare size={24} className="text-fg-6" />
                  <p className="text-sm">Sin mensajes enviados</p>
                </div>
              )}
              {messages.map(msg => (
                <div key={msg.id} className="bg-surface-2 border border-border p-4 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-fg-4">{SEQ_LABELS[msg.sequence_day] ?? `Día ${msg.sequence_day}`}</span>
                    <div className="flex items-center gap-2">
                      {msg.is_test && (
                        <span className="px-1.5 py-0.5 text-[10px] bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 rounded-sm">TEST</span>
                      )}
                      <span className="text-fg-6 text-[11px]">
                        {new Date(msg.sent_at).toLocaleString("es-CO", { dateStyle: "short", timeStyle: "short" })}
                      </span>
                    </div>
                  </div>
                  {msg.subject && <p className="text-fg text-sm font-medium">{msg.subject}</p>}
                  <p className="text-fg-4 text-xs whitespace-pre-wrap leading-relaxed">{msg.body}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
