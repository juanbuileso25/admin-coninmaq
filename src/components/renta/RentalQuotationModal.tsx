import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  X, Loader2, Send, Plus, Trash2, RefreshCw, Tag, Save, FileText, ChevronDown,
} from "lucide-react";
import {
  api,
  type RentalBillingConcept,
  type RentalCatalogModel,
  type RentalQuotationItem,
  type RentalQuotationExtraItem,
  type RentalQuotationConditions,
  type RentalQuotationCreate,
} from "../../services/api";
import { toast } from "sonner";
import ClientSearchSelect from "../ui/ClientSearchSelect";

type ItemRow = RentalQuotationItem & { _localId: string };
type ExtraRow = RentalQuotationExtraItem & { _localId: string };

function newLocalId(): string { return Math.random().toString(36).slice(2, 10); }
function copFmt(v: number): string {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(v);
}

interface Props {
  quotationId: string | null;
  onClose: () => void;
  onSaved: () => void;
}

export default function RentalQuotationModal({ quotationId, onClose, onSaved }: Props) {
  const isEdit = !!quotationId;
  const [loading, setLoading] = useState(isEdit);

  // Form state
  const [clientId, setClientId] = useState<string | null>(null);
  const [clientName, setClientName] = useState<string>("");
  const [clientDoc, setClientDoc] = useState<string>("");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [projectName, setProjectName] = useState("");
  const [notes, setNotes] = useState("");
  const [validDays, setValidDays] = useState(15);
  const [includesOperator, setIncludesOperator] = useState(false);
  const [issuedDate, setIssuedDate] = useState(() => new Date().toISOString().slice(0, 10));

  const [items, setItems] = useState<ItemRow[]>([]);
  const [extraItems, setExtraItems] = useState<ExtraRow[]>([]);
  const [conditions, setConditions] = useState<RentalQuotationConditions>({ alquiler: [], entrega: [], credito: [] });

  // Catálogos
  const [catalogModels, setCatalogModels] = useState<RentalCatalogModel[]>([]);
  const [catalog, setCatalog] = useState<RentalBillingConcept[]>([]);

  // UI state
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const pdfUrlRef = useRef<string | null>(null);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [previewSig, setPreviewSig] = useState<string>("");
  const [savingDraft, setSavingDraft] = useState(false);
  const [sendOpen, setSendOpen] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(quotationId);
  const [savedNumber, setSavedNumber] = useState<string>("");

  // Carga inicial de catálogos + plantilla
  useEffect(() => {
    Promise.all([
      api.rental.listCatalog(),
      api.rental.listBillingConcepts(true),
    ]).then(([models, concepts]) => {
      setCatalogModels(models);
      setCatalog(concepts);
    }).catch(() => {});
  }, []);

  // Carga la cotización si se edita, o la plantilla si es nueva
  useEffect(() => {
    if (!isEdit) {
      api.rental.getQuotationConditionsTemplate().then(tpl => {
        setConditions({ alquiler: tpl.alquiler, entrega: tpl.entrega, credito: tpl.credito });
      }).catch(() => {});
      return;
    }
    api.rental.getQuotation(quotationId!).then(q => {
      setClientId(q.client_id);
      setClientName(q.client_name ?? "");
      setClientDoc(q.client_document ?? "");
      setContactName(q.contact_name ?? "");
      setContactEmail(q.contact_email ?? "");
      setContactPhone(q.contact_phone ?? "");
      setProjectName(q.project_name ?? "");
      setNotes(q.notes ?? "");
      setValidDays(q.valid_days);
      setIncludesOperator(!!q.includes_operator);
      setIssuedDate(q.issued_date);
      setItems((q.items ?? []).map(it => ({ ...it, _localId: newLocalId() })));
      setExtraItems((q.extra_items ?? []).map(e => ({ ...e, _localId: newLocalId() })));
      setConditions(q.conditions ?? { alquiler: [], entrega: [], credito: [] });
      setSavedId(q.id);
      setSavedNumber(q.number);
    }).catch(() => {
      toast.error("No se pudo cargar la cotización");
    }).finally(() => setLoading(false));
  }, [quotationId, isEdit]);

  // Cleanup del blob URL
  useEffect(() => {
    return () => {
      if (pdfUrlRef.current) URL.revokeObjectURL(pdfUrlRef.current);
    };
  }, []);

  // Build payload
  const payload: RentalQuotationCreate = useMemo(() => ({
    client_id: clientId,
    client_name: clientName || null,
    client_document: clientDoc || null,
    contact_name: contactName || null,
    contact_email: contactEmail || null,
    contact_phone: contactPhone || null,
    project_name: projectName || null,
    items: items.map(({ _localId, ...rest }) => rest),
    extra_items: extraItems.map(({ _localId, ...rest }) => rest),
    conditions,
    notes: notes || null,
    valid_days: validDays,
    issued_date: issuedDate,
    includes_operator: includesOperator,
  }), [clientId, clientName, clientDoc, contactName, contactEmail, contactPhone, projectName,
      items, extraItems, conditions, notes, validDays, issuedDate, includesOperator]);

  const currentSig = JSON.stringify({
    cli: clientName, cnt: contactName, prj: projectName,
    its: payload.items, ex: payload.extra_items, cnd: conditions,
  });
  const previewDirty = currentSig !== previewSig;

  // Totales
  const subtotalStandby = useMemo(
    () => items.reduce((s, it) => s + ((it.rate_hour || 0) * (it.standby_hours || 176)), 0),
    [items]
  );
  const extrasTotal = useMemo(
    () => extraItems.filter(e => !e.is_optional).reduce((s, e) => s + (Number(e.qty) || 0) * (Number(e.unit_value) || 0), 0),
    [extraItems]
  );
  const totalEstimated = subtotalStandby + extrasTotal;

  async function regeneratePdf() {
    if (items.length === 0) {
      toast.error("Agrega al menos un equipo antes de generar el preview");
      return;
    }
    setGeneratingPdf(true);
    try {
      const blob = await api.rental.previewQuotationPdf(payload);
      if (pdfUrlRef.current) URL.revokeObjectURL(pdfUrlRef.current);
      const url = URL.createObjectURL(blob);
      pdfUrlRef.current = url;
      setPdfUrl(url);
      setPreviewSig(currentSig);
    } catch (e: any) {
      toast.error(e?.detail ?? "Error generando preview");
    } finally {
      setGeneratingPdf(false);
    }
  }

  // ── Items (equipos) ─────────────────────────────────────────────────────
  function addMachine(model: RentalCatalogModel) {
    const snapshot = {
      code: model.code,
      model: model.model,
      brand: model.brand ?? null,
      category: model.category ?? null,
      plate: null,  // Cotización por modelo: la placa se asigna al convertir
      image_url: model.image_url ?? null,
      specs: [],
      highlights: [],
    };
    setItems(prev => [...prev, {
      _localId: newLocalId(),
      catalog_machine_id: model.id,
      snapshot,
      rate_hour: 0,
      standby_hours: 176,
      notes: null,
    }]);
  }

  function removeItem(localId: string) {
    setItems(prev => prev.filter(it => it._localId !== localId));
    // Limpia extras asociadas a este equipo (que apuntaban por catalog_machine_id)
    const removed = items.find(it => it._localId === localId);
    const refId = removed?.catalog_machine_id || removed?.rental_machine_id;
    if (refId) {
      setExtraItems(prev => prev.map(e =>
        e.machine_id === refId ? { ...e, machine_id: null } : e
      ));
    }
  }

  function updateItem(localId: string, patch: Partial<RentalQuotationItem>) {
    setItems(prev => prev.map(it => it._localId === localId ? { ...it, ...patch } : it));
  }

  // ── Extras ─────────────────────────────────────────────────────────────
  function addExtraFromCatalog(c: RentalBillingConcept) {
    setExtraItems(prev => [...prev, {
      _localId: newLocalId(),
      concept_id: c.id,
      name: c.name,
      description: c.description,
      qty: c.default_qty || 1,
      unit_value: c.default_unit_value || 0,
      machine_id: null,
      is_optional: false,
    }]);
  }

  function addBlankExtra() {
    setExtraItems(prev => [...prev, {
      _localId: newLocalId(),
      concept_id: null,
      name: "",
      description: null,
      qty: 1,
      unit_value: 0,
      machine_id: null,
      is_optional: false,
    }]);
  }

  function removeExtra(localId: string) {
    setExtraItems(prev => prev.filter(e => e._localId !== localId));
  }

  function updateExtra(localId: string, patch: Partial<RentalQuotationExtraItem>) {
    setExtraItems(prev => prev.map(e => e._localId === localId ? { ...e, ...patch } : e));
  }

  // ── Guardar / enviar ────────────────────────────────────────────────────
  async function saveDraft(): Promise<string | null> {
    if (!clientId && !clientName.trim()) {
      toast.error("Debes seleccionar o escribir un cliente");
      return null;
    }
    if (items.length === 0) {
      toast.error("La cotización debe incluir al menos un equipo");
      return null;
    }
    for (const it of items) {
      if (!it.rate_hour || it.rate_hour <= 0) {
        toast.error("Todos los equipos deben tener valor por hora");
        return null;
      }
    }
    setSavingDraft(true);
    try {
      let q;
      if (savedId) {
        q = await api.rental.updateQuotation(savedId, payload);
      } else {
        q = await api.rental.createQuotation(payload);
        setSavedId(q.id);
      }
      setSavedNumber(q.number);
      toast.success(savedId ? "Cotización actualizada" : `Cotización ${q.number} creada`);
      return q.id;
    } catch (e: any) {
      toast.error(e?.detail ?? "Error al guardar");
      return null;
    } finally {
      setSavingDraft(false);
    }
  }

  async function handleSaveAndClose() {
    const id = await saveDraft();
    if (id) onSaved();
  }

  async function handleSaveAndOpenSend() {
    const id = await saveDraft();
    if (id) setSendOpen(true);
  }

  // ── Conditions edit helpers ─────────────────────────────────────────────
  function updateCondition(section: keyof RentalQuotationConditions, idx: number, value: string) {
    setConditions(prev => ({
      ...prev,
      [section]: prev[section].map((v, i) => i === idx ? value : v),
    }));
  }
  function addCondition(section: keyof RentalQuotationConditions) {
    setConditions(prev => ({ ...prev, [section]: [...prev[section], ""] }));
  }
  function removeCondition(section: keyof RentalQuotationConditions, idx: number) {
    setConditions(prev => ({ ...prev, [section]: prev[section].filter((_, i) => i !== idx) }));
  }

  return createPortal(
    <>
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-surface-2 border border-border w-full max-w-7xl h-[92vh] shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <FileText size={16} className="text-accent" />
            <h2 className="text-fg font-semibold text-sm">{isEdit ? "Editar cotización" : "Nueva cotización"}</h2>
          </div>
          <button onClick={onClose} className="text-fg-5 hover:text-fg transition-colors">
            <X size={18} />
          </button>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 size={20} className="animate-spin text-accent" />
          </div>
        ) : (
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-5 overflow-hidden">
            {/* ───── FORM (izq) ───── */}
            <div className="lg:col-span-2 overflow-y-auto border-b lg:border-b-0 lg:border-r border-border p-4 lg:p-5 space-y-5">
              {/* Cliente */}
              <Section title="Cliente y contacto">
                <div className="space-y-3">
                  <div>
                    <Label>Cliente *</Label>
                    <ClientSearchSelect
                      value={clientId}
                      displayValue={clientName || null}
                      onSelect={(c) => {
                        if (c) {
                          setClientId(c.id);
                          setClientName(c.name);
                          setClientDoc(c.document ?? "");
                          // Autollenar contactos del cliente (preferencia: obra > purchasing > treasury)
                          // Solo si el campo está vacío, para no sobrescribir lo que ya escribió el usuario.
                          const preferredContact = c.obra_contact ?? c.purchasing_contact ?? c.treasury_contact ?? "";
                          const preferredEmail   = c.obra_email   ?? c.billing_email      ?? c.info_email       ?? c.treasury_email ?? c.purchasing_email ?? "";
                          const preferredPhone   = c.obra_mobile  ?? c.mobile              ?? c.phone            ?? c.purchasing_mobile ?? c.treasury_mobile ?? "";
                          if (!contactName.trim())  setContactName(preferredContact ?? "");
                          if (!contactEmail.trim()) setContactEmail(preferredEmail ?? "");
                          if (!contactPhone.trim()) setContactPhone(preferredPhone ?? "");
                          toast.success(`Cliente cargado: ${c.name}`);
                        } else {
                          setClientId(null);
                          setClientName("");
                          setClientDoc("");
                        }
                      }}
                      placeholder="Buscar o crear cliente..."
                      compact
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label>NIT / Documento</Label>
                      <Input value={clientDoc} onChange={setClientDoc} placeholder="900.123.456-7" />
                    </div>
                    <div>
                      <Label>Contacto</Label>
                      <Input value={contactName} onChange={setContactName} placeholder="Nombre del contacto" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label>Email contacto</Label>
                      <Input value={contactEmail} onChange={setContactEmail} placeholder="correo@cliente.com" />
                    </div>
                    <div>
                      <Label>Teléfono</Label>
                      <Input value={contactPhone} onChange={setContactPhone} placeholder="3001234567" />
                    </div>
                  </div>
                  <div>
                    <Label>Proyecto / ubicación</Label>
                    <Input value={projectName} onChange={setProjectName} placeholder="Nombre del proyecto u obra" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label>Fecha emisión</Label>
                      <input type="date" value={issuedDate} onChange={e => setIssuedDate(e.target.value)}
                        className="w-full bg-surface-3 border border-border px-2 py-2 text-xs text-fg-2 outline-none focus:border-accent" />
                    </div>
                    <div>
                      <Label>Validez (días)</Label>
                      <input type="number" value={validDays} onChange={e => setValidDays(Number(e.target.value) || 15)}
                        className="w-full bg-surface-3 border border-border px-2 py-2 text-xs text-fg-2 outline-none focus:border-accent" />
                    </div>
                  </div>
                  <div>
                    <Label>¿Incluye operador?</Label>
                    <div className="inline-flex border border-border overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setIncludesOperator(false)}
                        className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                          !includesOperator ? "bg-accent text-black" : "bg-surface-3 text-fg-4 hover:bg-surface-4"
                        }`}
                      >
                        No
                      </button>
                      <button
                        type="button"
                        onClick={() => setIncludesOperator(true)}
                        className={`px-3 py-1.5 text-xs font-medium border-l border-border transition-colors ${
                          includesOperator ? "bg-accent text-black" : "bg-surface-3 text-fg-4 hover:bg-surface-4"
                        }`}
                      >
                        Sí
                      </button>
                    </div>
                    <p className="text-fg-6 text-[10px] mt-1">
                      Se muestra como badge y nota de precio en el PDF que recibe el cliente.
                    </p>
                  </div>
                </div>
              </Section>

              {/* Equipos */}
              <Section title={`Equipos cotizados (${items.length})`}
                       action={
                         <AddMachineBtn
                           catalogModels={catalogModels}
                           alreadyCatalogIds={items.map(i => i.catalog_machine_id ?? "").filter(Boolean)}
                           onAddModel={addMachine}
                         />
                       }>
                {items.length === 0 && (
                  <div className="text-fg-6 text-xs text-center py-6 border border-dashed border-border">
                    Añade al menos un modelo del catálogo de renta.
                  </div>
                )}
                <div className="space-y-3">
                  {items.map(it => (
                    <div key={it._localId} className="bg-surface-3 border border-border p-3 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="text-fg font-mono text-sm font-bold">{it.snapshot.code ?? "—"}</div>
                          <div className="text-fg-5 text-[11px] truncate">
                            {[it.snapshot.brand, it.snapshot.model].filter(Boolean).join(" · ")}
                            {it.snapshot.plate && (
                              <> · placa <span className="font-mono text-fg-3">{it.snapshot.plate}</span></>
                            )}
                            {!it.snapshot.plate && it.catalog_machine_id && (
                              <> · <span className="text-fg-6">la unidad física se asigna al convertir</span></>
                            )}
                          </div>
                        </div>
                        <button onClick={() => removeItem(it._localId)}
                          className="text-fg-6 hover:text-red-400 p-1">
                          <Trash2 size={13} />
                        </button>
                      </div>
                      <div className="grid grid-cols-[1fr_80px] gap-2">
                        <div>
                          <Label>Valor por hora (COP) *</Label>
                          <input type="number" value={it.rate_hour || ""}
                            onChange={e => updateItem(it._localId, { rate_hour: Number(e.target.value) })}
                            placeholder="160000"
                            className="w-full bg-surface-2 border border-border px-2 py-1.5 text-xs text-fg-2 outline-none focus:border-accent" />
                        </div>
                        <div>
                          <Label>Stand by (h)</Label>
                          <input type="number" value={it.standby_hours ?? 176}
                            onChange={e => updateItem(it._localId, { standby_hours: Number(e.target.value) || 176 })}
                            className="w-full bg-surface-2 border border-border px-2 py-1.5 text-xs text-fg-2 outline-none focus:border-accent" />
                        </div>
                      </div>
                      <div className="text-right text-[11px] text-fg-4">
                        Mínimo mensual: <strong className="text-accent">{copFmt((it.rate_hour || 0) * (it.standby_hours || 176))}</strong>
                      </div>
                    </div>
                  ))}
                </div>
              </Section>

              {/* Extras */}
              <Section title={`Conceptos adicionales (${extraItems.length})`}
                       action={
                         <div className="flex items-center gap-1">
                           <FromCatalogBtn catalog={catalog} onPick={addExtraFromCatalog} />
                           <button onClick={addBlankExtra}
                             className="flex items-center gap-1 text-[10px] uppercase tracking-wider bg-accent/10 text-accent hover:bg-accent/20 border border-accent/30 px-2 py-1 transition-colors">
                             <Plus size={11} /> Añadir
                           </button>
                         </div>
                       }>
                {extraItems.length === 0 ? (
                  <div className="text-fg-6 text-xs text-center py-4 border border-dashed border-border">
                    Agrega transporte, ACPM, mantenimientos... (opcional)
                  </div>
                ) : (
                  <div className="space-y-2">
                    {extraItems.map(e => (
                      <div key={e._localId} className={`border p-2 space-y-1 ${e.is_optional ? "bg-amber-500/5 border-amber-500/20" : "bg-surface-3 border-border"}`}>
                        <div className="flex items-start gap-2">
                          <input value={e.name}
                            onChange={ev => updateExtra(e._localId, { name: ev.target.value })}
                            placeholder="Nombre del concepto"
                            className="flex-1 bg-surface-2 border border-border px-2 py-1.5 text-xs text-fg-2 outline-none focus:border-accent" />
                          <button onClick={() => removeExtra(e._localId)}
                            className="text-fg-6 hover:text-red-400 p-1">
                            <Trash2 size={12} />
                          </button>
                        </div>
                        {(() => {
                          const refItems = items.filter(it => it.catalog_machine_id || it.rental_machine_id);
                          const showMachinePicker = refItems.length >= 2;
                          return (
                            <div className={`grid gap-2 ${showMachinePicker ? "grid-cols-[80px_1fr_1fr]" : "grid-cols-[80px_1fr]"}`}>
                              <input type="number" value={e.qty || ""}
                                onChange={ev => updateExtra(e._localId, { qty: Number(ev.target.value) })}
                                placeholder="Cant" step="0.01"
                                className="bg-surface-2 border border-border px-2 py-1.5 text-xs text-fg-2 outline-none focus:border-accent" />
                              <input type="number" value={e.unit_value || ""}
                                onChange={ev => updateExtra(e._localId, { unit_value: Number(ev.target.value) })}
                                placeholder="V. unit"
                                className="bg-surface-2 border border-border px-2 py-1.5 text-xs text-fg-2 outline-none focus:border-accent" />
                              {showMachinePicker && (
                                <select value={e.machine_id ?? ""}
                                  onChange={ev => updateExtra(e._localId, { machine_id: ev.target.value || null })}
                                  className="bg-surface-2 border border-border px-2 py-1.5 text-xs text-fg-2 outline-none focus:border-accent"
                                  title="Alcance del concepto">
                                  <option value="">General</option>
                                  {refItems.map(it => (
                                    <option key={it._localId} value={(it.catalog_machine_id || it.rental_machine_id)!}>
                                      {it.snapshot.code}
                                    </option>
                                  ))}
                                </select>
                              )}
                            </div>
                          );
                        })()}
                        <div className="flex items-center justify-between text-[11px]">
                          <label className="flex items-center gap-1 text-fg-5 cursor-pointer">
                            <input type="checkbox" checked={!!e.is_optional}
                              onChange={ev => updateExtra(e._localId, { is_optional: ev.target.checked })}
                              className="accent-accent" />
                            Opcional (no suma al total)
                          </label>
                          <span className="text-fg-4">
                            Total: <strong className={e.is_optional ? "text-amber-400" : "text-fg-2"}>
                              {copFmt((Number(e.qty) || 0) * (Number(e.unit_value) || 0))}
                            </strong>
                          </span>
                        </div>
                      </div>
                    ))}
                    <div className="text-right text-xs text-fg-4 pt-1 border-t border-border">
                      Subtotal: <strong className="text-accent">{copFmt(extrasTotal)}</strong>
                    </div>
                  </div>
                )}
              </Section>

              {/* Condiciones */}
              <ConditionsEditor conditions={conditions}
                onUpdate={updateCondition} onAdd={addCondition} onRemove={removeCondition} />

              <Section title="Notas internas (no se muestran en el PDF)">
                <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
                  className="w-full bg-surface-3 border border-border px-2 py-2 text-xs text-fg-2 outline-none focus:border-accent resize-none" />
              </Section>
            </div>

            {/* ───── PREVIEW (der) ───── */}
            <div className="lg:col-span-3 flex flex-col bg-surface-1 min-h-[400px] lg:min-h-0">
              <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-surface-2">
                <div className="text-fg-5 text-[11px] uppercase tracking-wider">
                  Preview PDF {previewDirty && pdfUrl && <span className="text-amber-400 ml-1">(desactualizado)</span>}
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <div className="text-fg-5">
                    Total mensual: <strong className="text-accent">{copFmt(totalEstimated)}</strong>
                  </div>
                  <button
                    onClick={regeneratePdf}
                    disabled={generatingPdf || items.length === 0}
                    className="flex items-center gap-1.5 bg-accent hover:bg-accent-light text-zinc-900 font-semibold text-[11px] uppercase tracking-wider px-3 py-1.5 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {generatingPdf ? <Loader2 size={11} className="animate-spin" /> : <RefreshCw size={11} />}
                    {pdfUrl ? "Actualizar" : "Generar preview"}
                  </button>
                </div>
              </div>
              <div className="flex-1 bg-zinc-900/40">
                {pdfUrl ? (
                  <iframe src={pdfUrl} className="w-full h-full" title="Preview" />
                ) : (
                  <div className="h-full flex items-center justify-center flex-col gap-2 text-fg-6 text-sm">
                    <FileText size={28} className="opacity-50" />
                    Completa los equipos y genera el preview para ver el PDF.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 sm:px-5 py-3 border-t border-border shrink-0 bg-surface-2">
          <div className="text-xs text-fg-5 shrink-0">
            {items.length} equipo{items.length === 1 ? "" : "s"} · {extraItems.length} concepto{extraItems.length === 1 ? "" : "s"} extra
          </div>
          <div className="flex gap-2 flex-wrap justify-end">
            <button onClick={onClose} className="px-3 sm:px-4 py-2 text-xs text-fg-4 border border-border hover:border-border-light transition-all">
              Cancelar
            </button>
            <button onClick={handleSaveAndClose} disabled={savingDraft}
              className="flex items-center gap-1.5 px-3 sm:px-4 py-2 text-xs font-semibold bg-surface-3 text-fg-2 border border-border hover:bg-surface-4 transition-all disabled:opacity-40">
              {savingDraft ? <Loader2 size={11} className="animate-spin" /> : <Save size={11} />}
              <span className="hidden sm:inline">Guardar </span>borrador
            </button>
            <button onClick={handleSaveAndOpenSend} disabled={savingDraft}
              className="flex items-center gap-1.5 px-3 sm:px-4 py-2 text-xs font-semibold bg-accent hover:bg-accent-light text-zinc-900 transition-all hover:shadow-glow disabled:opacity-40">
              <Send size={11} /> <span className="hidden sm:inline">Guardar y </span>Enviar
            </button>
          </div>
        </div>
      </div>
    </div>

    {sendOpen && savedId && (
      <SendModal
        quotationId={savedId}
        defaultEmail={contactEmail}
        clientName={clientName}
        quotationNumber={savedNumber}
        contactName={contactName}
        onClose={() => setSendOpen(false)}
        onSent={() => { setSendOpen(false); onSaved(); }}
      />
    )}
    </>,
    document.body
  );
}

// ── UI pieces ────────────────────────────────────────────────────────────────

function Section({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-fg-5 text-[10px] uppercase tracking-wider font-semibold">{title}</h3>
        {action}
      </div>
      {children}
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <label className="block text-[10px] uppercase tracking-wider text-fg-5 font-medium mb-1">{children}</label>;
}

function Input({ value, onChange, placeholder, type = "text" }: { value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      className="w-full bg-surface-3 border border-border px-2 py-2 text-xs text-fg-2 outline-none focus:border-accent" />
  );
}

function AddMachineBtn({
  catalogModels, alreadyCatalogIds, onAddModel,
}: {
  catalogModels: RentalCatalogModel[];
  alreadyCatalogIds: string[];
  onAddModel: (m: RentalCatalogModel) => void;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");

  const filtered = catalogModels.filter(m =>
    !alreadyCatalogIds.includes(m.id) &&
    (!q || `${m.code} ${m.model} ${m.brand ?? ""}`.toLowerCase().includes(q.toLowerCase()))
  ).slice(0, 50);

  return (
    <div className="relative">
      <button onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1 text-[10px] uppercase tracking-wider bg-accent/10 text-accent hover:bg-accent/20 border border-accent/30 px-2 py-1 transition-colors">
        <Plus size={11} /> Añadir modelo
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 w-80 bg-surface-2 border border-border shadow-xl z-50">
          <div className="px-3 py-2 border-b border-border bg-surface-3">
            <div className="text-[10px] uppercase tracking-wider text-fg-3 font-semibold">
              Modelos del catálogo (renta)
            </div>
            <div className="text-[10px] text-fg-6 mt-0.5">
              Cotizas el modelo. La unidad física se asigna al convertir.
            </div>
          </div>

          <div className="p-2 border-b border-border">
            <input autoFocus value={q} onChange={e => setQ(e.target.value)}
              placeholder="Buscar por código, modelo o marca..."
              className="w-full bg-surface-3 border border-border px-2 py-1.5 text-xs text-fg-2 outline-none focus:border-accent" />
          </div>

          <div className="max-h-72 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="text-center py-6 text-fg-6 text-xs">
                {catalogModels.length === 0 ? (
                  <>
                    Aún no hay modelos en el catálogo de renta.<br />
                    <a href="/inventario/renta" className="text-accent hover:underline">
                      Regístralos en Inventario → Renta
                    </a>
                  </>
                ) : "Sin resultados"}
              </div>
            ) : filtered.map(m => (
              <button key={m.id}
                onClick={() => { onAddModel(m); setOpen(false); setQ(""); }}
                className="w-full text-left px-3 py-2 hover:bg-surface-3 border-b border-border/50 transition-colors flex items-center gap-2">
                {m.image_url ? (
                  <img src={m.image_url} alt="" className="w-9 h-9 object-contain bg-surface-3 shrink-0" />
                ) : (
                  <div className="w-9 h-9 bg-surface-3 border border-border shrink-0" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="text-fg-2 text-xs font-mono font-semibold">{m.code}</div>
                  <div className="text-fg-5 text-[10px] truncate">
                    {[m.brand, m.model].filter(Boolean).join(" · ")}
                  </div>
                  <div className="text-fg-6 text-[10px] mt-0.5">
                    {m.available_units_count} de {m.units_count} unidad{m.units_count === 1 ? "" : "es"} disponibles
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function FromCatalogBtn({ catalog, onPick }: {
  catalog: RentalBillingConcept[];
  onPick: (c: RentalBillingConcept) => void;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const filtered = catalog.filter(c =>
    !q || c.name.toLowerCase().includes(q.toLowerCase())
  );

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1 text-[10px] uppercase tracking-wider bg-surface-3 hover:bg-surface-4 text-fg-4 border border-border px-2 py-1 transition-colors"
        title="Importar un concepto existente del catálogo"
      >
        <Tag size={11} /> Del catálogo
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 w-64 bg-surface-2 border border-border shadow-xl z-50">
          <div className="p-2 border-b border-border">
            <input autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar concepto..."
              className="w-full bg-surface-3 border border-border px-2 py-1.5 text-xs text-fg-2 outline-none focus:border-accent" />
          </div>
          <div className="max-h-56 overflow-y-auto">
            {filtered.length === 0 && (
              <div className="text-center py-3 text-fg-6 text-xs">Sin resultados</div>
            )}
            {filtered.map(c => (
              <button key={c.id}
                onClick={() => { onPick(c); setOpen(false); setQ(""); }}
                className="w-full text-left px-3 py-2 hover:bg-surface-3 border-b border-border/50 transition-colors">
                <div className="text-fg-2 text-xs flex items-center gap-1">
                  <Tag size={10} className="text-accent" /> {c.name}
                </div>
                {c.default_unit_value !== null && (
                  <div className="text-fg-6 text-[10px]">{copFmt(c.default_unit_value)}</div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function AutoGrowTextarea({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.max(el.scrollHeight, 44)}px`;
  }, [value]);
  return (
    <textarea
      ref={ref}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      rows={2}
      className="w-full bg-surface-2 border border-border px-3 py-2 text-xs leading-relaxed text-fg-2
                 outline-none focus:border-accent resize-none overflow-hidden"
    />
  );
}

function ConditionsEditor({ conditions, onUpdate, onAdd, onRemove }: {
  conditions: RentalQuotationConditions;
  onUpdate: (section: keyof RentalQuotationConditions, idx: number, value: string) => void;
  onAdd: (section: keyof RentalQuotationConditions) => void;
  onRemove: (section: keyof RentalQuotationConditions, idx: number) => void;
}) {
  const sections: Array<{ key: keyof RentalQuotationConditions; label: string; hint: string; placeholder: string }> = [
    { key: "alquiler", label: "Condiciones del alquiler",
      hint: "Forma de pago, mantenimiento, exclusiones, llantas, zonas especiales…",
      placeholder: "Forma de pago. Vencido por el stand by mínimo…" },
    { key: "entrega", label: "Condiciones de la entrega",
      hint: "Stand by, transporte, seguro, reajuste anual…",
      placeholder: "Stand by. El stand by mensual es de 176 horas por equipo…" },
    { key: "credito", label: "Requisitos apertura de crédito",
      hint: "Documentos que debe entregar el cliente para abrir crédito.",
      placeholder: "Solicitud de crédito en CONINMAQ S.A.S." },
  ];
  const [openSection, setOpenSection] = useState<string | null>("alquiler");

  return (
    <Section title="Condiciones">
      <div className="space-y-2">
        {sections.map(s => {
          const isOpen = openSection === s.key;
          const count = conditions[s.key].length;
          return (
            <div key={s.key} className="bg-surface-3 border border-border overflow-hidden">
              <button
                onClick={() => setOpenSection(isOpen ? null : s.key)}
                className="w-full flex items-center justify-between px-3 py-2.5 text-left hover:bg-surface-4 transition-colors"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-fg-2 text-xs font-semibold">{s.label}</span>
                    <span className="inline-flex items-center justify-center min-w-[22px] h-[18px] bg-accent/15 text-accent border border-accent/30 text-[10px] font-bold px-1.5 rounded-sm">
                      {count}
                    </span>
                  </div>
                  <div className="text-fg-6 text-[10px] mt-0.5 truncate">{s.hint}</div>
                </div>
                <ChevronDown size={14} className={`text-fg-5 shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`} />
              </button>

              {isOpen && (
                <div className="p-3 border-t border-border bg-surface-2/40 space-y-2">
                  {count === 0 && (
                    <div className="text-center py-4 text-fg-6 text-[11px] border border-dashed border-border">
                      Sin condiciones. Añade la primera con el botón de abajo.
                    </div>
                  )}
                  {conditions[s.key].map((v, i) => (
                    <div key={i} className="group flex items-start gap-2 bg-surface-3 border border-border p-2
                                            hover:border-accent/30 transition-colors">
                      <div className="shrink-0 flex flex-col items-center gap-1 pt-0.5">
                        <span className="text-accent text-[11px] font-mono font-bold bg-surface-4 border border-border
                                         min-w-[26px] h-[24px] flex items-center justify-center">
                          {(i + 1).toString().padStart(2, "0")}
                        </span>
                        <span className="text-fg-6 text-[8px] uppercase tracking-wider">
                          {v.length}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <AutoGrowTextarea
                          value={v}
                          onChange={(nv) => onUpdate(s.key, i, nv)}
                          placeholder={s.placeholder}
                        />
                      </div>
                      <button
                        onClick={() => onRemove(s.key, i)}
                        className="shrink-0 text-fg-6 hover:text-red-400 p-1.5 border border-transparent hover:border-red-500/30
                                   hover:bg-red-500/10 transition-colors opacity-60 group-hover:opacity-100"
                        title="Eliminar"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => onAdd(s.key)}
                    className="w-full flex items-center justify-center gap-1 text-[11px] uppercase tracking-wider text-fg-5
                               hover:text-accent border border-dashed border-border hover:border-accent/50 py-2 transition-colors"
                  >
                    <Plus size={11} /> Añadir condición
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Section>
  );
}

function SendModal({ quotationId, defaultEmail, clientName, quotationNumber, contactName, onClose, onSent }: {
  quotationId: string;
  defaultEmail: string;
  clientName: string;
  quotationNumber: string;
  contactName: string;
  onClose: () => void;
  onSent: () => void;
}) {
  // Asunto por defecto: "Cotización RNT-2026-NNN · Cliente — Propuesta de alquiler CONINMAQ"
  const defaultSubject = quotationNumber
    ? `Cotización ${quotationNumber} · ${clientName} — Propuesta de alquiler CONINMAQ`
    : `Cotización ${clientName} — Propuesta de alquiler CONINMAQ`;

  // Nota por defecto: saludo personalizado + mensaje corto
  const firstName = (contactName || "").trim().split(/\s+/)[0] || "";
  const greet = firstName ? `Estimado(a) ${firstName}` : "Estimados";
  const defaultNote = `${greet},\n\nAdjunto encontrarás nuestra propuesta de alquiler para su proyecto. Quedo atento a cualquier comentario o ajuste que requieras.\n\nCordialmente,\nCONINMAQ S.A.S.`;

  const [emails, setEmails] = useState(defaultEmail || "");
  const [cc, setCc] = useState("");
  const [subject, setSubject] = useState(defaultSubject);
  const [note, setNote] = useState(defaultNote);
  const [sending, setSending] = useState(false);

  async function handleSend() {
    const list = emails.split(/[,\s]+/).map(s => s.trim()).filter(Boolean);
    if (list.length === 0) { toast.error("Ingresa al menos un destinatario"); return; }
    const ccList = cc.split(/[,\s]+/).map(s => s.trim()).filter(Boolean);
    setSending(true);
    try {
      await api.rental.sendQuotation(quotationId, {
        recipient_emails: list,
        cc_emails: ccList,
        subject: subject.trim() || null,
        note: note.trim() || null,
      });
      toast.success("Cotización enviada");
      onSent();
    } catch (e: any) {
      toast.error(e?.detail ?? "Error al enviar");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-surface-2 border border-border w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h3 className="text-fg font-semibold text-sm">Enviar cotización por email</h3>
          <button onClick={onClose} className="text-fg-5 hover:text-fg">
            <X size={18} />
          </button>
        </div>
        <div className="p-5 space-y-3">
          <div>
            <Label>Para * (coma separada)</Label>
            <input value={emails} onChange={e => setEmails(e.target.value)} placeholder="contacto@cliente.com"
              className="w-full bg-surface-3 border border-border px-2 py-2 text-xs text-fg-2 outline-none focus:border-accent" />
          </div>
          <div>
            <Label>CC</Label>
            <input value={cc} onChange={e => setCc(e.target.value)}
              className="w-full bg-surface-3 border border-border px-2 py-2 text-xs text-fg-2 outline-none focus:border-accent" />
          </div>
          <div>
            <Label>Asunto <span className="text-fg-6 normal-case">(editable)</span></Label>
            <input value={subject} onChange={e => setSubject(e.target.value)}
              className="w-full bg-surface-3 border border-border px-2 py-2 text-xs text-fg-2 outline-none focus:border-accent" />
          </div>
          <div>
            <Label>Mensaje <span className="text-fg-6 normal-case">(editable)</span></Label>
            <textarea value={note} onChange={e => setNote(e.target.value)} rows={6}
              className="w-full bg-surface-3 border border-border px-2 py-2 text-xs text-fg-2 outline-none focus:border-accent resize-none" />
          </div>
        </div>
        <div className="flex justify-end gap-2 px-5 py-3 border-t border-border">
          <button onClick={onClose} className="px-4 py-2 text-xs text-fg-4 border border-border">Cancelar</button>
          <button onClick={handleSend} disabled={sending}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-accent hover:bg-accent-light text-zinc-900 disabled:opacity-40">
            {sending ? <Loader2 size={11} className="animate-spin" /> : <Send size={11} />}
            Enviar ahora
          </button>
        </div>
      </div>
    </div>
  );
}
