import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X, Loader2, Send } from "lucide-react";
import { api } from "../../services/api";

interface Props {
  clientId?: string | null;
  clientName: string;
  machineIds: string[];
  dateFrom: string;
  dateTo: string;
  readingIds?: number[] | null;  // Si viene, filtrar SOLO estos readings
  suggestedRecipients: string[];
  suggestedCc: string[];
  onClose: () => void;
  onSent: () => void;
}

export default function ReportPreviewModal({
  clientId, clientName, machineIds, dateFrom, dateTo, readingIds,
  suggestedRecipients, suggestedCc, onClose, onSent,
}: Props) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const pdfUrlRef = useRef<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [recipients, setRecipients] = useState<string[]>(suggestedRecipients);
  const [ccEmails, setCcEmails] = useState<string[]>([]);
  // Nota: no usamos suggestedCc por defecto; queda vacío para que el usuario lo llene si quiere.
  void suggestedCc;

  // Si no vienen destinatarios pero hay clientId, cargar del billing_email del cliente
  useEffect(() => {
    if (recipients.length > 0 || !clientId) return;
    (async () => {
      try {
        const c = await api.clients.get(clientId);
        if (c.billing_email) setRecipients([c.billing_email]);
      } catch { /* ignore */ }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]);
  const [newRecipient, setNewRecipient] = useState("");
  const [newCc, setNewCc] = useState("");
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Carga única del PDF — la nota va solo en el cuerpo del email, no en el PDF
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const blob = await api.rental.reportPreviewPdf({
          client_id: clientId, client_name: clientName,
          machine_ids: machineIds, date_from: dateFrom, date_to: dateTo,
          reading_ids: readingIds ?? null,
        });
        const url = URL.createObjectURL(blob);
        if (pdfUrlRef.current) URL.revokeObjectURL(pdfUrlRef.current);
        pdfUrlRef.current = url;
        setPdfUrl(url);
      } catch (e: any) {
        setError(e?.detail ?? "Error al cargar preview del PDF");
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cleanup al desmontar
  useEffect(() => {
    return () => {
      if (pdfUrlRef.current) URL.revokeObjectURL(pdfUrlRef.current);
    };
  }, []);

  function addEmail(list: string[], setList: (v: string[]) => void, raw: string, setRaw: (v: string) => void) {
    const e = raw.trim().toLowerCase();
    if (!e || !e.includes("@")) return;
    if (list.includes(e)) { setRaw(""); return; }
    setList([...list, e]);
    setRaw("");
  }

  async function handleSend() {
    if (recipients.length === 0) return;
    setSending(true);
    setError(null);
    try {
      await api.rental.reportSend({
        client_id: clientId,
        client_name: clientName,
        machine_ids: machineIds,
        date_from: dateFrom,
        date_to: dateTo,
        recipient_emails: recipients,
        cc_emails: ccEmails,
        note: note || null,
        reading_ids: readingIds ?? null,
      });
      onSent();
    } catch (e: any) {
      setError(e?.detail ?? "Error al enviar el correo");
    } finally {
      setSending(false);
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-surface-2 border border-border w-full max-w-5xl animate-fade-up max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div>
            <h2 className="text-fg font-semibold text-sm">Reporte para {clientName}</h2>
            <p className="text-fg-6 text-xs">{machineIds.length} máquinas · {dateFrom} → {dateTo} · PDF adjunto</p>
          </div>
          <button onClick={onClose} className="text-fg-5 hover:text-fg transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_320px]">
          {/* Preview PDF */}
          <div className="overflow-hidden p-4 bg-surface relative">
            {loading ? (
              <div className="flex items-center justify-center h-full text-fg-5 text-sm gap-2">
                <Loader2 size={16} className="animate-spin" /> Generando PDF...
              </div>
            ) : (
              <>
                <div className="bg-white border border-border shadow-sm h-full">
                  {pdfUrl && (
                    <iframe
                      title="preview-pdf"
                      className="w-full h-[75vh] border-0"
                      src={pdfUrl}
                    />
                  )}
                </div>
              </>
            )}
          </div>

          {/* Send panel */}
          <div className="border-l border-border p-4 space-y-4 overflow-y-auto bg-surface-2">
            <div className="bg-accent/5 border border-accent/30 px-3 py-2 text-[11px] text-fg-3">
              📎 Se enviará como PDF adjunto. El correo lleva un resumen breve.
            </div>

            <div>
              <label className="text-[10px] uppercase tracking-wider text-fg-5 font-medium">Para</label>
              <div className="flex flex-wrap gap-1.5 mt-1 mb-1.5">
                {recipients.map((e, i) => (
                  <span key={e} className="inline-flex items-center gap-1 bg-accent/10 border border-accent/40 text-accent text-xs px-2 py-1">
                    {e}
                    <button
                      onClick={() => setRecipients(recipients.filter((_, idx) => idx !== i))}
                      className="hover:text-fg"
                    >
                      <X size={10} />
                    </button>
                  </span>
                ))}
              </div>
              <input
                value={newRecipient}
                onChange={(e) => setNewRecipient(e.target.value)}
                onKeyDown={(e) => (e.key === "Enter" || e.key === ",") && (e.preventDefault(), addEmail(recipients, setRecipients, newRecipient, setNewRecipient))}
                onBlur={() => newRecipient.trim() && addEmail(recipients, setRecipients, newRecipient, setNewRecipient)}
                placeholder="Añadir correo (Enter)"
                type="email"
                className="w-full bg-surface-3 border border-border text-xs text-fg-2 px-2 py-1.5 outline-none focus:border-accent"
              />
            </div>

            <div>
              <label className="text-[10px] uppercase tracking-wider text-fg-5 font-medium">CC</label>
              <div className="flex flex-wrap gap-1.5 mt-1 mb-1.5">
                {ccEmails.map((e, i) => (
                  <span key={e} className="inline-flex items-center gap-1 bg-surface-4 border border-border text-fg-3 text-xs px-2 py-1">
                    {e}
                    <button
                      onClick={() => setCcEmails(ccEmails.filter((_, idx) => idx !== i))}
                      className="hover:text-red-400"
                    >
                      <X size={10} />
                    </button>
                  </span>
                ))}
              </div>
              <input
                value={newCc}
                onChange={(e) => setNewCc(e.target.value)}
                onKeyDown={(e) => (e.key === "Enter" || e.key === ",") && (e.preventDefault(), addEmail(ccEmails, setCcEmails, newCc, setNewCc))}
                onBlur={() => newCc.trim() && addEmail(ccEmails, setCcEmails, newCc, setNewCc)}
                placeholder="Añadir CC (Enter)"
                type="email"
                className="w-full bg-surface-3 border border-border text-xs text-fg-2 px-2 py-1.5 outline-none focus:border-accent"
              />
            </div>

            <div>
              <label className="text-[10px] uppercase tracking-wider text-fg-5 font-medium">Nota adicional (opcional)</label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={4}
                placeholder="Según el acta del mes anterior..."
                className="w-full bg-surface-3 border border-border text-xs text-fg-2 px-3 py-2 outline-none focus:border-accent resize-none mt-1 placeholder:text-fg-6"
              />
              <p className="text-fg-6 text-[10px] mt-1">
                Se incluye en el cuerpo del correo (no en el PDF adjunto).
              </p>
            </div>

            {error && (
              <div className="text-red-400 text-xs bg-red-950/30 border border-red-900/40 px-3 py-2">{error}</div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 px-5 py-4 border-t border-border">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs text-fg-4 border border-border hover:border-border-light transition-all"
          >
            Cancelar
          </button>
          <button
            onClick={handleSend}
            disabled={sending || recipients.length === 0 || loading}
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-accent hover:bg-accent-light text-zinc-900 transition-all hover:shadow-glow disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Send size={12} />
            {sending ? "Enviando..." : "Enviar reporte"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
