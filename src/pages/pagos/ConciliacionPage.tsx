import { useEffect, useState } from "react";
import { Link2, Loader2, ExternalLink, Download } from "lucide-react";
import DatePicker from "../../components/ui/DatePicker";
import { toast } from "sonner";
import { api, type ReconciliationItem, type BankTransactionResponse } from "../../services/api";
import { useAbility } from "../../context/AbilityContext";

const fmtCOP = new Intl.NumberFormat("es-CO", {
  style: "currency", currency: "COP", maximumFractionDigits: 0,
});
function fmt(amount: number | null) {
  if (amount == null) return "—";
  return fmtCOP.format(Number(amount));
}

function fmtDate(d: string | null) {
  if (!d) return "—";
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}

/** Returns today as YYYY-MM-DD */
function today() {
  return new Date().toISOString().slice(0, 10);
}

export default function ConciliacionPage() {
  const ability = useAbility();
  const canWrite = ability.can("update", "Payments");

  const [items, setItems] = useState<ReconciliationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [matching, setMatching] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(today());
  const [downloading, setDownloading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const data = await api.payments.reconciliation();
      setItems(data);
    } catch {
      toast.error("Error cargando conciliación");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleMatch(paymentId: string, txId: string) {
    setMatching(`${paymentId}-${txId}`);
    try {
      await api.payments.match(paymentId, txId);
      toast.success("Conciliación realizada");
      await load();
    } catch (err: unknown) {
      const detail = (err as { detail?: string }).detail;
      toast.error(detail ?? "Error al conciliar");
    } finally {
      setMatching(null);
    }
  }

  // Filter items by selected date (extracted_date)
  const filteredItems = items.filter(
    ({ payment }) => payment.extracted_date === selectedDate,
  );

  async function handleExport() {
    setDownloading(true);
    try {
      const blob = await api.payments.reconciliationExport(selectedDate, selectedDate);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `conciliacion_${selectedDate}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Error generando el reporte");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="p-6 space-y-6 animate-fade-up">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold text-fg">Conciliación</h1>
          <p className="text-sm text-fg-5 mt-0.5">
            Comprobantes WhatsApp pendientes con posibles coincidencias en el extracto
          </p>
        </div>

        {/* Month picker + export */}
        <div className="flex items-center gap-3">
          <div className="flex flex-col gap-1 w-44">
            <label className="text-xs text-fg-5 uppercase tracking-wide font-medium">Día a conciliar</label>
            <DatePicker
              value={selectedDate}
              onChange={(v) => setSelectedDate(v ?? today())}
              placeholder="Seleccionar día"
            />
          </div>
          <button
            onClick={handleExport}
            disabled={downloading}
            className="flex items-center gap-2 px-4 py-2 bg-surface-3 border border-border text-fg-3
                       text-sm font-medium rounded hover:border-accent/40 hover:text-fg transition-all
                       disabled:opacity-60 self-end"
          >
            {downloading
              ? <Loader2 size={15} className="animate-spin" />
              : <Download size={15} />
            }
            Descargar Excel
          </button>
        </div>
      </div>

      {/* Info about what the Excel contains */}
      <div className="bg-surface-2 border border-border/50 rounded-lg px-4 py-3 text-xs text-fg-5">
        El reporte Excel incluye 3 hojas para el día seleccionado:
        <span className="text-green-400 mx-1">Conciliados</span>·
        <span className="text-yellow-400 mx-1">Comprobantes sin conciliar</span>·
        <span className="text-red-400 mx-1">Extracto sin conciliar</span>
      </div>

      {/* Pending reconciliation list */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 size={24} className="animate-spin text-fg-5" />
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="bg-surface-2 border border-border rounded-lg p-16 text-center">
          <p className="text-fg-5 text-sm">No hay comprobantes pendientes para el {fmtDate(selectedDate)}</p>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-xs text-fg-5">{filteredItems.length} comprobante{filteredItems.length !== 1 ? "s" : ""} pendiente{filteredItems.length !== 1 ? "s" : ""} el {fmtDate(selectedDate)}</p>
          {filteredItems.map(({ payment, candidates }) => (
            <div key={payment.id} className="bg-surface-2 border border-border rounded-lg overflow-hidden">
              {/* Payment header */}
              <div className="px-5 py-4 border-b border-border flex items-start justify-between gap-4">
                <div className="flex items-start gap-6 flex-wrap">
                  <div>
                    <p className="text-xs text-fg-5 uppercase tracking-wide font-medium mb-1">Valor</p>
                    <p className="text-accent font-semibold text-base font-mono">{fmt(payment.extracted_amount as unknown as number)}</p>
                    <p className="text-fg-4 text-xs mt-0.5">{fmtDate(payment.extracted_date)}</p>
                  </div>
                  {payment.payer_name && (
                    <div className="pl-4 border-l border-border">
                      <p className="text-xs text-fg-5 uppercase tracking-wide font-medium mb-1">Pagador</p>
                      <p className="text-fg-3 text-sm">{payment.payer_name}</p>
                    </div>
                  )}
                  <div className="pl-4 border-l border-border">
                    <p className="text-xs text-fg-5 uppercase tracking-wide font-medium mb-1">Remitente WA</p>
                    <p className="text-fg-3 text-sm">{payment.whatsapp_sender_name ?? payment.whatsapp_sender}</p>
                  </div>
                </div>
                <a
                  href={payment.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs text-fg-5 hover:text-accent transition-colors whitespace-nowrap mt-1 flex-shrink-0"
                >
                  <ExternalLink size={13} />
                  Ver archivo
                </a>
              </div>

              {/* Candidates */}
              <div className="px-5 py-3">
                {candidates.length === 0 ? (
                  <p className="text-xs text-fg-5 py-2">
                    Sin coincidencias en el extracto — concilia manualmente subiendo el Excel
                  </p>
                ) : (
                  <div className="space-y-2">
                    <p className="text-xs text-fg-5 uppercase tracking-wide font-medium mb-2">
                      {candidates.length === 1 ? "1 coincidencia" : `${candidates.length} coincidencias`} en extracto
                    </p>
                    {candidates.map((tx: BankTransactionResponse) => (
                      <div
                        key={tx.id}
                        className="flex items-center justify-between gap-4 px-4 py-3 bg-surface-3 rounded-md"
                      >
                        <div className="flex items-center gap-6 flex-wrap">
                          <div>
                            <p className="text-accent font-semibold text-sm font-mono">{fmt(tx.amount as unknown as number)}</p>
                            <p className="text-fg-5 text-xs">{fmtDate(tx.transaction_date)}</p>
                          </div>
                          <p className="text-fg-4 text-xs max-w-xs truncate">{tx.description || "—"}</p>
                          <p className="text-fg-6 text-xs font-mono">{tx.account}</p>
                        </div>
                        {canWrite && (
                          <button
                            onClick={() => handleMatch(payment.id, tx.id)}
                            disabled={!!matching}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-accent text-black text-xs
                                       font-medium rounded hover:bg-accent/90 transition-colors
                                       disabled:opacity-60 whitespace-nowrap flex-shrink-0"
                          >
                            {matching === `${payment.id}-${tx.id}`
                              ? <Loader2 size={12} className="animate-spin" />
                              : <Link2 size={12} />
                            }
                            Conciliar
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
