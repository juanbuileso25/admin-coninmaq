import { useEffect, useRef, useState } from "react";
import { X, Plus, Trash2, Loader2, Search, UserCheck, Clock } from "lucide-react";
import PhoneInput from "../ui/PhoneInput";
import { toast } from "sonner";
import { api, type BotLeadResponse, type ClientResponse, type MachineResponse, type ManualQuotationResponse } from "../../services/api";

const COP = (n: number) => `$${n.toLocaleString("es-CO")}`;
const parseCOP = (s: string) => parseInt(s.replace(/\D/g, ""), 10) || 0;
const fmtInput = (n: number) => n > 0 ? n.toLocaleString("es-CO") : "";

type LineItem = {
  codigo:     string;
  nombre:     string;
  cantidad:   number;
  sale_price: number;
  tax_rate:   number;   // porcentaje como decimal, ej. 0.19
  tax_value:  number;   // calculado: sale_price * tax_rate
};

interface PrefillLead {
  lead_id:       number;
  session_id?:   string | null;
  name?:         string | null;
  email?:        string | null;
  company?:      string | null;
  tax_id?:       string | null;
  address?:      string | null;
  machine_code?: string | null;
  num_units?:    number | null;
}

interface Props {
  open:      boolean;
  onClose:   () => void;
  onCreated: () => void;
  prefill?:  PrefillLead;
}

export default function NuevaCotizacionDrawer({ open, onClose, onCreated, prefill }: Props) {
  // Máquinas
  const [machines, setMachines]       = useState<MachineResponse[]>([]);
  const [loadingMachines, setLM]      = useState(false);
  const [items, setItems]             = useState<LineItem[]>([]);
  const [machineSearch, setMSearch]   = useState("");
  const [showCatalog, setShowCatalog] = useState(false);

  // Buscar cliente existente
  const [clientSearch, setClientSearch]     = useState("");
  const [clientResults, setClientResults]   = useState<ClientResponse[]>([]);
  const [clientLoading, setClientLoading]   = useState(false);
  const [selectedClient, setSelectedClient] = useState<ClientResponse | null>(null);
  const [showClientSearch, setShowClientSearch] = useState(false);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Buscar contacto previo (leads)
  const [leadSearch, setLeadSearch]       = useState("");
  const [leadResults, setLeadResults]     = useState<BotLeadResponse[]>([]);
  const [leadLoading, setLeadLoading]     = useState(false);
  const [showLeadSearch, setShowLeadSearch] = useState(false);
  const debounceL = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Datos del cliente
  const [clienteNombre,    setNombre]    = useState("");
  const [clienteEmail,     setEmail]     = useState("");
  const [clienteEmpresa,   setEmpresa]   = useState("");
  const [clienteTaxId,  setTaxId]  = useState("");
  const [clienteAddress, setAddress] = useState("");

  const [observations, setObservations] = useState("");
  const [extraEmails,     setExtraEmails]     = useState<string[]>([]);
  const [extraEmailInput, setExtraEmailInput] = useState("");

  // Opciones
  const [modoEntrega, setModo]      = useState<"email" | "chat" | "ambas">("email");
  const [sendToWa, setSendToWa]     = useState(true);
  const [waPhone, setWaPhone]       = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult]         = useState<ManualQuotationResponse | null>(null);

  useEffect(() => {
    if (!open) return;
    setLM(true);
    api.machines.list({ machine_type: "new" })
      .then(data => {
        setMachines(data);
        // Si hay prefill con código de máquina, preseleccionarla
        if (prefill?.machine_code) {
          const found = data.find(m => m.code === prefill.machine_code);
          if (found) {
            const sp   = found.sale_price ?? 0;
            const tv   = found.tax_value  ?? 0;
            const rate = sp > 0 ? tv / sp : 0.19;
            const qty  = prefill.num_units && prefill.num_units > 0 ? prefill.num_units : 1;
            setItems([{ codigo: found.code, nombre: found.model, cantidad: qty, sale_price: sp, tax_rate: rate, tax_value: tv }]);
            setShowCatalog(false);
          } else {
            setShowCatalog(true);
          }
        } else {
          setShowCatalog(true);
        }
      })
      .catch(() => toast.error("No se pudo cargar el catálogo"))
      .finally(() => setLM(false));
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!open) {
      setItems([]); setNombre(""); setEmail(""); setEmpresa(""); setTaxId(""); setAddress("");
      setObservations("");
      setExtraEmails([]); setExtraEmailInput("");
      setModo("email"); setSendToWa(true); setWaPhone(""); setResult(null); setMSearch(""); setShowCatalog(false);
      setClientSearch(""); setClientResults([]); setSelectedClient(null); setShowClientSearch(false);
      setLeadSearch(""); setLeadResults([]); setShowLeadSearch(false);
    } else if (prefill) {
      if (prefill.name)    setNombre(prefill.name);
      if (prefill.email)   setEmail(prefill.email);
      if (prefill.company) setEmpresa(prefill.company);
      if (prefill.tax_id)  setTaxId(prefill.tax_id);
      if (prefill.address) setAddress(prefill.address);
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // Buscar clientes con debounce
  useEffect(() => {
    if (!showClientSearch) return;
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(async () => {
      setClientLoading(true);
      try {
        const data = await api.clients.list({ search: clientSearch || undefined, is_active: true });
        setClientResults(data.slice(0, 10));
      } catch {
        toast.error("No se pudo buscar clientes");
      } finally {
        setClientLoading(false);
      }
    }, 300);
  }, [clientSearch, showClientSearch]);

  // Buscar contactos previos (leads) con debounce
  useEffect(() => {
    if (!showLeadSearch) return;
    if (debounceL.current) clearTimeout(debounceL.current);
    debounceL.current = setTimeout(async () => {
      setLeadLoading(true);
      try {
        const data = await api.bot.leads({ search: leadSearch || undefined, page_size: 10 });
        setLeadResults(data.data);
      } catch {
        toast.error("No se pudo buscar contactos");
      } finally {
        setLeadLoading(false);
      }
    }, 300);
  }, [leadSearch, showLeadSearch]);

  const selectClient = (c: ClientResponse) => {
    setSelectedClient(c);
    setEmpresa(c.name);
    setEmail(c.billing_email ?? c.info_email ?? "");
    setNombre(c.purchasing_contact ?? "");
    setShowClientSearch(false);
    setClientSearch("");
  };

  const selectLead = (l: BotLeadResponse) => {
    if (l.name)           setNombre(l.name);
    if (l.email)          setEmail(l.email);
    if (l.company)        setEmpresa(l.company);
    if (l.rut_nit)        setTaxId(l.rut_nit);
    if (l.rut_direccion)  setAddress(l.rut_direccion);
    if (l.phone_number)   setWaPhone(l.phone_number);
    setShowLeadSearch(false);
    setLeadSearch("");
  };

  const clearClient = () => {
    setSelectedClient(null);
    setNombre(""); setEmail(""); setEmpresa(""); setTaxId(""); setAddress("");
  };

  const addExtraEmail = (raw: string) => {
    const email = raw.trim().toLowerCase().replace(/,/g, "");
    if (!email || !email.includes("@")) return;
    if (!extraEmails.includes(email) && email !== clienteEmail.trim().toLowerCase())
      setExtraEmails(prev => [...prev, email]);
    setExtraEmailInput("");
  };

  // Catálogo
  const filtered = machines.filter(m =>
    `${m.code} ${m.model} ${m.brand} ${m.category}`.toLowerCase().includes(machineSearch.toLowerCase())
  );

  const addMachine = (m: MachineResponse) => {
    setItems(prev => {
      if (prev.length > 0) return prev;
      const sp  = m.sale_price ?? 0;
      const tv  = m.tax_value  ?? 0;
      const rate = sp > 0 ? tv / sp : 0.19;
      const qty  = prefill?.num_units && prefill.num_units > 0 ? prefill.num_units : 1;
      return [{ codigo: m.code, nombre: m.model, cantidad: qty, sale_price: sp, tax_rate: rate, tax_value: tv }];
    });
    setShowCatalog(false);
    setMSearch("");
  };

  const updateQty = (codigo: string, qty: number) => {
    if (qty < 1) return;
    setItems(prev => prev.map(i => i.codigo === codigo ? { ...i, cantidad: qty } : i));
  };

  const updateSalePrice = (codigo: string, raw: string) => {
    const sp = parseCOP(raw);
    setItems(prev => prev.map(i =>
      i.codigo === codigo
        ? { ...i, sale_price: sp, tax_value: Math.round(sp * i.tax_rate) }
        : i
    ));
  };

  const updateTotal = (codigo: string, raw: string) => {
    const total = parseCOP(raw);
    setItems(prev => prev.map(i => {
      if (i.codigo !== codigo) return i;
      const sp = Math.round(total / i.cantidad / (1 + i.tax_rate));
      return { ...i, sale_price: sp, tax_value: Math.round(sp * i.tax_rate) };
    }));
  };


  const removeItem = (codigo: string) => setItems(prev => prev.filter(i => i.codigo !== codigo));

  const subtotal = items.reduce((acc, i) => acc + i.sale_price * i.cantidad, 0);
  const iva      = items.reduce((acc, i) => acc + i.tax_value  * i.cantidad, 0);
  const total    = subtotal + iva;

  const fromLead = !!prefill?.session_id;

  const submit = async () => {
    if (!clienteNombre.trim()) return toast.error("Ingresa el nombre del contacto");
    if (fromLead && modoEntrega !== "chat" && !clienteEmail.trim()) return toast.error("Ingresa el email del cliente");
    if (items.length === 0) return toast.error("Agrega al menos un equipo");

    setSubmitting(true);
    try {
      const hasEmail = !!clienteEmail.trim();
      const phoneClean = waPhone.trim().replace(/\D/g, "");
      const sendWa = sendToWa && !!phoneClean;
      const entrega = fromLead ? "chat" : (hasEmail ? "email" : "chat");
      const res = await api.bot.createManualQuotation({
        client_name:    clienteNombre.trim(),
        client_email:   clienteEmail.trim(),
        client_phone:   phoneClean || undefined,
        client_company: clienteEmpresa.trim() || undefined,
        client_tax_id:  clienteTaxId.trim() || undefined,
        client_address: clienteAddress.trim() || undefined,
        lead_id:        prefill?.lead_id,
        items: items.map(i => ({
          machine_code: i.codigo,
          quantity:     i.cantidad,
          sale_price:   i.sale_price,
          tax_value:    i.tax_value,
        })),
        delivery_mode:  entrega,
        send_email:     hasEmail,
        send_whatsapp:  sendWa,
        observations:   observations.trim() || undefined,
        extra_emails:   extraEmails.length > 0 ? extraEmails : undefined,
      });

      // Si viene de una sesión activa de WA, también enviar por el chat
      if (fromLead && sendToWa && prefill?.session_id && res.page_url) {
        try {
          await api.bot.sendMessage(
            prefill.session_id,
            `Hola${clienteNombre.trim() ? `, ${clienteNombre.trim().split(" ")[0]}` : ""}! 🎉 Su cotización está lista. Puede verla aquí:\n\n${res.page_url}`
          );
        } catch {
          toast.warning("Cotización generada, pero no se pudo enviar al WhatsApp");
        }
      }
      setResult(res);
      onCreated();
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
    <div className="fixed inset-0 z-[60] flex justify-end">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <div className="relative z-10 w-full max-w-xl bg-surface-2 border-l border-border flex flex-col h-full overflow-hidden shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <div>
            <h2 className="text-fg font-semibold text-base">Nueva cotización</h2>
            <p className="text-fg-5 text-xs mt-0.5">Generada manualmente desde el admin</p>
          </div>
          <button onClick={onClose} className="text-fg-5 hover:text-fg transition-colors p-1">
            <X size={18} />
          </button>
        </div>

        {/* Result */}
        {result ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center gap-5">
            <div className="w-16 h-16 rounded-full bg-emerald-500/15 flex items-center justify-center">
              <span className="text-emerald-400 text-3xl">✓</span>
            </div>
            <div>
              <p className="text-fg font-semibold text-lg">{result.quotation_number}</p>
              <p className="text-fg-4 text-sm mt-1">Total: {COP(result.total)}</p>
              {result.email_sent && (
                <p className="text-emerald-400 text-xs mt-1">
                  Email enviado a {clienteEmail}{extraEmails.length > 0 ? ` y ${extraEmails.length} más` : ""}
                </p>
              )}
              {result.not_found.length > 0 && <p className="text-amber-400 text-xs mt-2">Códigos omitidos: {result.not_found.join(", ")}</p>}
            </div>
            {result.page_url && (
              <a href={result.page_url} target="_blank" rel="noopener noreferrer"
                className="px-4 py-2 bg-accent text-black text-sm font-medium hover:bg-accent/90 transition-colors">
                Ver cotización web
              </a>
            )}
            <button onClick={onClose} className="text-fg-5 text-sm hover:text-fg transition-colors mt-2">Cerrar</button>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto p-6 space-y-6">

              {/* Equipo */}
              <section>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-fg-4 text-xs font-semibold uppercase tracking-wider">Equipo</h3>
                  {!showCatalog && items.length === 0 && machines.length > 0 && (
                    <button type="button" onClick={() => setShowCatalog(true)}
                      className="flex items-center gap-1 text-accent text-xs hover:text-accent/80 transition-colors">
                      <Plus size={12} /> Agregar equipo
                    </button>
                  )}
                </div>

                {showCatalog && (
                  <div className="mb-3 border border-border bg-surface-3">
                    <div className="relative border-b border-border">
                      <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-6 pointer-events-none" />
                      <input autoFocus
                        className="w-full bg-transparent text-fg pl-9 pr-4 py-2.5 text-sm placeholder:text-fg-6 outline-none"
                        placeholder="Buscar por código, modelo o categoría..."
                        value={machineSearch} onChange={e => setMSearch(e.target.value)} />
                    </div>
                    <div className="max-h-48 overflow-y-auto">
                      {loadingMachines && (
                        <div className="px-4 py-6 text-center text-fg-5 text-sm flex items-center justify-center gap-2">
                          <Loader2 size={14} className="animate-spin" /> Cargando catálogo...
                        </div>
                      )}
                      {!loadingMachines && filtered.length === 0 && <div className="px-4 py-6 text-center text-fg-5 text-sm">Sin resultados</div>}
                      {!loadingMachines && filtered.map(m => (
                        <button key={m.code} type="button" onClick={() => addMachine(m)}
                          className="w-full text-left px-4 py-2.5 hover:bg-surface-4 border-b border-border last:border-0 transition-colors flex items-center justify-between gap-3">
                          <div>
                            <span className="font-mono text-xs text-accent">{m.code}</span>
                            <span className="text-fg text-sm ml-2">{m.model}</span>
                            <span className="text-fg-5 text-xs ml-2">· {m.category}</span>
                          </div>
                          {m.sale_price > 0 && <span className="text-fg-4 text-xs shrink-0">{COP(m.sale_price)}</span>}
                        </button>
                      ))}
                    </div>
                    <div className="px-4 py-2 border-t border-border">
                      <button type="button" onClick={() => { setShowCatalog(false); setMSearch(""); }}
                        className="text-fg-5 text-xs hover:text-fg transition-colors">Cancelar</button>
                    </div>
                  </div>
                )}

                {items.length > 0 ? (
                  <div className="space-y-2">
                    {items.map(item => {
                      const itemTotal = (item.sale_price + item.tax_value) * item.cantidad;
                      return (
                        <div key={item.codigo} className="bg-surface-3 border border-border px-3 py-3 space-y-2.5">
                          <div className="flex items-center gap-3">
                            <div className="flex-1 min-w-0">
                              <p className="font-mono text-xs text-accent">{item.codigo}</p>
                              <p className="text-fg text-sm truncate">{item.nombre}</p>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <button type="button" onClick={() => updateQty(item.codigo, item.cantidad - 1)}
                                className="w-7 h-7 border border-border hover:bg-surface-4 text-fg flex items-center justify-center text-sm transition-colors">−</button>
                              <span className="w-8 text-center text-sm text-fg">{item.cantidad}</span>
                              <button type="button" onClick={() => updateQty(item.codigo, item.cantidad + 1)}
                                className="w-7 h-7 border border-border hover:bg-surface-4 text-fg flex items-center justify-center text-sm transition-colors">+</button>
                            </div>
                            <button type="button" onClick={() => removeItem(item.codigo)}
                              className="text-fg-6 hover:text-red-400 transition-colors shrink-0">
                              <Trash2 size={14} />
                            </button>
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            <div>
                              <label className="text-fg-6 text-[10px] uppercase tracking-wider block mb-1">Valor venta</label>
                              <input
                                className="w-full bg-surface-2 border border-border text-fg text-xs px-2 py-1.5 outline-none focus:border-accent"
                                value={fmtInput(item.sale_price)}
                                onChange={e => updateSalePrice(item.codigo, e.target.value)}
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
                              <input
                                className="w-full bg-surface-2 border border-border text-accent text-xs px-2 py-1.5 font-semibold outline-none focus:border-accent"
                                value={fmtInput(itemTotal)}
                                onChange={e => updateTotal(item.codigo, e.target.value)}
                                placeholder="0"
                              />
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
                        <span>IVA ({items.length === 1 ? `${Math.round(items[0].tax_rate * 100)}%` : "mixto"})</span>
                        <span>{COP(iva)}</span>
                      </div>
                      <div className="flex justify-between text-sm text-fg font-semibold border-t border-border pt-1.5 mt-1.5">
                        <span>Total</span><span>{COP(total)}</span>
                      </div>
                    </div>
                  </div>
                ) : !showCatalog && (
                  <div className="border border-dashed border-border px-4 py-8 text-center text-fg-5 text-sm">
                    {loadingMachines
                      ? <span className="flex items-center justify-center gap-2"><Loader2 size={14} className="animate-spin" /> Cargando catálogo...</span>
                      : "Aún no has agregado equipos"}
                  </div>
                )}
              </section>

              {/* Cliente */}
              <section>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-fg-4 text-xs font-semibold uppercase tracking-wider">Datos del cliente</h3>
                  <div className="flex items-center gap-3">
                    {!selectedClient && (
                      <button type="button"
                        onClick={() => { setShowLeadSearch(false); setShowClientSearch(s => !s); }}
                        className="flex items-center gap-1 text-accent text-xs hover:text-accent/80 transition-colors">
                        <UserCheck size={12} /> Buscar cliente
                      </button>
                    )}
                    <button type="button"
                      onClick={() => { setShowClientSearch(false); setSelectedClient(null); setShowLeadSearch(s => !s); }}
                      className="flex items-center gap-1 text-fg-4 text-xs hover:text-fg transition-colors">
                      <Clock size={12} /> Contacto previo
                    </button>
                  </div>
                </div>

                {/* Buscador de contactos previos (leads) */}
                {showLeadSearch && (
                  <div className="mb-3 border border-border bg-surface-3">
                    <div className="relative border-b border-border">
                      <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-6 pointer-events-none" />
                      <input autoFocus
                        className="w-full bg-transparent text-fg pl-9 pr-4 py-2.5 text-sm placeholder:text-fg-6 outline-none"
                        placeholder="Nombre, email, empresa o NIT..."
                        value={leadSearch} onChange={e => setLeadSearch(e.target.value)} />
                    </div>
                    <div className="max-h-40 overflow-y-auto">
                      {leadLoading && (
                        <div className="px-4 py-4 text-center text-fg-5 text-sm flex items-center justify-center gap-2">
                          <Loader2 size={14} className="animate-spin" /> Buscando...
                        </div>
                      )}
                      {!leadLoading && leadResults.length === 0 && (
                        <div className="px-4 py-4 text-center text-fg-5 text-sm">Sin resultados</div>
                      )}
                      {!leadLoading && leadResults.map(l => (
                        <button key={l.id} type="button" onClick={() => selectLead(l)}
                          className="w-full text-left px-4 py-2.5 hover:bg-surface-4 border-b border-border last:border-0 transition-colors">
                          <p className="text-fg text-sm font-medium">{l.name ?? "Sin nombre"}</p>
                          <p className="text-fg-5 text-xs">{[l.email, l.company].filter(Boolean).join(" · ")}</p>
                        </button>
                      ))}
                    </div>
                    <div className="px-4 py-2 border-t border-border">
                      <button type="button" onClick={() => { setShowLeadSearch(false); setLeadSearch(""); }}
                        className="text-fg-5 text-xs hover:text-fg transition-colors">Cancelar</button>
                    </div>
                  </div>
                )}

                {/* Buscador de clientes */}
                {showClientSearch && !selectedClient && (
                  <div className="mb-3 border border-border bg-surface-3">
                    <div className="relative border-b border-border">
                      <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-6 pointer-events-none" />
                      <input autoFocus
                        className="w-full bg-transparent text-fg pl-9 pr-4 py-2.5 text-sm placeholder:text-fg-6 outline-none"
                        placeholder="Nombre o documento..."
                        value={clientSearch} onChange={e => setClientSearch(e.target.value)} />
                    </div>
                    <div className="max-h-40 overflow-y-auto">
                      {clientLoading && (
                        <div className="px-4 py-4 text-center text-fg-5 text-sm flex items-center justify-center gap-2">
                          <Loader2 size={14} className="animate-spin" /> Buscando...
                        </div>
                      )}
                      {!clientLoading && clientResults.length === 0 && (
                        <div className="px-4 py-4 text-center text-fg-5 text-sm">Sin resultados</div>
                      )}
                      {!clientLoading && clientResults.map(c => (
                        <button key={c.id} type="button" onClick={() => selectClient(c)}
                          className="w-full text-left px-4 py-2.5 hover:bg-surface-4 border-b border-border last:border-0 transition-colors">
                          <p className="text-fg text-sm font-medium">{c.name}</p>
                          <p className="text-fg-5 text-xs">{[c.document, c.billing_email ?? c.info_email].filter(Boolean).join(" · ")}</p>
                        </button>
                      ))}
                    </div>
                    <div className="px-4 py-2 border-t border-border">
                      <button type="button" onClick={() => { setShowClientSearch(false); setClientSearch(""); }}
                        className="text-fg-5 text-xs hover:text-fg transition-colors">Cancelar</button>
                    </div>
                  </div>
                )}

                {/* Cliente seleccionado */}
                {selectedClient && (
                  <div className="mb-3 flex items-center justify-between bg-accent/10 border border-accent/30 px-3 py-2">
                    <div>
                      <p className="text-fg text-sm font-medium">{selectedClient.name}</p>
                      <p className="text-fg-5 text-xs">{selectedClient.document}</p>
                    </div>
                    <button type="button" onClick={clearClient} className="text-fg-5 hover:text-fg transition-colors ml-3 shrink-0">
                      <X size={14} />
                    </button>
                  </div>
                )}

                <div className="space-y-3">
                  <div>
                    <label className="text-fg-4 text-xs mb-1.5 block">Nombre contacto *</label>
                    <input className="w-full bg-surface-3 border border-border text-fg px-3 py-2.5 text-sm placeholder:text-fg-6 outline-none focus:border-accent"
                      placeholder="Nombre completo del contacto"
                      value={clienteNombre} onChange={e => setNombre(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-fg-4 text-xs mb-1.5 block">
                      Email {!fromLead && modoEntrega !== "chat" ? "*" : "(opcional)"}
                    </label>
                    <input type="email"
                      className="w-full bg-surface-3 border border-border text-fg px-3 py-2.5 text-sm placeholder:text-fg-6 outline-none focus:border-accent"
                      placeholder="correo@empresa.com"
                      value={clienteEmail} onChange={e => setEmail(e.target.value)} />
                    {/* Correos adicionales */}
                    <div className="mt-2">
                      {extraEmails.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-2">
                          {extraEmails.map(em => (
                            <span key={em} className="flex items-center gap-1 text-xs bg-surface-3 border border-border text-fg-3 px-2 py-1">
                              {em}
                              <button type="button" onClick={() => setExtraEmails(prev => prev.filter(e => e !== em))} className="text-fg-6 hover:text-fg ml-0.5">
                                <X size={10} />
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                      <input type="email"
                        className="w-full bg-surface-3 border border-dashed border-fg-6 text-fg px-3 py-2 text-xs placeholder:text-fg-6 outline-none focus:border-accent"
                        placeholder="Agregar otro destinatario (Enter o coma)"
                        value={extraEmailInput}
                        onChange={e => setExtraEmailInput(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addExtraEmail(extraEmailInput); } }}
                        onBlur={() => { if (extraEmailInput.trim()) addExtraEmail(extraEmailInput); }}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-fg-4 text-xs mb-1.5 block">Razón social (opcional)</label>
                    <input className="w-full bg-surface-3 border border-border text-fg px-3 py-2.5 text-sm placeholder:text-fg-6 outline-none focus:border-accent"
                      placeholder="Nombre de la empresa"
                      value={clienteEmpresa} onChange={e => setEmpresa(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-fg-4 text-xs mb-1.5 block">NIT (opcional)</label>
                    <input className="w-full bg-surface-3 border border-border text-fg px-3 py-2.5 text-sm placeholder:text-fg-6 outline-none focus:border-accent"
                      placeholder="900.123.456-7"
                      value={clienteTaxId} onChange={e => setTaxId(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-fg-4 text-xs mb-1.5 block">Dirección (opcional)</label>
                    <input className="w-full bg-surface-3 border border-border text-fg px-3 py-2.5 text-sm placeholder:text-fg-6 outline-none focus:border-accent"
                      placeholder="Calle 123 # 45-67, Ciudad"
                      value={clienteAddress} onChange={e => setAddress(e.target.value)} />
                  </div>
                </div>
              </section>

              {/* Observaciones */}
              <section>
                <h3 className="text-fg-4 text-xs font-semibold uppercase tracking-wider mb-3">Observaciones (opcional)</h3>
                <textarea
                  rows={4}
                  className="w-full bg-surface-3 border border-border text-fg px-3 py-2.5 text-sm placeholder:text-fg-6 outline-none focus:border-accent resize-none"
                  placeholder="Ej: Garantía 12 meses, entrega 30 días hábiles, flete por cuenta del cliente..."
                  value={observations}
                  onChange={e => setObservations(e.target.value)}
                />
              </section>

              {/* Entrega WhatsApp */}
              <section>
                <h3 className="text-fg-4 text-xs font-semibold uppercase tracking-wider mb-3">WhatsApp</h3>
                <div className="space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={sendToWa}
                      onChange={e => setSendToWa(e.target.checked)}
                      className="w-4 h-4 accent-accent"
                    />
                    <span className="text-sm text-fg">Enviar notificación por WhatsApp</span>
                  </label>
                  {sendToWa && (
                    <div className="pl-7">
                      <PhoneInput
                        value={waPhone}
                        onChange={setWaPhone}
                        placeholder="3012345678"
                      />
                    </div>
                  )}
                  {clienteEmail.trim() && (
                    <div className="flex items-center gap-2 text-xs text-fg-4">
                      <span>✉</span>
                      <span>También se enviará por correo a <span className="text-fg-3 font-medium">{clienteEmail.trim()}</span></span>
                    </div>
                  )}
                </div>
              </section>

            </div>

            {/* Footer */}
            <div className="shrink-0 px-6 py-4 border-t border-border flex gap-3">
              <button onClick={onClose}
                className="flex-1 px-4 py-2.5 border border-border text-fg-4 text-sm hover:bg-surface-3 transition-colors">
                Cancelar
              </button>
              <button onClick={submit} disabled={submitting || items.length === 0}
                className="flex-1 px-4 py-2.5 bg-accent text-black text-sm font-semibold hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2">
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
