import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X, Loader2, Send, Plus, Trash2, RefreshCw, Tag, Copy } from "lucide-react";
import { api, type RentalBillingConcept, type RentalReportExtraItem } from "../../services/api";
import { toast } from "sonner";

type ExtraRow = RentalReportExtraItem & { _localId: string };

function newLocalId(): string {
  return Math.random().toString(36).slice(2, 10);
}

function copFmt(v: number): string {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(v);
}

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
  const [refreshingPdf, setRefreshingPdf] = useState(false);
  const [recipients, setRecipients] = useState<string[]>(suggestedRecipients);
  const [ccEmails, setCcEmails] = useState<string[]>(suggestedCc);
  const [copyingLast, setCopyingLast] = useState(false);

  // Catálogo de conceptos + items agregados al reporte
  const [catalog, setCatalog] = useState<RentalBillingConcept[]>([]);
  const [extraItems, setExtraItems] = useState<ExtraRow[]>([]);
  const [previewedItemsSig, setPreviewedItemsSig] = useState<string>("");
  const [addOpen, setAddOpen] = useState(false);
  const [newConceptMode, setNewConceptMode] = useState(false);
  const [newConceptName, setNewConceptName] = useState("");
  const [savingConcept, setSavingConcept] = useState(false);

  useEffect(() => {
    api.rental.listBillingConcepts(true).then(setCatalog).catch(() => setCatalog([]));
  }, []);

  // Pre-cargar extras desde las cotizaciones origen (solo si no se ha enviado
  // ningún reporte previo a este cliente y el usuario no ha añadido nada todavía).
  useEffect(() => {
    if (!clientId || machineIds.length === 0) return;
    let cancelled = false;
    (async () => {
      try {
        const last = await api.rental.reportLastSend(clientId);
        if (cancelled || last) return;  // ya hubo reportes antes: no pre-cargar
        const suggested = await api.rental.reportSuggestedExtras({
          client_id: clientId,
          machine_ids: machineIds,
          date_from: dateFrom,
          date_to: dateTo,
        });
        if (cancelled || suggested.length === 0) return;
        const nextExtras: ExtraRow[] = suggested.map(it => ({
          _localId: newLocalId(),
          concept_id: it.concept_id ?? null,
          name: it.name,
          description: it.description ?? null,
          qty: Number(it.qty) || 0,
          unit_value: Number(it.unit_value) || 0,
          machine_id: it.machine_id ?? null,
        }));
        setExtraItems(prev => {
          if (prev.length > 0) return prev;
          // Si logramos pre-cargar, refrescar el PDF con esos extras ya incluidos
          fetchPdf(nextExtras);
          return nextExtras;
        });
        toast.message(`Se pre-cargaron ${suggested.length} concepto${suggested.length === 1 ? "" : "s"} de la cotización`);
      } catch {
        /* silencioso: la pre-carga es best-effort */
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]);

  const extrasTotal = useMemo(
    () => extraItems.reduce((s, it) => s + (Number(it.qty) || 0) * (Number(it.unit_value) || 0), 0),
    [extraItems]
  );

  // Firma para saber si los items en el preview actual difieren de los editados
  const currentItemsSig = useMemo(
    () => JSON.stringify(extraItems.map(it => ({ n: it.name, q: it.qty, u: it.unit_value, m: it.machine_id ?? null }))),
    [extraItems]
  );
  const itemsChanged = currentItemsSig !== previewedItemsSig;

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

  async function fetchPdf(items: ExtraRow[], isFirst = false) {
    if (isFirst) setLoading(true);
    else setRefreshingPdf(true);
    try {
      const blob = await api.rental.reportPreviewPdf({
        client_id: clientId, client_name: clientName,
        machine_ids: machineIds, date_from: dateFrom, date_to: dateTo,
        reading_ids: readingIds ?? null,
        extra_items: items.map(it => ({
          concept_id: it.concept_id ?? null,
          name: it.name,
          description: it.description ?? null,
          qty: Number(it.qty) || 0,
          unit_value: Number(it.unit_value) || 0,
          machine_id: it.machine_id ?? null,
        })),
      });
      const url = URL.createObjectURL(blob);
      if (pdfUrlRef.current) URL.revokeObjectURL(pdfUrlRef.current);
      pdfUrlRef.current = url;
      setPdfUrl(url);
      setPreviewedItemsSig(JSON.stringify(items.map(it => ({ n: it.name, q: it.qty, u: it.unit_value, m: it.machine_id ?? null }))));
    } catch (e: any) {
      setError(e?.detail ?? "Error al cargar preview del PDF");
    } finally {
      setLoading(false);
      setRefreshingPdf(false);
    }
  }

  // Carga inicial del PDF
  useEffect(() => {
    fetchPdf([], true);
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

  function addConceptFromCatalog(c: RentalBillingConcept) {
    setExtraItems(prev => [...prev, {
      _localId: newLocalId(),
      concept_id: c.id,
      name: c.name,
      description: c.description ?? null,
      qty: Number(c.default_qty) || 1,
      unit_value: Number(c.default_unit_value) || 0,
      machine_id: null,
    }]);
    setAddOpen(false);
  }

  function addBlankConcept() {
    setExtraItems(prev => [...prev, {
      _localId: newLocalId(),
      concept_id: null,
      name: "",
      description: null,
      qty: 1,
      unit_value: 0,
      machine_id: null,
    }]);
    setAddOpen(false);
  }

  function removeItem(localId: string) {
    setExtraItems(prev => prev.filter(it => it._localId !== localId));
  }

  function updateItem(localId: string, patch: Partial<ExtraRow>) {
    setExtraItems(prev => prev.map(it => it._localId === localId ? { ...it, ...patch } : it));
  }

  async function handleCopyFromLast() {
    if (!clientId) {
      toast.error("Selecciona un cliente para copiar el reporte anterior");
      return;
    }
    // Si ya hay datos locales, confirmar
    const hasLocalData = extraItems.length > 0 || note.trim().length > 0;
    if (hasLocalData) {
      // eslint-disable-next-line no-alert
      const ok = window.confirm("Esto reemplazará los extras y la nota actual. ¿Continuar?");
      if (!ok) return;
    }
    setCopyingLast(true);
    try {
      const last = await api.rental.reportLastSend(clientId);
      if (!last) {
        toast.error("No hay reportes previos para este cliente");
        return;
      }
      // Pre-rellenar: extras + note
      const nextExtras: ExtraRow[] = (last.extra_items ?? []).map(it => ({
        _localId: newLocalId(),
        concept_id: it.concept_id ?? null,
        name: it.name,
        description: it.description ?? null,
        qty: Number(it.qty) || 0,
        unit_value: Number(it.unit_value) || 0,
        machine_id: it.machine_id ?? null,
      }));
      setExtraItems(nextExtras);
      setNote(last.note ?? "");
      // Sin tocar destinatarios si el usuario ya tiene algo configurado
      if (recipients.length === 0 && last.recipient_emails.length > 0) {
        setRecipients(last.recipient_emails);
      }
      if (ccEmails.length === 0 && last.cc_emails.length > 0) {
        setCcEmails(last.cc_emails);
      }
      toast.success("Datos copiados del reporte anterior. Actualiza el PDF para verlos.");
    } catch (e: any) {
      toast.error(e?.detail ?? "Error al copiar del reporte anterior");
    } finally {
      setCopyingLast(false);
    }
  }

  async function handleCreateConcept() {
    const name = newConceptName.trim();
    if (!name) return;
    setSavingConcept(true);
    try {
      const created = await api.rental.createBillingConcept({ name });
      setCatalog(prev => [...prev, created]);
      addConceptFromCatalog(created);
      setNewConceptName("");
      setNewConceptMode(false);
      toast.success(`"${name}" guardado en el catálogo`);
    } catch (e: any) {
      toast.error(e?.detail ?? "Error al crear concepto");
    } finally {
      setSavingConcept(false);
    }
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
        extra_items: extraItems.map(it => ({
          concept_id: it.concept_id ?? null,
          name: it.name,
          description: it.description ?? null,
          qty: Number(it.qty) || 0,
          unit_value: Number(it.unit_value) || 0,
          machine_id: it.machine_id ?? null,
        })),
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

            {/* Otros conceptos */}
            <div className="border-t border-border pt-4">
              <div className="flex items-center justify-between mb-2">
                <label className="text-[10px] uppercase tracking-wider text-fg-5 font-medium flex items-center gap-1.5">
                  <Tag size={11} /> Otros conceptos ({extraItems.length})
                </label>
                <div className="flex items-center gap-1.5">
                  {clientId && (
                    <button
                      type="button"
                      onClick={handleCopyFromLast}
                      disabled={copyingLast}
                      title="Copiar extras y nota del último reporte enviado a este cliente"
                      className="flex items-center gap-1 bg-surface-3 border border-border text-fg-3 text-[11px] px-2 py-1 hover:border-accent/40 hover:text-accent transition-all disabled:opacity-40"
                    >
                      {copyingLast ? <Loader2 size={11} className="animate-spin" /> : <Copy size={11} />}
                      Copiar del anterior
                    </button>
                  )}
                  <div className="relative">
                  <button
                    type="button"
                    onClick={() => setAddOpen(v => !v)}
                    className="flex items-center gap-1 bg-accent/10 border border-accent/40 text-accent text-[11px] font-semibold px-2 py-1 hover:bg-accent/20 transition-all"
                  >
                    <Plus size={11} /> Añadir
                  </button>
                  {addOpen && (
                    <div className="absolute right-0 top-full mt-1 z-20 bg-surface-2 border border-border shadow-xl w-64 max-h-80 overflow-y-auto">
                      {!newConceptMode ? (
                        <>
                          {catalog.length === 0 ? (
                            <p className="text-fg-6 text-[11px] px-3 py-3 text-center">Catálogo vacío</p>
                          ) : (
                            catalog.map(c => (
                              <button
                                key={c.id}
                                type="button"
                                onClick={() => addConceptFromCatalog(c)}
                                className="w-full text-left px-3 py-2 text-xs text-fg-2 hover:bg-surface-3 border-b border-border/50 last:border-b-0 transition-colors"
                              >
                                <div className="font-medium">{c.name}</div>
                                {c.default_unit_value != null && (
                                  <div className="text-fg-6 text-[10px] mt-0.5">
                                    {c.default_qty} × {copFmt(c.default_unit_value)}
                                  </div>
                                )}
                              </button>
                            ))
                          )}
                          <div className="border-t border-border">
                            <button
                              type="button"
                              onClick={() => setNewConceptMode(true)}
                              className="w-full text-left px-3 py-2 text-xs text-accent hover:bg-accent/10 flex items-center gap-1.5"
                            >
                              <Plus size={11} /> Crear nuevo concepto
                            </button>
                            <button
                              type="button"
                              onClick={addBlankConcept}
                              className="w-full text-left px-3 py-2 text-xs text-fg-4 hover:bg-surface-3"
                            >
                              Añadir ítem sin guardar en catálogo
                            </button>
                          </div>
                        </>
                      ) : (
                        <div className="p-3 space-y-2">
                          <input
                            autoFocus
                            value={newConceptName}
                            onChange={e => setNewConceptName(e.target.value)}
                            onKeyDown={e => { if (e.key === "Enter") handleCreateConcept(); }}
                            placeholder="Nombre del concepto"
                            className="w-full bg-surface-3 border border-border text-xs text-fg-2 px-2 py-1.5 outline-none focus:border-accent"
                          />
                          <div className="flex gap-1.5">
                            <button
                              type="button"
                              onClick={() => { setNewConceptMode(false); setNewConceptName(""); }}
                              className="flex-1 px-2 py-1.5 text-[11px] text-fg-4 border border-border hover:border-border-light"
                            >
                              Cancelar
                            </button>
                            <button
                              type="button"
                              onClick={handleCreateConcept}
                              disabled={savingConcept || !newConceptName.trim()}
                              className="flex-1 px-2 py-1.5 text-[11px] font-semibold bg-accent text-zinc-900 hover:bg-accent-light disabled:opacity-40"
                            >
                              {savingConcept ? "Guardando..." : "Guardar"}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                </div>
              </div>

              {extraItems.length === 0 ? (
                <p className="text-fg-6 text-[11px]">Sin ítems extra. Añade conceptos del catálogo.</p>
              ) : (
                <div className="space-y-2">
                  {extraItems.map(it => (
                    <div key={it._localId} className="bg-surface-3 border border-border p-2 space-y-1.5">
                      <div className="flex items-start gap-2">
                        <input
                          value={it.name}
                          onChange={e => updateItem(it._localId, { name: e.target.value })}
                          placeholder="Nombre"
                          className="flex-1 bg-surface-2 border border-border text-xs text-fg-2 px-2 py-1 outline-none focus:border-accent"
                        />
                        <button
                          type="button"
                          onClick={() => removeItem(it._localId)}
                          className="text-fg-5 hover:text-red-400 transition-colors p-1"
                        >
                          <Trash2 size={11} />
                        </button>
                      </div>
                      <div className="grid grid-cols-3 gap-1.5">
                        <input
                          type="number"
                          step="0.01"
                          value={it.qty}
                          onChange={e => updateItem(it._localId, { qty: Number(e.target.value) })}
                          placeholder="Cant."
                          className="bg-surface-2 border border-border text-[11px] text-fg-2 px-2 py-1 outline-none focus:border-accent text-right"
                        />
                        <input
                          type="number"
                          value={it.unit_value}
                          onChange={e => updateItem(it._localId, { unit_value: Number(e.target.value) })}
                          placeholder="Vr unit"
                          className="bg-surface-2 border border-border text-[11px] text-fg-2 px-2 py-1 outline-none focus:border-accent text-right"
                        />
                        <div className="bg-surface-4 border border-border px-2 py-1 text-[11px] text-accent font-semibold text-right whitespace-nowrap overflow-hidden">
                          {copFmt((Number(it.qty) || 0) * (Number(it.unit_value) || 0))}
                        </div>
                      </div>
                      <select
                        value={it.machine_id ?? ""}
                        onChange={e => updateItem(it._localId, { machine_id: e.target.value || null })}
                        className="w-full bg-surface-2 border border-border text-[11px] text-fg-3 px-2 py-1 outline-none focus:border-accent"
                      >
                        <option value="">Global (al reporte completo)</option>
                        {machineIds.map(mid => (
                          <option key={mid} value={mid}>Ligado a máquina (ID {mid.slice(0, 8)}…)</option>
                        ))}
                      </select>
                    </div>
                  ))}

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-fg-5 text-[10px] uppercase tracking-wider font-medium">Subtotal conceptos</span>
                    <span className="text-accent text-sm font-semibold font-mono">{copFmt(extrasTotal)}</span>
                  </div>

                  {itemsChanged && (
                    <button
                      type="button"
                      onClick={() => fetchPdf(extraItems)}
                      disabled={refreshingPdf}
                      className="w-full flex items-center justify-center gap-2 bg-accent/10 border border-accent/40 text-accent text-[11px] font-semibold py-1.5 hover:bg-accent/20 disabled:opacity-40"
                    >
                      {refreshingPdf
                        ? <><Loader2 size={11} className="animate-spin" /> Actualizando PDF...</>
                        : <><RefreshCw size={11} /> Actualizar preview del PDF</>}
                    </button>
                  )}
                </div>
              )}
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
