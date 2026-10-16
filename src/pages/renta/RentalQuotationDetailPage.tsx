import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft, Loader2, Check, ArrowRight, Send, FileDown, Mail, History, FileText, Ghost, Copy,
} from "lucide-react";
import {
  api,
  type RentalQuotationResponse,
  type RentalQuotationSendHistoryItem,
} from "../../services/api";
import { toast } from "sonner";
import RentalQuotationModal from "../../components/renta/RentalQuotationModal";
import LostQuotationModal from "../../components/renta/LostQuotationModal";
import ConvertQuotationModal from "../../components/renta/ConvertQuotationModal";

function formatCOP(v: number | null | undefined): string {
  if (v == null) return "—";
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(v);
}
function fmtDate(s: string | null | undefined): string {
  if (!s) return "—";
  return new Date(s).toLocaleString("es-CO", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

const STATUS_META: Record<string, { label: string; color: string }> = {
  draft:     { label: "Borrador",   color: "bg-zinc-500/15 text-zinc-300 border-zinc-500/30" },
  sent:      { label: "Enviada",    color: "bg-sky-500/15 text-sky-300 border-sky-500/30" },
  approved:  { label: "Aprobada",   color: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" },
  rejected:  { label: "Rechazada",  color: "bg-red-500/15 text-red-300 border-red-500/30" },
  lost:      { label: "Perdida",    color: "bg-rose-500/15 text-rose-300 border-rose-500/30" },
  expired:   { label: "Expirada",   color: "bg-amber-500/15 text-amber-300 border-amber-500/30" },
  converted: { label: "Convertida", color: "bg-violet-500/15 text-violet-300 border-violet-500/30" },
};

export default function RentalQuotationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const nav = useNavigate();
  const [q, setQ] = useState<RentalQuotationResponse | null>(null);
  const [sends, setSends] = useState<RentalQuotationSendHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showLostModal, setShowLostModal] = useState(false);
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [acting, setActing] = useState(false);
  const [duplicating, setDuplicating] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  async function handleDuplicate() {
    if (!q) return;
    setDuplicating(true);
    try {
      const newQ = await api.rental.duplicateQuotation(q.id);
      toast.success(`Cotización duplicada: ${newQ.number}`);
      nav(`/renta/cotizaciones/${newQ.id}`);
    } catch (e: any) {
      toast.error(e?.detail ?? "Error al duplicar");
    } finally {
      setDuplicating(false);
    }
  }

  async function downloadPdf() {
    if (!q) return;
    setDownloadingPdf(true);
    try {
      const blob = await api.rental.getQuotationPdf(q.id);
      const url = URL.createObjectURL(blob);
      const safeNum = q.number.replace(/[^a-zA-Z0-9-_]/g, "_");
      const a = document.createElement("a");
      a.href = url;
      a.download = `cotizacion-${safeNum}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e: any) {
      toast.error(e?.detail ?? "No se pudo descargar el PDF");
    } finally {
      setDownloadingPdf(false);
    }
  }

  async function openPdfInNewTab() {
    if (!q) return;
    setDownloadingPdf(true);
    try {
      const blob = await api.rental.getQuotationPdf(q.id);
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (e: any) {
      toast.error(e?.detail ?? "No se pudo abrir el PDF");
    } finally {
      setDownloadingPdf(false);
    }
  }

  async function load() {
    if (!id) return;
    setLoading(true);
    try {
      const [data, history] = await Promise.all([
        api.rental.getQuotation(id),
        api.rental.listQuotationSends(id),
      ]);
      setQ(data);
      setSends(history);
    } catch {
      toast.error("No se pudo cargar la cotización");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id]);

  async function handleApprove() {
    if (!q) return;
    setActing(true);
    try {
      await api.rental.approveQuotation(q.id);
      toast.success("Cotización aprobada", {
        duration: 5000,
        action: {
          label: "Deshacer",
          onClick: async () => {
            try {
              await api.rental.revertApproval(q.id);
              toast.message("Aprobación revertida");
            } catch (e: any) {
              toast.error(e?.detail ?? "No se pudo deshacer");
            } finally {
              load();
            }
          },
        },
      });
      load();
    } catch (e: any) {
      toast.error(e?.detail ?? "Error al aprobar");
    } finally { setActing(false); }
  }

  function handleConvert() {
    if (!q) return;
    setShowConvertModal(true);
  }

  function handleConverted() {
    setShowConvertModal(false);
    if (q && q.items.length === 1) {
      nav("/renta/relaciones");
    } else {
      nav("/renta/relaciones");
    }
  }

  if (loading || !q) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 size={20} className="animate-spin text-accent" />
      </div>
    );
  }

  const effectiveStatus = q.is_expired && q.status === "sent" ? "expired" : q.status;
  const meta = STATUS_META[effectiveStatus] ?? STATUS_META.draft;

  const canEdit    = q.status === "draft";
  const canApprove = q.status === "sent" || q.status === "draft" || q.status === "lost";
  const canLose    = q.status !== "converted" && q.status !== "lost";
  const canConvert = q.status === "approved";
  const canResend  = q.status === "sent" || q.status === "approved" || q.status === "draft";

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 animate-fade-up">
        <div className="flex items-start gap-3 min-w-0">
          <button onClick={() => nav("/renta/cotizaciones")} className="text-fg-5 hover:text-fg transition-colors mt-1 shrink-0">
            <ArrowLeft size={18} />
          </button>
          <div className="min-w-0">
            <p className="text-fg-6 text-xs uppercase tracking-wider mb-1">Cotización</p>
            <h1 className="text-fg text-xl font-semibold flex items-center gap-2 flex-wrap">
              {q.number}
              <span className={`inline-flex items-center gap-1 border text-[10px] font-bold px-2 py-0.5 rounded-sm ${meta.color}`}>
                {meta.label}
              </span>
            </h1>
            <p className="text-fg-5 text-xs mt-1 truncate">
              {q.client_name} {q.project_name ? `· ${q.project_name}` : ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {canEdit && (
            <button onClick={() => setShowEditModal(true)}
              className="px-3 py-2 text-xs text-fg-2 border border-border hover:border-border-light">
              Editar
            </button>
          )}
          <button
            onClick={handleDuplicate}
            disabled={duplicating}
            title="Crear una copia como nuevo borrador"
            className="flex items-center gap-1.5 px-3 py-2 text-xs text-fg-2 border border-border hover:border-accent/40 hover:text-accent disabled:opacity-40 transition-colors">
            {duplicating ? <Loader2 size={12} className="animate-spin" /> : <Copy size={12} />}
            Duplicar
          </button>
          {canResend && (
            <button onClick={() => setShowEditModal(true)}
              className="flex items-center gap-1.5 px-3 py-2 text-xs text-sky-300 bg-sky-500/10 border border-sky-500/30 hover:bg-sky-500/20"
              title="Abre el modal para editar la cotización o reenviarla por email">
              <Send size={11} /> Reenviar o Editar
            </button>
          )}
          {canApprove && (
            <button onClick={handleApprove} disabled={acting}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-40">
              <Check size={12} /> Marcar aprobada
            </button>
          )}
          {canLose && (
            <button onClick={() => setShowLostModal(true)}
              className="flex items-center gap-1.5 px-3 py-2 text-xs text-rose-300 bg-rose-500/10 border border-rose-500/30 hover:bg-rose-500/20"
              title="Se perdió sin cierre (no respondió, competencia, timing, precio)">
              <Ghost size={12} /> Marcar perdida
            </button>
          )}
          {canConvert && (
            <button onClick={handleConvert}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-violet-600 hover:bg-violet-500 text-white">
              <ArrowRight size={12} />
              Convertir en asignación
            </button>
          )}
        </div>
      </div>

      {/* Resumen cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <InfoCard label="Equipos" value={String(q.items.length)} />
        <InfoCard label="Stand by mensual" value={formatCOP(q.subtotal_standby)} />
        <InfoCard label="Conceptos extra" value={formatCOP(q.extras_total)} />
        <InfoCard label="Total propuesto" value={formatCOP(q.total_estimated)} highlight />
      </div>

      {/* Metadatos */}
      <div className="bg-surface-2 border border-border p-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
        <Meta label="Emisión" value={fmtDate(q.issued_date)} />
        <Meta label="Validez" value={`${q.valid_days} días`} />
        <Meta label="Enviada" value={fmtDate(q.sent_at)} />
        <Meta label="Expira" value={fmtDate(q.valid_until)} />
        <Meta label="Contacto" value={q.contact_name ?? "—"} />
        <Meta label="Email contacto" value={q.contact_email ?? "—"} />
        <Meta label="NIT" value={q.client_document ?? "—"} />
        <Meta label="Creada por" value={q.created_by_name ?? "—"} />
      </div>

      {q.lost_reason && (
        <div className="bg-rose-500/10 border border-rose-500/30 p-3 text-rose-300 text-xs flex items-start gap-2">
          <Ghost size={13} className="shrink-0 mt-0.5" />
          <div>
            <strong>Marcada como perdida:</strong> {q.lost_reason}
            {q.lost_at && <span className="text-rose-400/70 ml-2">· {fmtDate(q.lost_at)}</span>}
          </div>
        </div>
      )}
      {q.converted_assignment_id && (
        <div className="bg-violet-500/10 border border-violet-500/30 p-3 text-violet-300 text-xs flex items-center gap-2">
          <ArrowRight size={13} /> Convertida en asignación. Puedes verla desde /renta/relaciones.
        </div>
      )}

      {/* Grid: Equipos / Historial envíos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-surface-2 border border-border overflow-hidden">
          <div className="px-4 py-2 border-b border-border bg-surface-3 flex items-center gap-2">
            <FileText size={13} className="text-fg-5" />
            <span className="text-fg-5 text-[10px] uppercase tracking-wider">Equipos cotizados</span>
          </div>
          <div className="divide-y divide-border">
            {q.items.map((it, idx) => {
              const standby = (it.rate_hour || 0) * (it.standby_hours || 176);
              return (
                <div key={idx} className="p-3 flex items-start gap-3">
                  {it.snapshot.image_url && (
                    <img src={it.snapshot.image_url} alt="" className="w-12 h-12 sm:w-16 sm:h-16 object-contain bg-surface-3 shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-fg font-mono text-sm font-bold">{it.snapshot.code}</div>
                    <div className="text-fg-5 text-[11px]">
                      {[it.snapshot.brand, it.snapshot.model].filter(Boolean).join(" · ")}
                      {it.snapshot.plate && ` · placa ${it.snapshot.plate}`}
                    </div>
                  </div>
                  <div className="text-right text-xs">
                    <div className="text-fg-2 font-semibold">{formatCOP(it.rate_hour)} / h</div>
                    <div className="text-fg-5">{it.standby_hours ?? 176} h stand by</div>
                    <div className="text-accent font-semibold mt-1">{formatCOP(standby)} / mes</div>
                  </div>
                </div>
              );
            })}
          </div>

          {q.extra_items.length > 0 && (
            <>
              <div className="px-4 py-2 border-y border-border bg-surface-3 flex items-center gap-2">
                <FileText size={13} className="text-fg-5" />
                <span className="text-fg-5 text-[10px] uppercase tracking-wider">Conceptos adicionales</span>
              </div>
              <div className="divide-y divide-border">
                {q.extra_items.map((e, i) => (
                  <div key={i} className={`p-3 flex items-center gap-3 ${e.is_optional ? "bg-amber-500/5" : ""}`}>
                    <div className="flex-1">
                      <div className="text-fg-2 text-xs font-medium">
                        {e.name} {e.is_optional && <span className="text-amber-400 text-[10px]">(opcional)</span>}
                      </div>
                      {e.description && <div className="text-fg-6 text-[10px]">{e.description}</div>}
                    </div>
                    <div className="text-right text-xs">
                      <div className="text-fg-5">{e.qty} × {formatCOP(e.unit_value)}</div>
                      <div className="text-fg-2 font-semibold">{formatCOP((e.qty || 0) * (e.unit_value || 0))}</div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          <div className="p-3 bg-surface-3 flex items-center justify-between border-t border-border">
            <div className="flex items-center gap-2">
              <button onClick={openPdfInNewTab} disabled={downloadingPdf}
                className="flex items-center gap-1.5 text-xs text-fg-3 hover:text-accent transition-colors disabled:opacity-40">
                {downloadingPdf ? <Loader2 size={13} className="animate-spin" /> : <FileDown size={13} />}
                Ver PDF
              </button>
              <span className="text-fg-6 text-xs">·</span>
              <button onClick={downloadPdf} disabled={downloadingPdf}
                className="flex items-center gap-1.5 text-xs text-fg-3 hover:text-accent transition-colors disabled:opacity-40">
                {downloadingPdf ? <Loader2 size={13} className="animate-spin" /> : <FileDown size={13} />}
                Descargar
              </button>
            </div>
            <div className="text-right">
              <div className="text-fg-5 text-[10px] uppercase">Total propuesto</div>
              <div className="text-accent font-bold text-base">{formatCOP(q.total_estimated)}</div>
            </div>
          </div>
        </div>

        {/* Historial envíos */}
        <div className="bg-surface-2 border border-border overflow-hidden">
          <div className="px-4 py-2 border-b border-border bg-surface-3 flex items-center gap-2">
            <History size={13} className="text-fg-5" />
            <span className="text-fg-5 text-[10px] uppercase tracking-wider">Historial de envíos</span>
          </div>
          {sends.length === 0 ? (
            <div className="text-center text-fg-6 text-xs py-6">Sin envíos</div>
          ) : (
            <div className="divide-y divide-border">
              {sends.map(s => (
                <div key={s.id} className="p-3 text-xs">
                  <div className="flex items-start gap-2">
                    <Mail size={12} className="text-fg-5 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="text-fg-3">{fmtDate(s.sent_at)}</div>
                      <div className="text-fg-6 text-[10px]">{s.sent_by_name ?? "—"}</div>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {s.recipient_emails.map(e => (
                          <span key={e} className="bg-surface-3 border border-border text-fg-3 text-[10px] px-1.5 py-0.5">{e}</span>
                        ))}
                      </div>
                      {s.status === "failed" && (
                        <div className="text-red-400 text-[10px] mt-1">Error: {s.error}</div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modales */}
      {showEditModal && (
        <RentalQuotationModal
          quotationId={q.id}
          onClose={() => setShowEditModal(false)}
          onSaved={() => { setShowEditModal(false); load(); }}
        />
      )}
      {showLostModal && (
        <LostQuotationModal quotationId={q.id} onClose={() => setShowLostModal(false)} onDone={() => { setShowLostModal(false); load(); }} />
      )}
      {showConvertModal && (
        <ConvertQuotationModal
          quotation={q}
          onClose={() => setShowConvertModal(false)}
          onConverted={handleConverted}
        />
      )}
    </div>
  );
}

function InfoCard({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`border border-border p-4 ${highlight ? "bg-accent/10 border-accent/40" : "bg-surface-2"}`}>
      <div className="text-fg-6 text-[10px] uppercase tracking-wider">{label}</div>
      <div className={`text-base font-bold mt-1 ${highlight ? "text-accent" : "text-fg"}`}>{value}</div>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-fg-6 text-[10px] uppercase tracking-wider">{label}</div>
      <div className="text-fg-3 text-sm mt-0.5 truncate">{value}</div>
    </div>
  );
}

