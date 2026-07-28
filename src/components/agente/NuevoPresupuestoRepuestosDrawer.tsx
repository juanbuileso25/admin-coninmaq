import { useEffect, useRef, useState } from "react";
import { X, Plus, Trash2, Loader2, Search } from "lucide-react";
import { toast } from "sonner";
import { api, type SparePart, type SparePartSuggestion, type ManualQuotationResponse } from "../../services/api";

const COP = (n: number) => `$${n.toLocaleString("es-CO")}`;
const parseCOP = (s: string) => parseInt(s.replace(/\D/g, ""), 10) || 0;
const fmtInput = (n: number) => (n > 0 ? n.toLocaleString("es-CO") : "");

type LineItem = {
  id:         number;
  code:       string;
  name:       string;
  cantidad:   number;
  sale_price: number;
  tax_rate:   number;
  tax_value:  number;
};

interface Props {
  open:      boolean;
  onClose:   () => void;
  onCreated?: () => void;
  prefill?: {
    request_id?:       number;
    session_id?:       string | null;
    lead_name?:        string | null;
    lead_email?:       string | null;
    lead_phone?:       string | null;
    lead_company?:     string | null;
    lead_rut_nit?:     string | null;
    lead_address?:     string | null;
    quantity?:         number | null;
    part_description?: string | null;
  };
}

export default function NuevoPresupuestoRepuestosDrawer({ open, onClose, onCreated, prefill }: Props) {
  // Line items
  const [items, setItems]             = useState<LineItem[]>([]);
  const [spSearch, setSpSearch]       = useState("");
  const [spResults, setSpResults]     = useState<SparePart[]>([]);
  const [spLoading, setSpLoading]     = useState(false);
  const [showSearch, setShowSearch]   = useState(true);
  const spDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Client fields
  const [clienteNombre,  setNombre]  = useState("");
  const [clienteEmail,   setEmail]   = useState("");
  const [clienteEmpresa, setEmpresa] = useState("");
  const [clienteNIT,     setNIT]     = useState("");
  const [clienteDir,     setDir]     = useState("");

  // Delivery
  const [modoEntrega, setModo]  = useState<"email" | "chat" | "ambas">("email");
  const [sendToWa, setSendToWa] = useState(true);

  // Suggestions
  const [suggestions, setSuggestions]         = useState<SparePartSuggestion[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);

  // State
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult]         = useState<ManualQuotationResponse | null>(null);

  const fromLead = !!(prefill?.session_id?.startsWith("wa_"));

  // Reset on close
  useEffect(() => {
    if (!open) {
      setItems([]); setSpSearch(""); setSpResults([]); setShowSearch(true);
      setNombre(""); setEmail(""); setEmpresa(""); setNIT(""); setDir("");
      setModo("email"); setSendToWa(true); setResult(null);
      setSuggestions([]); setSuggestionsLoading(false);
    }
  }, [open]);

  // Pre-fill when drawer opens with prefill data
  useEffect(() => {
    if (!open || !prefill) return;
    if (prefill.lead_name)    setNombre(prefill.lead_name);
    if (prefill.lead_email)   setEmail(prefill.lead_email);
    if (prefill.lead_company) setEmpresa(prefill.lead_company);
    if (prefill.lead_rut_nit) setNIT(prefill.lead_rut_nit);
    if (prefill.lead_address) setDir(prefill.lead_address);
  }, [open, prefill]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load suggestions when drawer opens with a request_id
  useEffect(() => {
    if (!open || !prefill?.request_id) return;
    setSuggestionsLoading(true);
    api.spareParts.suggestions(prefill.request_id)
      .then(setSuggestions)
      .catch(() => setSuggestions([]))
      .finally(() => setSuggestionsLoading(false));
  }, [open, prefill?.request_id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Debounced spare parts search
  useEffect(() => {
    if (!open || !showSearch) return;
    if (spDebounce.current) clearTimeout(spDebounce.current);
    if (!spSearch.trim()) { setSpResults([]); return; }
    spDebounce.current = setTimeout(async () => {
      setSpLoading(true);
      try {
        const res = await api.spareParts.list({ search: spSearch, page_size: 10, is_active: true });
        setSpResults(res.data);
      } catch {
        toast.error("No se pudo buscar repuestos");
      } finally {
        setSpLoading(false);
      }
    }, 300);
  }, [spSearch, open, showSearch]);

  const addItem = (sp: { id: number; code: string; name: string; sale_price: number; tax_value: number }) => {
    const existing = items.find(i => i.id === sp.id);
    if (existing) {
      setItems(prev => prev.map(i => i.id === sp.id ? { ...i, cantidad: i.cantidad + 1 } : i));
    } else {
      const taxRate = sp.tax_value > 0 && sp.sale_price > 0 ? sp.tax_value / sp.sale_price : 0.19;
      const cantidad = (items.length === 0 && prefill?.quantity) ? prefill.quantity : 1;
      setItems(prev => [
        ...prev,
        { id: sp.id, code: sp.code, name: sp.name, cantidad, sale_price: sp.sale_price, tax_rate: taxRate, tax_value: sp.tax_value },
      ]);
    }
  };

  const addSparePart = (sp: SparePart) => {
    addItem(sp);
    setSpSearch("");
    setSpResults([]);
  };

  const addSuggestion = (s: SparePartSuggestion) => {
    addItem(s);
    setSuggestions(prev => prev.filter(x => x.id !== s.id));
  };

  const updateQty = (id: number, qty: number) => {
    if (qty < 1) return;
    setItems(prev => prev.map(i => i.id === id ? { ...i, cantidad: qty } : i));
  };

  const updateSalePrice = (id: number, raw: string) => {
    const sp = parseCOP(raw);
    setItems(prev => prev.map(i =>
      i.id === id
        ? { ...i, sale_price: sp, tax_value: Math.round(sp * i.tax_rate) }
        : i
    ));
  };

  const removeItem = (id: number) => setItems(prev => prev.filter(i => i.id !== id));

  const subtotal = items.reduce((acc, i) => acc + i.sale_price * i.cantidad, 0);
  const iva      = items.reduce((acc, i) => acc + i.tax_value  * i.cantidad, 0);
  const total    = subtotal + iva;

  const submit = async () => {
    if (!clienteNombre.trim()) return toast.error("Ingresa el nombre del contacto");
    if (!fromLead && modoEntrega !== "chat" && !clienteEmail.trim()) return toast.error("Ingresa el email del cliente");
    if (items.length === 0) return toast.error("Agrega al menos un repuesto");

    setSubmitting(true);
    try {
      const entrega = fromLead ? "chat" : modoEntrega;
      const res = await api.bot.createManualQuotation({
        client_name:    clienteNombre.trim(),
        client_email:   clienteEmail.trim(),
        client_company: clienteEmpresa.trim() || undefined,
        items: items.map(i => ({
          machine_code: i.code,
          part_name:    i.name,
          quantity:     i.cantidad,
          sale_price:   i.sale_price,
          tax_value:    i.tax_value,
        })),
        delivery_mode: entrega,
        send_email:    entrega === "email" || entrega === "ambas",
        // Extra fields forwarded to the API
        ...(prefill?.session_id        ? { session_id:              prefill.session_id }   : {}),
        ...(prefill?.request_id != null ? { spare_part_request_id: prefill.request_id }   : {}),
        quotation_type: "repuestos",
      } as Parameters<typeof api.bot.createManualQuotation>[0]);

      // Send to WhatsApp conversation if applicable
      if (fromLead && sendToWa && prefill?.session_id) {
        try {
          if (res.pdf_url) {
            await api.bot.sendDocument(prefill.session_id, {
              pdf_url: res.pdf_url,
              filename: `${res.quotation_number}.pdf`,
              caption: `Su cotización de repuestos ${res.quotation_number} está lista.`,
            });
          } else if (res.page_url) {
            await api.bot.sendMessage(
              prefill.session_id,
              `Hola${clienteNombre.trim() ? `, ${clienteNombre.trim().split(" ")[0]}` : ""}! Su cotización de repuestos está lista. Puede verla aquí:\n\n${res.page_url}`
            );
          }
        } catch {
          toast.warning("Cotización generada, pero no se pudo enviar al WhatsApp");
        }
      }

      setResult(res);
      onCreated?.();
      if (res.not_found.length > 0)
        toast.warning(`Códigos no encontrados: ${res.not_found.join(", ")}`);
      else
        toast.success(`Cotización ${res.quotation_number} generada`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error al generar la cotización");
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <div className="relative z-10 w-full max-w-xl bg-surface-2 border-l border-border flex flex-col h-full overflow-hidden shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <div>
            <h2 className="text-fg font-semibold text-base">Nueva Cotización de Repuestos</h2>
            <p className="text-fg-5 text-xs mt-0.5">Generada manualmente desde el admin</p>
          </div>
          <button onClick={onClose} className="text-fg-5 hover:text-fg transition-colors p-1">
            <X size={18} />
          </button>
        </div>

        {/* Result screen */}
        {result ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center gap-5">
            <div className="w-16 h-16 rounded-full bg-emerald-500/15 flex items-center justify-center">
              <span className="text-emerald-400 text-3xl">✓</span>
            </div>
            <div>
              <p className="text-fg font-semibold text-lg">{result.quotation_number}</p>
              <p className="text-fg-4 text-sm mt-1">Total: {COP(result.total)}</p>
              {result.email_sent && <p className="text-emerald-400 text-xs mt-1">Email enviado a {clienteEmail}</p>}
              {result.not_found.length > 0 && (
                <p className="text-amber-400 text-xs mt-2">Códigos omitidos: {result.not_found.join(", ")}</p>
              )}
            </div>
            {result.pdf_url ? (
              <a
                href={result.pdf_url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-accent text-black text-sm font-medium hover:bg-accent/90 transition-colors"
              >
                Descargar PDF
              </a>
            ) : result.page_url ? (
              <a
                href={result.page_url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-accent text-black text-sm font-medium hover:bg-accent/90 transition-colors"
              >
                Ver cotización web
              </a>
            ) : null}
            <button onClick={onClose} className="text-fg-5 text-sm hover:text-fg transition-colors mt-2">Cerrar</button>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto p-6 space-y-6">

              {/* Hint box */}
              {prefill?.part_description && (
                <div className="bg-surface-3 border border-border px-4 py-3 text-sm text-fg-4">
                  <span className="text-fg-5 text-xs uppercase tracking-wider font-medium block mb-1">Repuesto solicitado</span>
                  {prefill.part_description}
                </div>
              )}

              {/* Suggestions */}
              {prefill?.request_id && (suggestionsLoading || suggestions.length > 0) && (
                <section>
                  <h3 className="text-fg-4 text-xs font-semibold uppercase tracking-wider mb-2 flex items-center gap-2">
                    Sugerencias del catálogo
                    <span className="text-[10px] font-normal text-fg-5 normal-case tracking-normal">
                      basadas en la solicitud del cliente
                    </span>
                  </h3>

                  {suggestionsLoading ? (
                    <div className="flex items-center gap-2 text-fg-5 text-xs py-3">
                      <Loader2 size={12} className="animate-spin" /> Buscando coincidencias...
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {suggestions.map(s => {
                        const alreadyAdded = items.some(i => i.id === s.id);
                        return (
                          <div
                            key={s.id}
                            className="bg-surface-3 border border-border px-3 py-2.5 flex items-center gap-3"
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-mono text-xs text-accent">{s.code}</span>
                                <span className="text-fg text-sm truncate">{s.name}</span>
                                {s.brand && (
                                  <span className="text-fg-5 text-xs">· {s.brand}</span>
                                )}
                              </div>
                              <p className="text-fg-6 text-[10px] mt-0.5 truncate">{s.match_reason}</p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              {s.sale_price > 0 && (
                                <span className="text-fg-4 text-xs hidden sm:block">{COP(s.sale_price)}</span>
                              )}
                              <button
                                type="button"
                                onClick={() => addSuggestion(s)}
                                disabled={alreadyAdded}
                                className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium border transition-colors disabled:opacity-40 disabled:cursor-default border-accent text-accent hover:bg-accent hover:text-black disabled:hover:bg-transparent disabled:hover:text-accent"
                              >
                                {alreadyAdded ? "Añadido" : <><Plus size={11} /> Añadir</>}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>
              )}

              {/* Spare parts search */}
              <section>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-fg-4 text-xs font-semibold uppercase tracking-wider">Repuestos</h3>
                  {!showSearch && (
                    <button type="button" onClick={() => setShowSearch(true)}
                      className="flex items-center gap-1 text-accent text-xs hover:text-accent/80 transition-colors">
                      <Plus size={12} /> Agregar repuesto
                    </button>
                  )}
                </div>

                {showSearch && (
                  <div className="mb-3 border border-border bg-surface-3">
                    <div className="relative border-b border-border">
                      <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-6 pointer-events-none" />
                      <input
                        autoFocus
                        className="w-full bg-transparent text-fg pl-9 pr-4 py-2.5 text-sm placeholder:text-fg-6 outline-none"
                        placeholder="Buscar repuesto por código o nombre..."
                        value={spSearch}
                        onChange={e => setSpSearch(e.target.value)}
                      />
                    </div>
                    <div className="max-h-48 overflow-y-auto">
                      {spLoading && (
                        <div className="px-4 py-6 text-center text-fg-5 text-sm flex items-center justify-center gap-2">
                          <Loader2 size={14} className="animate-spin" /> Buscando...
                        </div>
                      )}
                      {!spLoading && spSearch && spResults.length === 0 && (
                        <div className="px-4 py-6 text-center text-fg-5 text-sm">Sin resultados</div>
                      )}
                      {!spLoading && !spSearch && (
                        <div className="px-4 py-6 text-center text-fg-5 text-sm">Escribe para buscar repuestos</div>
                      )}
                      {!spLoading && spResults.map(sp => (
                        <button
                          key={sp.id}
                          type="button"
                          onClick={() => addSparePart(sp)}
                          className="w-full text-left px-4 py-2.5 hover:bg-surface-4 border-b border-border last:border-0 transition-colors flex items-center justify-between gap-3"
                        >
                          <div>
                            <span className="font-mono text-xs text-accent">{sp.code}</span>
                            <span className="text-fg text-sm ml-2">{sp.name}</span>
                            {sp.brand && <span className="text-fg-5 text-xs ml-2">· {sp.brand}</span>}
                          </div>
                          {sp.sale_price > 0 && (
                            <span className="text-fg-4 text-xs shrink-0">{COP(sp.sale_price)}</span>
                          )}
                        </button>
                      ))}
                    </div>
                    {items.length > 0 && (
                      <div className="px-4 py-2 border-t border-border">
                        <button
                          type="button"
                          onClick={() => { setShowSearch(false); setSpSearch(""); setSpResults([]); }}
                          className="text-fg-5 text-xs hover:text-fg transition-colors"
                        >
                          Cerrar búsqueda
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {items.length > 0 ? (
                  <div className="space-y-2">
                    {items.map(item => {
                      const itemTotal = (item.sale_price + item.tax_value) * item.cantidad;
                      return (
                        <div key={item.id} className="bg-surface-3 border border-border px-3 py-3 space-y-2.5">
                          <div className="flex items-center gap-3">
                            <div className="flex-1 min-w-0">
                              <p className="font-mono text-xs text-accent">{item.code}</p>
                              <p className="text-fg text-sm truncate">{item.name}</p>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => updateQty(item.id, item.cantidad - 1)}
                                className="w-7 h-7 border border-border hover:bg-surface-4 text-fg flex items-center justify-center text-sm transition-colors"
                              >−</button>
                              <span className="w-8 text-center text-sm text-fg">{item.cantidad}</span>
                              <button
                                type="button"
                                onClick={() => updateQty(item.id, item.cantidad + 1)}
                                className="w-7 h-7 border border-border hover:bg-surface-4 text-fg flex items-center justify-center text-sm transition-colors"
                              >+</button>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeItem(item.id)}
                              className="text-fg-6 hover:text-red-400 transition-colors shrink-0"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            <div>
                              <label className="text-fg-6 text-[10px] uppercase tracking-wider block mb-1">Valor venta</label>
                              <input
                                className="w-full bg-surface-2 border border-border text-fg text-xs px-2 py-1.5 outline-none focus:border-accent"
                                value={fmtInput(item.sale_price)}
                                onChange={e => updateSalePrice(item.id, e.target.value)}
                                placeholder="0"
                              />
                            </div>
                            <div>
                              <label className="text-fg-6 text-[10px] uppercase tracking-wider block mb-1">
                                IVA {Math.round(item.tax_rate * 100)}%
                              </label>
                              <div className="w-full bg-surface-2 border border-border text-fg-4 text-xs px-2 py-1.5 select-none">
                                {COP(item.tax_value)}
                              </div>
                            </div>
                            <div>
                              <label className="text-fg-6 text-[10px] uppercase tracking-wider block mb-1">A pagar</label>
                              <div className="w-full bg-surface-2 border border-border text-accent text-xs px-2 py-1.5 font-semibold">
                                {itemTotal > 0 ? COP(itemTotal) : "—"}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    <div className="border border-border bg-surface-3 px-3 py-2.5 space-y-1.5">
                      <div className="flex justify-between text-xs text-fg-4">
                        <span>Subtotal</span><span>{COP(subtotal)}</span>
                      </div>
                      <div className="flex justify-between text-xs text-fg-4">
                        <span>IVA</span>
                        <span>{COP(iva)}</span>
                      </div>
                      <div className="flex justify-between text-sm text-fg font-semibold border-t border-border pt-1.5 mt-1.5">
                        <span>Total</span><span>{COP(total)}</span>
                      </div>
                    </div>
                  </div>
                ) : !showSearch && (
                  <div className="border border-dashed border-border px-4 py-8 text-center text-fg-5 text-sm">
                    Aún no has agregado repuestos
                  </div>
                )}
              </section>

              {/* Client data */}
              <section>
                <h3 className="text-fg-4 text-xs font-semibold uppercase tracking-wider mb-3">Datos del cliente</h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-fg-4 text-xs mb-1.5 block">Nombre contacto *</label>
                    <input
                      className="w-full bg-surface-3 border border-border text-fg px-3 py-2.5 text-sm placeholder:text-fg-6 outline-none focus:border-accent"
                      placeholder="Nombre completo del contacto"
                      value={clienteNombre}
                      onChange={e => setNombre(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-fg-4 text-xs mb-1.5 block">
                      Email {!fromLead && modoEntrega !== "chat" ? "*" : "(opcional)"}
                    </label>
                    <input
                      type="email"
                      className="w-full bg-surface-3 border border-border text-fg px-3 py-2.5 text-sm placeholder:text-fg-6 outline-none focus:border-accent"
                      placeholder="correo@empresa.com"
                      value={clienteEmail}
                      onChange={e => setEmail(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-fg-4 text-xs mb-1.5 block">Empresa (opcional)</label>
                    <input
                      className="w-full bg-surface-3 border border-border text-fg px-3 py-2.5 text-sm placeholder:text-fg-6 outline-none focus:border-accent"
                      placeholder="Nombre de la empresa"
                      value={clienteEmpresa}
                      onChange={e => setEmpresa(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-fg-4 text-xs mb-1.5 block">NIT (opcional)</label>
                    <input
                      className="w-full bg-surface-3 border border-border text-fg px-3 py-2.5 text-sm placeholder:text-fg-6 outline-none focus:border-accent"
                      placeholder="900.123.456-7"
                      value={clienteNIT}
                      onChange={e => setNIT(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-fg-4 text-xs mb-1.5 block">Dirección (opcional)</label>
                    <input
                      className="w-full bg-surface-3 border border-border text-fg px-3 py-2.5 text-sm placeholder:text-fg-6 outline-none focus:border-accent"
                      placeholder="Calle 123 # 45-67, Ciudad"
                      value={clienteDir}
                      onChange={e => setDir(e.target.value)}
                    />
                  </div>
                </div>
              </section>

              {/* Delivery */}
              {fromLead ? (
                <section>
                  <h3 className="text-fg-4 text-xs font-semibold uppercase tracking-wider mb-3">Entrega</h3>
                  <label className="flex items-center gap-3 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={sendToWa}
                      onChange={e => setSendToWa(e.target.checked)}
                      className="w-4 h-4 accent-accent"
                    />
                    <span className="text-sm text-fg">Enviar cotización a la conversación de WhatsApp</span>
                  </label>
                </section>
              ) : (
                <section>
                  <h3 className="text-fg-4 text-xs font-semibold uppercase tracking-wider mb-3">Entrega</h3>
                  <select
                    className="w-full bg-surface-3 border border-border text-fg text-sm px-3 py-2.5 outline-none focus:border-accent"
                    value={modoEntrega}
                    onChange={e => setModo(e.target.value as "email" | "chat" | "ambas")}
                  >
                    <option value="email">Enviar por email</option>
                    <option value="chat">Solo generar (link)</option>
                    <option value="ambas">Email + link</option>
                  </select>
                </section>
              )}
            </div>

            {/* Footer */}
            <div className="shrink-0 px-6 py-4 border-t border-border flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2.5 border border-border text-fg-4 text-sm hover:bg-surface-3 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={submit}
                disabled={submitting || items.length === 0}
                className="flex-1 px-4 py-2.5 bg-accent text-black text-sm font-semibold hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {submitting && <Loader2 size={14} className="animate-spin" />}
                {submitting ? "Generando..." : "Generar cotización"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
