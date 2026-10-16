import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, RefreshCw, Loader2, CheckCircle2, XCircle,
  Users, Calendar, AtSign, User as UserIcon, FileText,
} from "lucide-react";
import { api, type RentalReportHistoryItem } from "../../services/api";
import DatePicker from "../../components/ui/DatePicker";
import { toast } from "sonner";

function formatDate(d: string | null): string {
  if (!d) return "—";
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("es-CO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60)    return "hace unos segundos";
  if (diff < 3600)  return `hace ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `hace ${Math.floor(diff / 3600)} h`;
  if (diff < 604800) return `hace ${Math.floor(diff / 86400)} d`;
  return formatDateTime(iso);
}

export default function RentalReportsHistoryPage() {
  const nav = useNavigate();
  const [items, setItems] = useState<RentalReportHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState<string | null>(null);
  const [dateTo, setDateTo] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const data = await api.rental.reportsHistory({
        date_from: dateFrom || undefined,
        date_to:   dateTo || undefined,
        limit:     200,
      });
      setItems(data);
    } catch (e: any) {
      toast.error(e?.detail ?? "Error al cargar el historial");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [dateFrom, dateTo]);

  const sentOk = items.filter(i => i.status === "sent").length;
  const sentFail = items.filter(i => i.status !== "sent").length;

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-start gap-3 animate-fade-up">
        <button
          onClick={() => nav("/renta/relaciones")}
          className="mt-1 text-fg-5 hover:text-fg transition-colors"
        >
          <ArrowLeft size={16} />
        </button>
        <div className="flex-1">
          <p className="text-fg-6 text-xs uppercase tracking-wider mb-1">Renta</p>
          <h1 className="text-fg text-xl font-semibold">Historial de reportes enviados</h1>
          <p className="text-fg-5 text-xs mt-1">Trazabilidad interna. Para ver aperturas y clicks, consulta el panel de Resend.</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-end gap-3 animate-fade-up">
        <div>
          <label className="text-[10px] uppercase tracking-wider text-fg-5 font-medium block mb-1">Desde</label>
          <DatePicker value={dateFrom} onChange={setDateFrom} compact />
        </div>
        <div>
          <label className="text-[10px] uppercase tracking-wider text-fg-5 font-medium block mb-1">Hasta</label>
          <DatePicker value={dateTo} onChange={setDateTo} compact />
        </div>
        <button
          onClick={() => { setDateFrom(null); setDateTo(null); }}
          disabled={!dateFrom && !dateTo}
          className="px-3 py-2 text-xs text-fg-4 border border-border hover:border-border-light transition-all disabled:opacity-40"
        >
          Limpiar
        </button>
        <button
          onClick={load}
          className="flex items-center gap-2 bg-accent hover:bg-accent-light text-zinc-900 font-semibold
                     text-xs uppercase tracking-wider px-3 py-2 transition-all hover:shadow-glow ml-auto"
        >
          <RefreshCw size={13} /> Actualizar
        </button>
      </div>

      {/* Resumen */}
      {!loading && items.length > 0 && (
        <div className="grid grid-cols-3 gap-3 animate-fade-up">
          <div className="bg-surface-2 border border-border px-4 py-3">
            <p className="text-fg-6 text-[10px] uppercase tracking-wider">Total envíos</p>
            <p className="text-fg text-xl font-semibold mt-1">{items.length}</p>
          </div>
          <div className="bg-surface-2 border border-border px-4 py-3">
            <p className="text-fg-6 text-[10px] uppercase tracking-wider">Exitosos</p>
            <p className="text-emerald-400 text-xl font-semibold mt-1">{sentOk}</p>
          </div>
          <div className="bg-surface-2 border border-border px-4 py-3">
            <p className="text-fg-6 text-[10px] uppercase tracking-wider">Con error</p>
            <p className={`text-xl font-semibold mt-1 ${sentFail > 0 ? "text-red-400" : "text-fg-5"}`}>{sentFail}</p>
          </div>
        </div>
      )}

      {/* Loading / vacío / tabla */}
      {loading && (
        <div className="flex items-center gap-2 text-fg-5 text-sm">
          <Loader2 size={14} className="animate-spin" /> Cargando...
        </div>
      )}

      {!loading && items.length === 0 && (
        <div className="bg-surface-2 border border-border p-8 text-center text-fg-6 text-sm animate-fade-up">
          No hay envíos registrados en este rango.
        </div>
      )}

      {!loading && items.length > 0 && (
        <div className="bg-surface-2 border border-border overflow-hidden animate-fade-up">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[1100px]">
              <thead>
                <tr className="border-b border-border bg-surface-3 text-fg-5 text-[10px] uppercase tracking-wider">
                  <th className="text-left px-3 py-2 font-medium">Estado</th>
                  <th className="text-left px-3 py-2 font-medium">Enviado</th>
                  <th className="text-left px-3 py-2 font-medium">Cliente</th>
                  <th className="text-left px-3 py-2 font-medium">Periodo del reporte</th>
                  <th className="text-right px-3 py-2 font-medium">Máquinas</th>
                  <th className="text-left px-3 py-2 font-medium">Destinatarios</th>
                  <th className="text-left px-3 py-2 font-medium">Por</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {items.map(it => {
                  const isSent = it.status === "sent";
                  const open = expanded === it.id;
                  return (
                    <>
                      <tr
                        key={it.id}
                        onClick={() => setExpanded(open ? null : it.id)}
                        className="hover:bg-surface-3 transition-colors cursor-pointer"
                      >
                        <td className="px-3 py-2.5">
                          {isSent ? (
                            <span className="inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold px-2 py-0.5 rounded-sm">
                              <CheckCircle2 size={11} /> ENVIADO
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 bg-red-500/10 text-red-400 border border-red-500/30 text-[10px] font-bold px-2 py-0.5 rounded-sm">
                              <XCircle size={11} /> ERROR
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2.5">
                          <p className="text-fg-2 text-xs">{formatDateTime(it.sent_at)}</p>
                          <p className="text-fg-6 text-[10px] mt-0.5">{timeAgo(it.sent_at)}</p>
                        </td>
                        <td className="px-3 py-2.5 text-fg-2 text-sm">{it.client_name ?? "—"}</td>
                        <td className="px-3 py-2.5 text-fg-4 text-xs whitespace-nowrap">
                          {formatDate(it.date_from)} → {formatDate(it.date_to)}
                        </td>
                        <td className="px-3 py-2.5 text-right text-fg-3 text-xs font-mono">{it.machine_ids.length}</td>
                        <td className="px-3 py-2.5 text-fg-4 text-xs">
                          <div className="flex items-center gap-1.5">
                            <AtSign size={11} className="text-fg-6" />
                            <span>{it.recipient_emails.length}</span>
                            {it.cc_emails.length > 0 && (
                              <span className="text-fg-6">+ {it.cc_emails.length} CC</span>
                            )}
                          </div>
                          {it.recipient_emails[0] && (
                            <p className="text-fg-5 text-[10px] mt-0.5 truncate max-w-[220px]">
                              {it.recipient_emails[0]}{it.recipient_emails.length > 1 && ` + ${it.recipient_emails.length - 1}`}
                            </p>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-fg-4 text-xs">
                          {it.sent_by_name ? (
                            <span className="inline-flex items-center gap-1.5">
                              <UserIcon size={11} className="text-fg-6" />
                              {it.sent_by_name}
                            </span>
                          ) : (
                            <span className="text-fg-6">—</span>
                          )}
                        </td>
                      </tr>
                      {open && (
                        <tr key={`${it.id}-detail`} className="bg-surface-3/50">
                          <td colSpan={7} className="px-5 py-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <p className="text-fg-6 text-[10px] uppercase tracking-wider mb-1 flex items-center gap-1.5">
                                  <FileText size={10} /> Asunto
                                </p>
                                <p className="text-fg-2 text-xs break-all">{it.subject}</p>

                                {it.note && (
                                  <>
                                    <p className="text-fg-6 text-[10px] uppercase tracking-wider mt-3 mb-1">Nota</p>
                                    <p className="text-fg-3 text-xs whitespace-pre-line">{it.note}</p>
                                  </>
                                )}

                                {it.error && (
                                  <>
                                    <p className="text-red-400 text-[10px] uppercase tracking-wider mt-3 mb-1">Error</p>
                                    <p className="text-red-300 text-xs">{it.error}</p>
                                  </>
                                )}
                              </div>

                              <div>
                                <p className="text-fg-6 text-[10px] uppercase tracking-wider mb-1 flex items-center gap-1.5">
                                  <Users size={10} /> Destinatarios ({it.recipient_emails.length})
                                </p>
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {it.recipient_emails.map(e => (
                                    <span key={e} className="bg-accent/10 border border-accent/30 text-accent text-[11px] px-2 py-0.5 rounded-sm">{e}</span>
                                  ))}
                                </div>

                                {it.cc_emails.length > 0 && (
                                  <>
                                    <p className="text-fg-6 text-[10px] uppercase tracking-wider mt-3 mb-1">CC ({it.cc_emails.length})</p>
                                    <div className="flex flex-wrap gap-1 mt-1">
                                      {it.cc_emails.map(e => (
                                        <span key={e} className="bg-surface-4 border border-border text-fg-3 text-[11px] px-2 py-0.5 rounded-sm">{e}</span>
                                      ))}
                                    </div>
                                  </>
                                )}

                                <p className="text-fg-6 text-[10px] uppercase tracking-wider mt-3 mb-1 flex items-center gap-1.5">
                                  <Calendar size={10} /> Rango del reporte
                                </p>
                                <p className="text-fg-3 text-xs">
                                  {formatDate(it.date_from)} → {formatDate(it.date_to)} · {it.machine_ids.length} máquinas
                                </p>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
