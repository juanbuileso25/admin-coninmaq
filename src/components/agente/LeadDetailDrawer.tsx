import { useEffect, useState } from "react";
import {
  X, Phone, Mail, Building2, Briefcase, Clock, FileText, ChevronRight,
  Download, ExternalLink, Plus, Loader2, MessageSquare, CheckCircle2,
  Globe,
} from "lucide-react";
import { toast } from "sonner";
import {
  api,
  type BotLeadResponse,
  type LeadStageHistoryResponse,
  type PipelineStage,
  PIPELINE_STAGES,
  PIPELINE_STAGE_LABELS,
} from "../../services/api";
import NuevaCotizacionDrawer from "./NuevaCotizacionDrawer";

const COP = (n: number) => `$${n.toLocaleString("es-CO")}`;

const STAGE_COLORS: Record<PipelineStage, string> = {
  interesado:           "bg-slate-500/15 text-slate-300 border-slate-500/30",
  contactado:           "bg-blue-500/15 text-blue-300 border-blue-500/30",
  calificado:           "bg-violet-500/15 text-violet-300 border-violet-500/30",
  cotizacion_propuesta: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  seguimiento:          "bg-orange-500/15 text-orange-300 border-orange-500/30",
  cierre:               "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  referido:             "bg-pink-500/15 text-pink-300 border-pink-500/30",
};

const STAGE_DOT: Record<PipelineStage, string> = {
  interesado:           "bg-slate-400",
  contactado:           "bg-blue-400",
  calificado:           "bg-violet-400",
  cotizacion_propuesta: "bg-amber-400",
  seguimiento:          "bg-orange-400",
  cierre:               "bg-emerald-400",
  referido:             "bg-pink-400",
};

const TIER_COLORS: Record<string, string> = {
  a:      "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  b:      "bg-blue-500/15 text-blue-400 border-blue-500/30",
  no_fit: "bg-surface-4 text-fg-6 border-border",
};

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3">
      <span className="text-fg-5 text-xs w-28 shrink-0 mt-0.5">{label}</span>
      <span className="text-fg text-xs flex-1">{value}</span>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="text-fg-4 text-[10px] font-semibold uppercase tracking-wider mb-3">{title}</h3>
      {children}
    </section>
  );
}

interface Props {
  lead: BotLeadResponse | null;
  onClose: () => void;
  onStageChanged: () => void;
}

export default function LeadDetailDrawer({ lead, onClose, onStageChanged }: Props) {
  const [history, setHistory]         = useState<LeadStageHistoryResponse[]>([]);
  const [historyLoading, setHL]       = useState(false);
  const [stageChanging, setSC]        = useState(false);
  const [selectedStage, setSelStage]  = useState<PipelineStage | "">("");
  const [closeResult, setCloseResult] = useState<"ganado" | "perdido" | "">("");
  const [note, setNote]               = useState("");
  const [quotationDrawer, setQD]      = useState(false);

  const open = !!lead;

  useEffect(() => {
    if (!lead) { setHistory([]); setSelStage(""); setCloseResult(""); setNote(""); return; }
    setSelStage(lead.pipeline_stage);
    setCloseResult((lead.close_result as "ganado" | "perdido" | "") ?? "");
    setHL(true);
    api.bot.leadStageHistory(lead.id)
      .then(setHistory)
      .catch(() => null)
      .finally(() => setHL(false));
  }, [lead?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!open) return null;

  const handleStageChange = async () => {
    if (!selectedStage || selectedStage === lead.pipeline_stage) return;
    if (selectedStage === "cierre" && !closeResult) {
      toast.error("Selecciona si el cierre fue ganado o perdido");
      return;
    }
    setSC(true);
    try {
      await api.bot.patchLeadStage(lead.id, {
        stage: selectedStage,
        close_result: selectedStage === "cierre" ? closeResult || null : null,
        note: note.trim() || undefined,
      });
      toast.success(`Etapa actualizada a "${PIPELINE_STAGE_LABELS[selectedStage]}"`);
      setNote("");
      onStageChanged();
      // Reload history
      api.bot.leadStageHistory(lead.id).then(setHistory).catch(() => null);
    } catch {
      toast.error("No se pudo actualizar la etapa");
    } finally {
      setSC(false);
    }
  };

  const tier = lead.score?.tier_final;
  const quotations = lead.latest_quotation ? [lead.latest_quotation] : [];
  const stageChanged = selectedStage !== lead.pipeline_stage;

  return (
    <>
      <NuevaCotizacionDrawer
        open={quotationDrawer}
        onClose={() => setQD(false)}
        onCreated={() => { setQD(false); onStageChanged(); }}
        prefill={{
          lead_id:   lead.id,
          session_id: lead.session_id,
          name:      lead.name ?? undefined,
          email:     lead.email ?? undefined,
          company:   lead.company ?? undefined,
          tax_id:    lead.rut_nit ?? undefined,
          address:   lead.rut_direccion ?? undefined,
        }}
      />

      <div className="fixed inset-0 z-50 flex justify-end">
        <div className="absolute inset-0 bg-black/50" onClick={onClose} />

        <div className="relative z-10 w-full max-w-lg bg-surface-2 border-l border-border flex flex-col h-full overflow-hidden shadow-2xl">

          {/* Header */}
          <div className="flex items-start justify-between px-6 py-4 border-b border-border shrink-0">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-fg font-semibold text-base">
                  {lead.name ?? <span className="text-fg-5 italic">Sin nombre</span>}
                </h2>
                {tier && (
                  <span className={`px-1.5 py-0.5 text-[10px] font-bold border rounded-sm ${TIER_COLORS[tier] ?? TIER_COLORS.no_fit}`}>
                    Tier {tier === "no_fit" ? "N/F" : tier.toUpperCase()}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                {lead.phone_number ? (
                  <span title={`WhatsApp · ${lead.phone_number}`} className="text-green-400">
                    <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                      <path d="M12 0C5.373 0 0 5.373 0 12c0 2.126.556 4.111 1.513 5.835L.053 23.447a.75.75 0 0 0 .922.92l5.65-1.46A11.945 11.945 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.854 0-3.6-.5-5.1-1.37l-.364-.214-3.777.977.998-3.692-.235-.38A9.943 9.943 0 0 1 2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
                    </svg>
                  </span>
                ) : (
                  <span title="Creado desde el admin" className="text-blue-400">
                    <Globe size={15} />
                  </span>
                )}
                <span className={`px-2 py-0.5 text-[11px] font-medium border rounded-sm ${STAGE_COLORS[lead.pipeline_stage]}`}>
                  {PIPELINE_STAGE_LABELS[lead.pipeline_stage]}
                </span>
                {lead.close_result && (
                  <span className={`px-2 py-0.5 text-[11px] font-medium border rounded-sm ${
                    lead.close_result === "ganado"
                      ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                      : "bg-red-500/15 text-red-400 border-red-500/30"
                  }`}>
                    {lead.close_result === "ganado" ? "✓ Ganado" : "✗ Perdido"}
                  </span>
                )}
              </div>
            </div>
            <button onClick={onClose} className="text-fg-5 hover:text-fg transition-colors p-1 ml-3 shrink-0">
              <X size={18} />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">

            {/* ── Gestión de etapa ────────────────────────────────────────── */}
            <Section title="Etapa del pipeline">
              <div className="space-y-3">
                <div>
                  <label className="text-fg-5 text-xs mb-1.5 block">Mover a etapa</label>
                  <select
                    className="w-full bg-surface-3 border border-border text-fg text-sm px-3 py-2.5 outline-none focus:border-accent"
                    value={selectedStage}
                    onChange={e => {
                      setSelStage(e.target.value as PipelineStage);
                      if (e.target.value !== "cierre") setCloseResult("");
                    }}
                  >
                    {PIPELINE_STAGES.map(s => (
                      <option key={s} value={s}>{PIPELINE_STAGE_LABELS[s]}</option>
                    ))}
                  </select>
                </div>

                {selectedStage === "cierre" && (
                  <div>
                    <label className="text-fg-5 text-xs mb-1.5 block">Resultado del cierre *</label>
                    <div className="flex gap-2">
                      {(["ganado", "perdido"] as const).map(r => (
                        <button
                          key={r}
                          type="button"
                          onClick={() => setCloseResult(r)}
                          className={`flex-1 py-2 text-sm font-medium border transition-colors ${
                            closeResult === r
                              ? r === "ganado"
                                ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-400"
                                : "bg-red-500/20 border-red-500/50 text-red-400"
                              : "border-border text-fg-4 hover:bg-surface-3"
                          }`}
                        >
                          {r === "ganado" ? "✓ Ganado" : "✗ Perdido"}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <label className="text-fg-5 text-xs mb-1.5 block">Nota (opcional)</label>
                  <textarea
                    rows={2}
                    className="w-full bg-surface-3 border border-border text-fg text-sm px-3 py-2.5 placeholder:text-fg-6 outline-none focus:border-accent resize-none"
                    placeholder="Ej: Cliente solicitó revisión de precio..."
                    value={note}
                    onChange={e => setNote(e.target.value)}
                  />
                </div>

                {stageChanged && (
                  <button
                    type="button"
                    disabled={stageChanging}
                    onClick={handleStageChange}
                    className="w-full py-2.5 bg-accent text-black text-sm font-semibold hover:bg-accent/90 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                  >
                    {stageChanging ? <><Loader2 size={14} className="animate-spin" /> Guardando...</> : <>Guardar cambio de etapa</>}
                  </button>
                )}
              </div>
            </Section>

            {/* ── Información de contacto ──────────────────────────────────── */}
            <Section title="Información de contacto">
              <div className="space-y-2">
                <InfoRow label="Nombre" value={lead.name} />
                <InfoRow label="Email" value={
                  lead.email ? (
                    <a href={`mailto:${lead.email}`} className="text-accent hover:underline flex items-center gap-1">
                      <Mail size={11} />{lead.email}
                    </a>
                  ) : null
                } />
                <InfoRow label="Teléfono" value={
                  lead.phone_number ? (
                    <span className="flex items-center gap-1"><Phone size={11} />{lead.phone_number}</span>
                  ) : null
                } />
                <InfoRow label="Empresa" value={
                  lead.company ? (
                    <span className="flex items-center gap-1"><Building2 size={11} />{lead.company}</span>
                  ) : null
                } />
                <InfoRow label="Industria" value={lead.industry} />
                <InfoRow label="Tipo cliente" value={lead.client_type} />
              </div>
            </Section>

            {/* ── Interés comercial ────────────────────────────────────────── */}
            {(lead.equipment_interest || lead.budget_text || lead.timeline) && (
              <Section title="Interés comercial">
                <div className="space-y-2">
                  <InfoRow label="Equipo de interés" value={
                    lead.equipment_interest ? (
                      <span className="flex items-center gap-1"><Briefcase size={11} />{lead.equipment_interest}</span>
                    ) : null
                  } />
                  <InfoRow label="Presupuesto" value={
                    lead.budget_value > 0
                      ? COP(lead.budget_value)
                      : lead.budget_text ?? null
                  } />
                  <InfoRow label="Timeline" value={lead.timeline} />
                </div>
              </Section>
            )}

            {/* ── Datos RUT ────────────────────────────────────────────────── */}
            {lead.rut_received && (
              <Section title="Datos RUT / NIT">
                <div className="space-y-2">
                  <InfoRow label="NIT" value={lead.rut_nit} />
                  <InfoRow label="Razón social" value={lead.rut_razon_social} />
                  <InfoRow label="Dirección" value={lead.rut_direccion} />
                  <InfoRow label="Representante" value={lead.rut_representante} />
                </div>
              </Section>
            )}

            {/* ── Scoring ICP ──────────────────────────────────────────────── */}
            {lead.score && (
              <Section title="Calificación ICP">
                <div className="space-y-2">
                  <div className="flex items-center justify-between bg-surface-3 border border-border px-3 py-2">
                    <span className="text-fg-4 text-xs">Puntuación</span>
                    <div className="flex items-center gap-2">
                      <span className="text-fg text-sm font-semibold">{lead.score.final_score.toFixed(1)} pts</span>
                      <span className={`px-2 py-0.5 text-[11px] font-bold border rounded-sm ${TIER_COLORS[lead.score.tier_final] ?? TIER_COLORS.no_fit}`}>
                        {lead.score.tier_final === "no_fit" ? "No fit" : `Tier ${lead.score.tier_final.toUpperCase()}`}
                      </span>
                    </div>
                  </div>
                  {Object.entries(lead.score.detail).slice(0, 5).map(([key, det]) => (
                    <div key={key} className="flex items-center justify-between text-xs text-fg-5">
                      <span>{det.display_name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-fg-6 text-[11px]">{det.captured_value ?? "—"}</span>
                        <span className={`font-medium ${det.points > 0 ? "text-emerald-400" : det.points < 0 ? "text-red-400" : "text-fg-6"}`}>
                          {det.points > 0 ? `+${det.points}` : det.points}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {/* ── Cotizaciones ─────────────────────────────────────────────── */}
            <Section title="Cotizaciones">
              {quotations.length === 0 ? (
                <div className="border border-dashed border-border px-4 py-5 text-center text-fg-5 text-xs">
                  Sin cotizaciones aún
                </div>
              ) : (
                <div className="space-y-2">
                  {quotations.map(q => (
                    <div key={q.quotation_number} className="bg-surface-3 border border-border px-3 py-2.5 flex items-center justify-between gap-3">
                      <div>
                        <p className="font-mono text-xs text-accent">{q.quotation_number}</p>
                        <p className="text-fg text-sm font-semibold mt-0.5">{COP(q.total)}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {q.email_sent && (
                          <span className="text-emerald-400 flex items-center gap-1 text-xs">
                            <CheckCircle2 size={11} /> Email
                          </span>
                        )}
                        {q.pdf_url && (
                          <a href={q.pdf_url} target="_blank" rel="noopener noreferrer"
                            className="text-fg-5 hover:text-fg transition-colors" title="Descargar PDF">
                            <Download size={14} />
                          </a>
                        )}
                        <ChevronRight size={14} className="text-fg-6" />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <button
                type="button"
                onClick={() => setQD(true)}
                className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-dashed border-accent/40 text-accent text-sm hover:bg-accent/5 transition-colors"
              >
                <Plus size={14} /> Nueva cotización para este lead
              </button>
            </Section>

            {/* ── Historial de etapas ──────────────────────────────────────── */}
            <Section title="Historial de etapas">
              {historyLoading ? (
                <div className="flex items-center gap-2 text-fg-5 text-xs py-4">
                  <Loader2 size={13} className="animate-spin" /> Cargando historial...
                </div>
              ) : history.length === 0 ? (
                <div className="text-fg-6 text-xs py-2">Sin cambios de etapa registrados</div>
              ) : (
                <div className="relative pl-5">
                  {/* vertical line */}
                  <div className="absolute left-1.5 top-0 bottom-0 w-px bg-border" />
                  <div className="space-y-4">
                    {history.map((h, idx) => {
                      const toStage = h.to_stage as PipelineStage;
                      return (
                        <div key={h.id} className="relative flex gap-3">
                          {/* dot */}
                          <div className={`absolute -left-[15px] w-2.5 h-2.5 rounded-full border-2 border-surface-2 shrink-0 mt-0.5 ${STAGE_DOT[toStage] ?? "bg-fg-6"}`} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              {h.from_stage && idx > 0 && (
                                <>
                                  <span className="text-fg-5 text-xs">{PIPELINE_STAGE_LABELS[h.from_stage as PipelineStage] ?? h.from_stage}</span>
                                  <ChevronRight size={11} className="text-fg-6" />
                                </>
                              )}
                              <span className={`px-1.5 py-0.5 text-[10px] font-medium border rounded-sm ${STAGE_COLORS[toStage] ?? ""}`}>
                                {PIPELINE_STAGE_LABELS[toStage] ?? h.to_stage}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 mt-0.5 text-[11px] text-fg-6">
                              <Clock size={10} />
                              <span>{new Date(h.created_at).toLocaleString("es-CO", { dateStyle: "short", timeStyle: "short" })}</span>
                              <span>·</span>
                              <span>{h.changed_by === "bot" ? "Bot" : "Admin"}</span>
                            </div>
                            {h.note && (
                              <div className="mt-1 flex items-start gap-1 text-fg-4 text-xs">
                                <MessageSquare size={10} className="mt-0.5 shrink-0" />
                                <span>{h.note}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </Section>

            {/* ── Sesión del bot ───────────────────────────────────────────── */}
            <Section title="Sesión bot">
              <div className="space-y-2">
                <InfoRow label="ID sesión" value={
                  <span className="font-mono text-[11px] text-fg-5 break-all">{lead.session_id}</span>
                } />
                <InfoRow label="Creado" value={
                  new Date(lead.created_at).toLocaleString("es-CO", { dateStyle: "medium", timeStyle: "short" })
                } />
              </div>
              <a
                href={`/agente/sesiones/${lead.session_id}`}
                className="mt-3 flex items-center gap-1.5 text-xs text-accent hover:text-accent/80 transition-colors"
              >
                <ExternalLink size={12} /> Ver conversación completa
              </a>
            </Section>

          </div>

          {/* Footer */}
          <div className="shrink-0 px-6 py-4 border-t border-border flex gap-3">
            <button
              type="button"
              onClick={() => setQD(true)}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-accent text-black text-sm font-semibold hover:bg-accent/90 transition-colors"
            >
              <FileText size={14} /> Cotizar
            </button>
            <button onClick={onClose}
              className="px-4 py-2.5 border border-border text-fg-4 text-sm hover:bg-surface-3 transition-colors">
              Cerrar
            </button>
          </div>

        </div>
      </div>
    </>
  );
}
