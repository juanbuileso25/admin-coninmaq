import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft, Loader2, Package, DollarSign, Pencil, Plus, Trash2, X,
  AlertTriangle, AlertCircle, CheckCircle2, Clock, ChevronDown, ChevronUp,
} from "lucide-react";
import { api, type MachineOrderDetailResponse, type MachineOrderItemResponse, type MachineOrderPaymentResponse, type SupplierResponse } from "../../services/api";
import DatePicker from "../../components/ui/DatePicker";
import Select from "../../components/ui/Select";

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(d: string | null | undefined) {
  if (!d) return "—";
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}

function fmtUSD(n: number | string | null | undefined) {
  if (n == null) return "—";
  const num = Number(n);
  if (isNaN(num)) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0 }).format(num);
}

function fmtCOP(n: number | string | null | undefined) {
  if (n == null) return "—";
  const num = Number(n);
  if (isNaN(num)) return "—";
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 }).format(num);
}

function fmtTRM(n: number | string | null | undefined) {
  if (n == null) return "—";
  const num = Number(n);
  if (isNaN(num)) return "—";
  return num.toLocaleString("es-CO", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}


const PAYMENT_LABELS: Record<string, { label: string; dot: string }> = {
  sin_anticipo:    { label: "Sin anticipo",    dot: "bg-fg-6"       },
  anticipo_pagado: { label: "Anticipo pagado", dot: "bg-yellow-400" },
  saldo_parcial:   { label: "Saldo parcial",   dot: "bg-blue-400"   },
  pagado_completo: { label: "Pagado completo", dot: "bg-green-400"  },
};


// ── Info field ────────────────────────────────────────────────────────────────

function InfoField({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] text-fg-6 uppercase tracking-wider mb-0.5">{label}</p>
      <p className={`text-sm text-fg-3 truncate ${mono ? "font-mono" : ""}`}>{value || "—"}</p>
    </div>
  );
}

// ── Add Item Modal ────────────────────────────────────────────────────────────

function AddItemModal({ orderId, onClose, onSaved }: { orderId: string; onClose: () => void; onSaved: (order: MachineOrderDetailResponse) => void }) {
  const [form, setForm] = useState({ model: "", description: "", machine_serial: "", engine_serial: "", client_name: "", invoice_number: "", fob_value_usd: "" });
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((p) => ({ ...p, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.model) { setError("El modelo es obligatorio"); return; }
    setLoading(true);
    try {
      const order = await api.machineOrders.addItem(orderId, {
        model: form.model, description: form.description || null,
        machine_serial: form.machine_serial || null, engine_serial: form.engine_serial || null,
        client_name: form.client_name || null, invoice_number: form.invoice_number || null,
        fob_value_usd: form.fob_value_usd ? Number(form.fob_value_usd) : null,
      });
      onSaved(order);
    } catch (err: unknown) {
      const e = err as { detail?: string };
      setError(e?.detail ?? "Error al agregar máquina");
    } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-surface-2 border border-border w-full max-w-md shadow-card animate-fade-up">
        <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-accent to-transparent" />
        <div className="p-5 sm:p-6">
          <h2 className="text-fg text-base font-semibold mb-5">Agregar máquina</h2>
          <form onSubmit={handleSubmit} noValidate className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-fg-4 text-xs font-medium uppercase tracking-wider">Modelo *</label>
              <input value={form.model} onChange={set("model")} required className="input-dark w-full" placeholder="CDM856" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-fg-4 text-xs font-medium uppercase tracking-wider">Descripción</label>
                <input value={form.description} onChange={set("description")} className="input-dark w-full" placeholder="CARGADOR FRONTAL" />
              </div>
              <div className="space-y-1.5">
                <label className="text-fg-4 text-xs font-medium uppercase tracking-wider">FOB (USD)</label>
                <input value={form.fob_value_usd} onChange={set("fob_value_usd")} type="number" className="input-dark w-full" placeholder="40000" />
              </div>
              <div className="space-y-1.5">
                <label className="text-fg-4 text-xs font-medium uppercase tracking-wider">Serie máquina</label>
                <input value={form.machine_serial} onChange={set("machine_serial")} className="input-dark w-full" />
              </div>
              <div className="space-y-1.5">
                <label className="text-fg-4 text-xs font-medium uppercase tracking-wider">Serie motor</label>
                <input value={form.engine_serial} onChange={set("engine_serial")} className="input-dark w-full" />
              </div>
              <div className="space-y-1.5">
                <label className="text-fg-4 text-xs font-medium uppercase tracking-wider">Cliente</label>
                <input value={form.client_name} onChange={set("client_name")} className="input-dark w-full" />
              </div>
              <div className="space-y-1.5">
                <label className="text-fg-4 text-xs font-medium uppercase tracking-wider"># Factura</label>
                <input value={form.invoice_number} onChange={set("invoice_number")} className="input-dark w-full" />
              </div>
            </div>
            {error && (
              <div className="flex items-start gap-2 bg-red-950/40 border border-red-800/40 px-3 py-2">
                <AlertCircle size={13} className="text-red-400 mt-0.5 flex-shrink-0" />
                <p className="text-red-400 text-xs">{error}</p>
              </div>
            )}
            <div className="flex items-center justify-end gap-2 pt-1">
              <button type="button" onClick={onClose} className="px-4 py-2 text-xs text-fg-4 border border-border hover:border-border-light transition-all">Cancelar</button>
              <button type="submit" disabled={loading} className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent-light text-zinc-900 font-semibold text-xs uppercase tracking-wider transition-all disabled:opacity-60">
                {loading && <Loader2 size={13} className="animate-spin" />}Agregar
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// ── Add Payment Modal ─────────────────────────────────────────────────────────

function AddPaymentModal({ order, onClose, onSaved }: { order: MachineOrderDetailResponse; onClose: () => void; onSaved: (order: MachineOrderDetailResponse) => void }) {
  const activeItems = order.items.filter((i) => i.is_active);
  const [form, setForm] = useState({ payment_type: "anticipo_30pct", amount_usd: "", payment_date: "", trm: "", amount_cop: "", notes: "" });
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm((p) => ({ ...p, [k]: e.target.value }));
  const setVal = (k: string) => (v: string | null) => setForm((p) => ({ ...p, [k]: v ?? "" }));
  const toggleItem = (id: string) => setSelectedItemIds((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id]);

  const amountCOP = form.amount_usd && form.trm
    ? (Number(form.amount_usd) * Number(form.trm)).toFixed(2)
    : form.amount_cop;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const activePayments = order.payments.filter((p) => p.is_active);
      const installmentNumber = form.payment_type === "saldo"
        ? (activePayments.filter((p) => p.payment_type === "saldo").length + 1)
        : undefined;
      const updated = await api.machineOrders.addPayment(order.id, {
        payment_type:       form.payment_type,
        installment_number: installmentNumber ?? null,
        amount_usd:         form.amount_usd  ? Number(form.amount_usd) : null,
        payment_date:       form.payment_date || null,
        trm:                form.trm         ? Number(form.trm)        : null,
        amount_cop:         amountCOP        ? Number(amountCOP)       : null,
        notes:              form.notes       || null,
        machine_item_ids:   selectedItemIds,
      });
      onSaved(updated);
    } catch (err: unknown) {
      const e = err as { detail?: string };
      setError(e?.detail ?? "Error al registrar pago");
    } finally { setLoading(false); }
  };

  const totalFOB = activeItems.reduce((acc, it) => acc + Number(it.fob_value_usd ?? 0), 0);
  const paid70   = order.payments.filter((p) => p.is_active && p.payment_type === "saldo").reduce((acc, p) => acc + Number(p.amount_usd ?? 0), 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-surface-2 border border-border w-full max-w-lg shadow-card animate-fade-up max-h-[90vh] overflow-y-auto">
        <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-accent to-transparent sticky top-0" />
        <div className="p-5 sm:p-6">
          <h2 className="text-fg text-base font-semibold mb-1">Registrar pago</h2>
          {totalFOB > 0 && (
            <div className="flex flex-wrap gap-4 mb-5 text-xs">
              <span className="text-fg-6">Anticipo 30%: <span className="text-accent font-mono">{fmtUSD(totalFOB * 0.30)}</span></span>
              <span className="text-fg-6">Saldo pendiente: <span className="text-yellow-400 font-mono">{fmtUSD(totalFOB * 0.70 - paid70)}</span></span>
            </div>
          )}
          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-fg-4 text-xs font-medium uppercase tracking-wider">Tipo de pago</label>
              <Select
                value={form.payment_type}
                onChange={setVal("payment_type")}
                options={[
                  { value: "anticipo_30pct", label: "Anticipo 30%" },
                  { value: "saldo",          label: "Pago de saldo" },
                ]}
              />
            </div>
            {activeItems.length > 0 && (
              <div className="space-y-1.5">
                <label className="text-fg-4 text-xs font-medium uppercase tracking-wider">Máquinas que cubre</label>
                <div className="space-y-1.5 max-h-32 overflow-y-auto">
                  {activeItems.map((item) => (
                    <label key={item.id} className="flex items-center gap-2.5 cursor-pointer">
                      <input type="checkbox" checked={selectedItemIds.includes(item.id)} onChange={() => toggleItem(item.id)} className="w-3.5 h-3.5 accent-yellow-400" />
                      <span className="text-xs text-fg-3">
                        <span className="text-accent font-semibold">{item.model}</span>
                        {item.fob_value_usd != null && <span className="text-fg-6 ml-1">({fmtUSD(item.fob_value_usd)})</span>}
                        {item.client_name && <span className="text-fg-6 ml-1">· {item.client_name}</span>}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-fg-4 text-xs font-medium uppercase tracking-wider">Monto (USD)</label>
                <input value={form.amount_usd} onChange={set("amount_usd")} type="number" step="0.01" className="input-dark w-full" placeholder="28080" />
              </div>
              <div className="space-y-1.5">
                <label className="text-fg-4 text-xs font-medium uppercase tracking-wider">Fecha de pago</label>
                <DatePicker value={form.payment_date || null} onChange={setVal("payment_date")} />
              </div>
              <div className="space-y-1.5">
                <label className="text-fg-4 text-xs font-medium uppercase tracking-wider">TRM</label>
                <input value={form.trm} onChange={set("trm")} type="number" step="0.01" className="input-dark w-full" placeholder="4274.40" />
              </div>
              <div className="space-y-1.5">
                <label className="text-fg-4 text-xs font-medium uppercase tracking-wider">Monto COP</label>
                <input value={amountCOP || ""} readOnly className="input-dark w-full text-fg-5 cursor-default" placeholder="Auto-calculado" />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-fg-4 text-xs font-medium uppercase tracking-wider">Notas</label>
              <textarea value={form.notes} onChange={set("notes")} rows={2} className="input-dark w-full resize-none" placeholder="Observaciones..." />
            </div>
            {error && (
              <div className="flex items-start gap-2 bg-red-950/40 border border-red-800/40 px-3 py-2">
                <AlertCircle size={13} className="text-red-400 mt-0.5 flex-shrink-0" />
                <p className="text-red-400 text-xs">{error}</p>
              </div>
            )}
            <div className="flex items-center justify-end gap-2 pt-1">
              <button type="button" onClick={onClose} className="px-4 py-2 text-xs text-fg-4 border border-border hover:border-border-light transition-all">Cancelar</button>
              <button type="submit" disabled={loading} className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent-light text-zinc-900 font-semibold text-xs uppercase tracking-wider transition-all disabled:opacity-60">
                {loading && <Loader2 size={13} className="animate-spin" />}Registrar pago
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// ── Edit Order Modal ──────────────────────────────────────────────────────────

function EditOrderModal({ order, suppliers, onClose, onSaved }: { order: MachineOrderDetailResponse; suppliers: SupplierResponse[]; onClose: () => void; onSaved: (o: MachineOrderDetailResponse) => void }) {
  const [form, setForm] = useState({
    supplier_id:          order.supplier_id,
    factory_order_number: order.factory_order_number,
    order_date:           order.order_date      ?? "",
    bl_number:            order.bl_number       ?? "",
    bl_date:              order.bl_date         ?? "",
    due_date:             order.due_date        ?? "",
    lonking_invoice:      order.lonking_invoice ?? "",
    year:                 String(order.year     ?? ""),
    freight_agent:        order.freight_agent   ?? "",
    customs_broker:       order.customs_broker  ?? "",
    notes:                order.notes           ?? "",
  });
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");
  const set    = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm((p) => ({ ...p, [k]: e.target.value }));
  const setVal = (k: string) => (v: string | null) => setForm((p) => ({ ...p, [k]: v ?? "" }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const updated = await api.machineOrders.update(order.id, {
        supplier_id:          form.supplier_id          || undefined,
        factory_order_number: form.factory_order_number || undefined,
        order_date:      form.order_date      || null,
        bl_number:       form.bl_number       || null,
        bl_date:         form.bl_date         || null,
        due_date:        form.due_date        || null,
        lonking_invoice: form.lonking_invoice || null,
        year:            form.year ? Number(form.year) : null,
        freight_agent:   form.freight_agent  || null,
        customs_broker:  form.customs_broker || null,
        notes:           form.notes          || null,
      });
      onSaved(updated);
    } catch (err: unknown) {
      const e = err as { detail?: string };
      setError(e?.detail ?? "Error al actualizar");
    } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-surface-2 border border-border w-full max-w-lg shadow-card animate-fade-up max-h-[90vh] overflow-y-auto">
        <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-accent to-transparent sticky top-0" />
        <div className="p-5 sm:p-6">
          <h2 className="text-fg text-base font-semibold mb-5">Editar pedido</h2>
          <form onSubmit={handleSubmit} noValidate className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1.5">
                <label className="text-fg-4 text-xs font-medium uppercase tracking-wider">Proveedor</label>
                <Select value={form.supplier_id} onChange={setVal("supplier_id")} options={suppliers.map((s) => ({ value: s.id, label: s.name }))} />
              </div>
              <div className="col-span-2 space-y-1.5">
                <label className="text-fg-4 text-xs font-medium uppercase tracking-wider"># Pedido fábrica</label>
                <input value={form.factory_order_number} onChange={set("factory_order_number")} className="input-dark w-full" />
              </div>
              <div className="space-y-1.5">
                <label className="text-fg-4 text-xs font-medium uppercase tracking-wider">Año</label>
                <input value={form.year} onChange={set("year")} type="number" className="input-dark w-full" />
              </div>
              <div className="space-y-1.5">
                <label className="text-fg-4 text-xs font-medium uppercase tracking-wider">Fecha pedido</label>
                <DatePicker value={form.order_date || null} onChange={setVal("order_date")} />
              </div>
              <div className="space-y-1.5">
                <label className="text-fg-4 text-xs font-medium uppercase tracking-wider">Factura proveedor</label>
                <input value={form.lonking_invoice} onChange={set("lonking_invoice")} className="input-dark w-full" />
              </div>
              <div className="space-y-1.5">
                <label className="text-fg-4 text-xs font-medium uppercase tracking-wider"># BL</label>
                <input value={form.bl_number} onChange={set("bl_number")} className="input-dark w-full" />
              </div>
              <div className="space-y-1.5">
                <label className="text-fg-4 text-xs font-medium uppercase tracking-wider">Fecha BL</label>
                <DatePicker value={form.bl_date || null} onChange={setVal("bl_date")} />
              </div>
              <div className="space-y-1.5">
                <label className="text-fg-4 text-xs font-medium uppercase tracking-wider">Fecha vencimiento</label>
                <DatePicker value={form.due_date || null} onChange={setVal("due_date")} />
              </div>
              <div className="space-y-1.5">
                <label className="text-fg-4 text-xs font-medium uppercase tracking-wider">Agente de carga</label>
                <input value={form.freight_agent} onChange={set("freight_agent")} className="input-dark w-full" />
              </div>
              <div className="space-y-1.5">
                <label className="text-fg-4 text-xs font-medium uppercase tracking-wider">Aduana</label>
                <input value={form.customs_broker} onChange={set("customs_broker")} className="input-dark w-full" />
              </div>
              <div className="col-span-2 space-y-1.5">
                <label className="text-fg-4 text-xs font-medium uppercase tracking-wider">Notas</label>
                <textarea value={form.notes} onChange={set("notes")} rows={2} className="input-dark w-full resize-none" />
              </div>
            </div>
            {error && (
              <div className="flex items-start gap-2 bg-red-950/40 border border-red-800/40 px-3 py-2">
                <AlertCircle size={13} className="text-red-400 mt-0.5 flex-shrink-0" />
                <p className="text-red-400 text-xs">{error}</p>
              </div>
            )}
            <div className="flex items-center justify-end gap-2 pt-1">
              <button type="button" onClick={onClose} className="px-4 py-2 text-xs text-fg-4 border border-border hover:border-border-light transition-all">Cancelar</button>
              <button type="submit" disabled={loading} className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent-light text-zinc-900 font-semibold text-xs uppercase tracking-wider transition-all disabled:opacity-60">
                {loading && <Loader2 size={13} className="animate-spin" />}Guardar
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// ── Edit Item Modal ───────────────────────────────────────────────────────────

function EditItemModal({ orderId, item, onClose, onSaved }: {
  orderId: string;
  item: MachineOrderItemResponse;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    model:                 item.model,
    description:           item.description           ?? "",
    machine_serial:        item.machine_serial        ?? "",
    engine_serial:         String(item.engine_serial  ?? ""),
    client_name:           item.client_name           ?? "",
    invoice_number:        item.invoice_number        ?? "",
    fob_value_usd:         item.fob_value_usd != null ? String(Number(item.fob_value_usd)) : "",
    has_matricula:         item.has_matricula          ?? false,
    arrival_date_col:      item.arrival_date_col       ?? "",
    cif_cost:              item.cif_cost != null       ? String(Number(item.cif_cost))              : "",
    ddp_cost:              item.ddp_cost != null       ? String(Number(item.ddp_cost))              : "",
    import_factor:         item.import_factor != null  ? String(Number(item.import_factor))         : "",
    nationalization_trm:   item.nationalization_trm != null ? String(Number(item.nationalization_trm)) : "",
    sale_value_before_tax: item.sale_value_before_tax != null ? String(Number(item.sale_value_before_tax)) : "",
    sale_iva:              item.sale_iva != null        ? String(Number(item.sale_iva))              : "",
    total_sale:            item.total_sale != null      ? String(Number(item.total_sale))            : "",
    profit_cop:            item.profit_cop != null      ? String(Number(item.profit_cop))            : "",
    profit_pct:            item.profit_pct != null      ? String((Number(item.profit_pct) * 100).toFixed(2)) : "",
  });
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  const set    = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((p) => ({ ...p, [k]: e.target.value }));
  const setVal = (k: string) => (v: string | null) => setForm((p) => ({ ...p, [k]: v ?? "" }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.model) { setError("El modelo es obligatorio"); return; }
    setLoading(true);
    try {
      await api.machineOrders.updateItem(orderId, item.id, {
        model:                 form.model,
        description:           form.description           || null,
        machine_serial:        form.machine_serial        || null,
        engine_serial:         form.engine_serial         || null,
        client_name:           form.client_name           || null,
        invoice_number:        form.invoice_number        || null,
        fob_value_usd:         form.fob_value_usd         ? Number(form.fob_value_usd)         : null,
        has_matricula:         form.has_matricula,
        arrival_date_col:      form.arrival_date_col      || null,
        cif_cost:              form.cif_cost              ? Number(form.cif_cost)              : null,
        ddp_cost:              form.ddp_cost              ? Number(form.ddp_cost)              : null,
        import_factor:         form.import_factor         ? Number(form.import_factor)         : null,
        nationalization_trm:   form.nationalization_trm   ? Number(form.nationalization_trm)   : null,
        sale_value_before_tax: form.sale_value_before_tax ? Number(form.sale_value_before_tax) : null,
        sale_iva:              form.sale_iva              ? Number(form.sale_iva)              : null,
        total_sale:            form.total_sale            ? Number(form.total_sale)            : null,
        profit_cop:            form.profit_cop            ? Number(form.profit_cop)            : null,
        profit_pct:            form.profit_pct            ? Number(form.profit_pct) / 100      : null,
      });
      onSaved();
    } catch (err: unknown) {
      const e = err as { detail?: string };
      setError(e?.detail ?? "Error al guardar");
    } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-surface-2 border border-border w-full max-w-lg shadow-card animate-fade-up max-h-[90vh] flex flex-col">
        <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-accent to-transparent flex-shrink-0" />
        <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0">
          <div>
            <h2 className="text-fg text-base font-semibold">Editar máquina</h2>
            <p className="text-fg-6 text-xs mt-0.5">{item.model}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center text-fg-5 hover:text-fg hover:bg-surface-3 transition-all">
            <X size={15} />
          </button>
        </div>

        <form id="edit-item-form" onSubmit={handleSubmit} noValidate className="flex-1 overflow-y-auto">
          <div className="p-5 space-y-5">

            {/* Básico */}
            <section className="space-y-3">
              <h3 className="text-fg-6 text-[10px] uppercase tracking-wider font-semibold border-b border-border pb-1.5">Información básica</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 space-y-1.5">
                  <label className="text-fg-4 text-xs font-medium uppercase tracking-wider">Modelo *</label>
                  <input value={form.model} onChange={set("model")} className="input-dark w-full" placeholder="CDM856" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-fg-4 text-xs font-medium uppercase tracking-wider">Descripción</label>
                  <input value={form.description} onChange={set("description")} className="input-dark w-full" placeholder="CARGADOR FRONTAL" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-fg-4 text-xs font-medium uppercase tracking-wider">FOB (USD)</label>
                  <input value={form.fob_value_usd} onChange={set("fob_value_usd")} type="number" step="0.01" className="input-dark w-full" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-fg-4 text-xs font-medium uppercase tracking-wider">Cliente</label>
                  <input value={form.client_name} onChange={set("client_name")} className="input-dark w-full" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-fg-4 text-xs font-medium uppercase tracking-wider"># Factura</label>
                  <input value={form.invoice_number} onChange={set("invoice_number")} className="input-dark w-full" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-fg-4 text-xs font-medium uppercase tracking-wider">Serie máquina</label>
                  <input value={form.machine_serial} onChange={set("machine_serial")} className="input-dark w-full" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-fg-4 text-xs font-medium uppercase tracking-wider">Serie motor</label>
                  <input value={form.engine_serial} onChange={set("engine_serial")} className="input-dark w-full" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-fg-4 text-xs font-medium uppercase tracking-wider">Llegada COL</label>
                  <DatePicker value={form.arrival_date_col || null} onChange={setVal("arrival_date_col")} />
                </div>
                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="checkbox"
                    id="has_matricula"
                    checked={form.has_matricula}
                    onChange={(e) => setForm((p) => ({ ...p, has_matricula: e.target.checked }))}
                    className="w-3.5 h-3.5 accent-yellow-400"
                  />
                  <label htmlFor="has_matricula" className="text-fg-4 text-xs font-medium uppercase tracking-wider cursor-pointer">Matrícula</label>
                </div>
              </div>
            </section>

            {/* Importación */}
            <section className="space-y-3">
              <h3 className="text-fg-6 text-[10px] uppercase tracking-wider font-semibold border-b border-border pb-1.5">Costos de importación</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-fg-4 text-xs font-medium uppercase tracking-wider">Costo CIF</label>
                  <input value={form.cif_cost} onChange={set("cif_cost")} type="number" step="0.01" className="input-dark w-full" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-fg-4 text-xs font-medium uppercase tracking-wider">Costo DDP</label>
                  <input value={form.ddp_cost} onChange={set("ddp_cost")} type="number" step="0.01" className="input-dark w-full" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-fg-4 text-xs font-medium uppercase tracking-wider">Factor importación</label>
                  <input value={form.import_factor} onChange={set("import_factor")} type="number" step="0.0001" className="input-dark w-full" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-fg-4 text-xs font-medium uppercase tracking-wider">TRM nacion.</label>
                  <input value={form.nationalization_trm} onChange={set("nationalization_trm")} type="number" step="0.01" className="input-dark w-full" />
                </div>
              </div>
            </section>

            {/* Ventas */}
            <section className="space-y-3">
              <h3 className="text-fg-6 text-[10px] uppercase tracking-wider font-semibold border-b border-border pb-1.5">Ventas</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-fg-4 text-xs font-medium uppercase tracking-wider">Venta s/IVA</label>
                  <input value={form.sale_value_before_tax} onChange={set("sale_value_before_tax")} type="number" step="0.01" className="input-dark w-full" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-fg-4 text-xs font-medium uppercase tracking-wider">IVA</label>
                  <input value={form.sale_iva} onChange={set("sale_iva")} type="number" step="0.01" className="input-dark w-full" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-fg-4 text-xs font-medium uppercase tracking-wider">Total venta</label>
                  <input value={form.total_sale} onChange={set("total_sale")} type="number" step="0.01" className="input-dark w-full" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-fg-4 text-xs font-medium uppercase tracking-wider">Utilidad COP</label>
                  <input value={form.profit_cop} onChange={set("profit_cop")} type="number" step="0.01" className="input-dark w-full" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-fg-4 text-xs font-medium uppercase tracking-wider">Utilidad %</label>
                  <input value={form.profit_pct} onChange={set("profit_pct")} type="number" step="0.01" className="input-dark w-full" placeholder="30.5" />
                </div>
              </div>
            </section>

            {error && (
              <div className="flex items-start gap-2 bg-red-950/40 border border-red-800/40 px-3 py-2">
                <AlertCircle size={13} className="text-red-400 mt-0.5 flex-shrink-0" />
                <p className="text-red-400 text-xs">{error}</p>
              </div>
            )}
          </div>
        </form>

        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-border flex-shrink-0 bg-surface-3">
          <button type="button" onClick={onClose} className="px-4 py-2 text-xs text-fg-4 border border-border hover:border-border-light transition-all">Cancelar</button>
          <button type="submit" form="edit-item-form" disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent-light text-zinc-900 font-semibold text-xs uppercase tracking-wider transition-all disabled:opacity-60">
            {loading && <Loader2 size={13} className="animate-spin" />}Guardar
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Machine Item Card ─────────────────────────────────────────────────────────

function MachineCard({
  item, expanded, onToggle, onEdit, onRemove, removing, removeLoading,
}: {
  item: MachineOrderItemResponse;
  expanded: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onRemove: () => void;
  removing: boolean;
  removeLoading: boolean;
}) {
  return (
    <div className="bg-surface-2 border border-border overflow-hidden">
      {/* Header row */}
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-surface-3 transition-colors"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-accent font-semibold text-sm">{item.model}</span>
            {item.description && <span className="text-fg-5 text-xs">{item.description}</span>}
            {item.has_matricula && <span className="text-[9px] px-1.5 py-0.5 bg-green-400/10 text-green-400 font-semibold uppercase">Matrícula</span>}
          </div>
          <div className="flex items-center gap-3 mt-0.5 flex-wrap">
            {item.client_name && <span className="text-fg-5 text-xs">{item.client_name}</span>}
            {item.machine_serial && <span className="text-fg-6 text-xs font-mono">{item.machine_serial}</span>}
            {item.invoice_number && <span className="text-fg-6 text-xs font-mono">{item.invoice_number}</span>}
            {item.fob_value_usd != null && <span className="text-fg-4 text-xs font-mono">{fmtUSD(item.fob_value_usd)}</span>}
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {!removing && (
            <>
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => { e.stopPropagation(); onEdit(); }}
                onKeyDown={(e) => e.key === "Enter" && (e.stopPropagation(), onEdit())}
                className="w-7 h-7 flex items-center justify-center text-fg-6 hover:text-fg hover:bg-surface-3 transition-all rounded-sm"
              >
                <Pencil size={12} />
              </span>
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => { e.stopPropagation(); onRemove(); }}
                onKeyDown={(e) => e.key === "Enter" && (e.stopPropagation(), onRemove())}
                className="w-7 h-7 flex items-center justify-center text-fg-6 hover:text-red-400 hover:bg-red-950/20 transition-all rounded-sm"
              >
                <Trash2 size={12} />
              </span>
            </>
          )}
          {expanded ? <ChevronUp size={14} className="text-fg-6" /> : <ChevronDown size={14} className="text-fg-6" />}
        </div>
      </button>

      {/* Remove confirm */}
      {removing && (
        <div className="px-4 py-2 bg-red-950/20 border-t border-red-900/30 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-red-300 text-xs">
            <AlertTriangle size={13} />¿Eliminar {item.model}?
          </div>
          <div className="flex gap-2">
            <button onClick={(e) => { e.stopPropagation(); onRemove(); }} className="px-3 py-1 text-xs text-fg-4 border border-border hover:border-border-light transition-all">Cancelar</button>
            <button disabled={removeLoading} className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-white bg-red-700 hover:bg-red-600 transition-all disabled:opacity-60">
              {removeLoading && <Loader2 size={11} className="animate-spin" />}Eliminar
            </button>
          </div>
        </div>
      )}

      {/* Expanded details */}
      {expanded && (
        <div className="border-t border-border">
          {/* Básico */}
          <div className="px-4 pt-3 pb-3 grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-3">
            <InfoField label="Serie máquina"  value={item.machine_serial}           mono />
            <InfoField label="Serie motor"    value={String(item.engine_serial ?? "")} mono />
            <InfoField label="Llegada COL"    value={fmtDate(item.arrival_date_col)} />
            <InfoField label="# Factura"      value={item.invoice_number} mono />
            <InfoField label="Matrícula"      value={item.has_matricula === true ? "Sí" : item.has_matricula === false ? "No" : null} />
          </div>
          {/* Importación */}
          <div className="px-4 pt-2 pb-3 border-t border-border grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-3">
            <p className="col-span-2 sm:col-span-4 text-[10px] text-fg-6 uppercase tracking-wider font-semibold">Importación</p>
            <InfoField label="Costo CIF"       value={fmtCOP(item.cif_cost)}           mono />
            <InfoField label="Costo DDP"       value={fmtCOP(item.ddp_cost)}           mono />
            <InfoField label="Factor imp."     value={item.import_factor != null ? String(Number(item.import_factor)) : null} mono />
            <InfoField label="TRM nacion."     value={fmtTRM(item.nationalization_trm)} mono />
          </div>
          {/* Ventas */}
          <div className="px-4 pt-2 pb-4 border-t border-border grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-3">
            <p className="col-span-2 sm:col-span-4 text-[10px] text-fg-6 uppercase tracking-wider font-semibold">Ventas</p>
            <InfoField label="Venta s/IVA"    value={fmtCOP(item.sale_value_before_tax)} mono />
            <InfoField label="IVA"            value={fmtCOP(item.sale_iva)}              mono />
            <InfoField label="Total venta"    value={fmtCOP(item.total_sale)}            mono />
            <InfoField label="Utilidad COP"   value={fmtCOP(item.profit_cop)}            mono />
            <InfoField label="Utilidad %"     value={item.profit_pct != null ? `${(Number(item.profit_pct) * 100).toFixed(1)}%` : null} />
          </div>
        </div>
      )}
    </div>
  );
}

// ── Payment Card ──────────────────────────────────────────────────────────────

function PaymentCard({
  payment, machineItems, onRemove, removing, removeLoading,
}: {
  payment: MachineOrderPaymentResponse;
  machineItems: MachineOrderItemResponse[];
  onRemove: () => void;
  removing: boolean;
  removeLoading: boolean;
}) {
  const isAnticipo = payment.payment_type === "anticipo_30pct";
  return (
    <div className="bg-surface-2 border border-border p-4 space-y-2.5">
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-1.5 min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-[10px] px-1.5 py-0.5 font-semibold ${isAnticipo ? "text-yellow-400 bg-yellow-400/10" : "text-blue-400 bg-blue-400/10"}`}>
              {isAnticipo ? "Anticipo 30%" : `Saldo #${payment.installment_number ?? ""}`}
            </span>
            {payment.payment_date && <span className="text-fg-6 text-xs">{fmtDate(payment.payment_date)}</span>}
          </div>
          <div className="flex items-baseline gap-3 flex-wrap">
            {payment.amount_usd != null && (
              <span className="text-fg-2 font-mono text-base font-semibold">{fmtUSD(payment.amount_usd)}</span>
            )}
            {payment.trm != null && (
              <span className="text-fg-6 text-xs">TRM {fmtTRM(payment.trm)}</span>
            )}
          </div>
          {payment.amount_cop != null && (
            <p className="text-fg-4 text-xs font-mono">{fmtCOP(payment.amount_cop)}</p>
          )}
        </div>
        {!removing && (
          <button onClick={onRemove}
            className="w-7 h-7 flex items-center justify-center text-fg-6 hover:text-red-400 hover:bg-red-950/20 transition-all flex-shrink-0">
            <Trash2 size={12} />
          </button>
        )}
      </div>

      {machineItems.length > 0 && (
        <div className="flex flex-wrap gap-1 pt-1 border-t border-border">
          {machineItems.map((it) => (
            <span key={it.id} className="text-[10px] px-1.5 py-0.5 bg-surface-3 text-fg-5 border border-border">
              {it.model}{it.client_name ? ` · ${it.client_name}` : ""}
            </span>
          ))}
        </div>
      )}

      {payment.notes && <p className="text-fg-6 text-xs italic border-t border-border pt-2">{payment.notes}</p>}

      {removing && (
        <div className="flex items-center justify-between gap-3 border-t border-red-900/30 pt-2">
          <div className="flex items-center gap-2 text-red-300 text-xs">
            <AlertTriangle size={13} />¿Eliminar este pago?
          </div>
          <div className="flex gap-2">
            <button onClick={onRemove} className="px-3 py-1 text-xs text-fg-4 border border-border hover:border-border-light transition-all">Cancelar</button>
            <button disabled={removeLoading}
              className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-white bg-red-700 hover:bg-red-600 transition-all disabled:opacity-60">
              {removeLoading && <Loader2 size={11} className="animate-spin" />}Eliminar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Detail Page ──────────────────────────────────────────────────────────

export default function PedidoDetailPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate    = useNavigate();
  const [order,     setOrder]     = useState<MachineOrderDetailResponse | null>(null);
  const [suppliers, setSuppliers] = useState<SupplierResponse[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [showAddItem,    setShowAddItem]    = useState(false);
  const [showAddPayment, setShowAddPayment] = useState(false);
  const [showEditOrder,  setShowEditOrder]  = useState(false);
  const [editingItem,    setEditingItem]    = useState<MachineOrderItemResponse | null>(null);
  const [removingItemId,    setRemovingItemId]    = useState<string | null>(null);
  const [removingPaymentId, setRemovingPaymentId] = useState<string | null>(null);
  const [removeLoading, setRemoveLoading] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});

  const load = useCallback(async () => {
    if (!orderId) return;
    setLoading(true);
    try {
      const [orderData, suppliersData] = await Promise.all([
        api.machineOrders.get(orderId),
        api.suppliers.list(),
      ]);
      setOrder(orderData);
      setSuppliers(suppliersData);
    } finally { setLoading(false); }
  }, [orderId]);

  useEffect(() => { load(); }, [load]);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 size={20} className="animate-spin text-fg-6" />
    </div>
  );

  if (!order) return (
    <div className="text-center py-20 text-fg-6">
      <AlertCircle size={24} className="mx-auto mb-2 opacity-40" />
      <p>Pedido no encontrado</p>
    </div>
  );

  const pt = PAYMENT_LABELS[order.payment_status] ?? { label: order.payment_status, dot: "bg-fg-6" };
  const activeItems    = order.items.filter((i) => i.is_active).sort((a, b) => a.created_at.localeCompare(b.created_at));
  const activePayments = order.payments.filter((p) => p.is_active);
  const totalFOB       = activeItems.reduce((acc, it) => acc + Number(it.fob_value_usd ?? 0), 0);
  const anticipo       = activePayments.find((p) => p.payment_type === "anticipo_30pct");
  const saldoPayments  = activePayments.filter((p) => p.payment_type === "saldo");
  const saldoPaid      = saldoPayments.reduce((acc, p) => acc + Number(p.amount_usd ?? 0), 0);
  const remaining      = totalFOB > 0 ? totalFOB * 0.70 - saldoPaid : null;

  const confirmRemoveItem = async (itemId: string) => {
    setRemoveLoading(true);
    try {
      const updated = await api.machineOrders.removeItem(order.id, itemId);
      setOrder(updated); setRemovingItemId(null);
    } finally { setRemoveLoading(false); }
  };

  const confirmRemovePayment = async (paymentId: string) => {
    setRemoveLoading(true);
    try {
      const updated = await api.machineOrders.removePayment(order.id, paymentId);
      setOrder(updated); setRemovingPaymentId(null);
    } finally { setRemoveLoading(false); }
  };

  return (
    <div className="space-y-4 sm:space-y-5">

      {/* ── Header ── */}
      <div className="flex items-start gap-3 animate-fade-up">
        <button onClick={() => navigate("/comercio-exterior/pedidos")}
          className="mt-1 w-8 h-8 flex items-center justify-center text-fg-5 hover:text-fg hover:bg-surface-3 transition-all flex-shrink-0">
          <ArrowLeft size={16} />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-fg-6 text-xs uppercase tracking-wider mb-0.5">Pedidos de máquinas</p>
          <h1 className="text-fg text-lg sm:text-xl font-semibold font-mono leading-tight">{order.factory_order_number}</h1>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <div className="flex items-center gap-1.5">
              <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${pt.dot}`} />
              <span className="text-fg-5 text-xs">{pt.label}</span>
            </div>
            <span className="text-fg-6 text-xs">· {order.supplier.name} · {order.year ?? "—"}</span>
          </div>
        </div>
        <button onClick={() => setShowEditOrder(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-fg-4 border border-border hover:border-border-light hover:text-fg transition-all flex-shrink-0 mt-1">
          <Pencil size={12} /> Editar
        </button>
      </div>

      {/* ── Info panel ── */}
      <div className="bg-surface-2 border border-border px-4 py-4 animate-fade-up" style={{ animationDelay: "40ms", animationFillMode: "both" }}>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-4">
          <InfoField label="Fecha pedido"   value={fmtDate(order.order_date)} />
          <InfoField label="Factura prov."  value={order.lonking_invoice} mono />
          <InfoField label="# BL"           value={order.bl_number} mono />
          <InfoField label="Fecha BL"       value={fmtDate(order.bl_date)} />
          <InfoField label="Vencimiento"    value={fmtDate(order.due_date)} />
          <InfoField label="Agente carga"   value={order.freight_agent} />
          <InfoField label="Aduana"         value={order.customs_broker} />
          {order.notes && (
            <div className="col-span-2 sm:col-span-3 lg:col-span-4 min-w-0">
              <p className="text-[10px] text-fg-6 uppercase tracking-wider mb-0.5">Notas</p>
              <p className="text-sm text-fg-4">{order.notes}</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Content: Machines + Payments ── */}
      <div className="grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-4 sm:gap-5">

        {/* Machines */}
        <div className="space-y-3 animate-fade-up" style={{ animationDelay: "60ms", animationFillMode: "both" }}>
          <div className="flex items-center justify-between">
            <h2 className="text-fg-3 text-sm font-semibold">
              Máquinas <span className="text-fg-6 font-normal">({activeItems.length})</span>
            </h2>
            <button onClick={() => setShowAddItem(true)}
              className="flex items-center gap-1.5 text-xs text-accent hover:text-accent-light transition-colors">
              <Plus size={13} /> Agregar
            </button>
          </div>

          {activeItems.length === 0 && (
            <div className="bg-surface-2 border border-border py-10 text-center text-fg-6 text-sm">
              <Package size={20} className="mx-auto mb-2 opacity-40" />No hay máquinas
            </div>
          )}

          {activeItems.map((item) => (
            <MachineCard
              key={item.id}
              item={item}
              expanded={!!expandedItems[item.id]}
              onToggle={() => setExpandedItems((p) => ({ ...p, [item.id]: !p[item.id] }))}
              onEdit={() => setEditingItem(item)}
              onRemove={() => {
                if (removingItemId === item.id) confirmRemoveItem(item.id);
                else setRemovingItemId(item.id);
              }}
              removing={removingItemId === item.id}
              removeLoading={removeLoading}
            />
          ))}

          {activeItems.length > 0 && (
            <div className="flex items-center justify-between px-4 py-2.5 bg-surface-3 border border-border">
              <span className="text-fg-5 text-xs uppercase tracking-wider">FOB Total</span>
              <span className="text-fg-2 font-mono font-semibold">{fmtUSD(totalFOB)}</span>
            </div>
          )}
        </div>

        {/* Payments */}
        <div className="space-y-3 animate-fade-up" style={{ animationDelay: "80ms", animationFillMode: "both" }}>
          <div className="flex items-center justify-between">
            <h2 className="text-fg-3 text-sm font-semibold">Pagos</h2>
            <button onClick={() => setShowAddPayment(true)}
              className="flex items-center gap-1.5 text-xs text-accent hover:text-accent-light transition-colors">
              <Plus size={13} /> Registrar
            </button>
          </div>

          {/* Payment summary */}
          {totalFOB > 0 && (
            <div className="bg-surface-2 border border-border p-4 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-fg-5">Anticipo 30%</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-fg-3">{fmtUSD(totalFOB * 0.30)}</span>
                  {anticipo
                    ? <CheckCircle2 size={13} className="text-green-400" />
                    : <Clock size={13} className="text-fg-6" />
                  }
                </div>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-fg-5">Saldo 70% pagado</span>
                <span className="font-mono text-fg-3">
                  {fmtUSD(saldoPaid)}<span className="text-fg-6"> / {fmtUSD(totalFOB * 0.70)}</span>
                </span>
              </div>
              <div className="border-t border-border pt-2.5">
                {remaining !== null && remaining > 0.01 ? (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-yellow-400 font-medium">Deuda restante</span>
                    <span className="font-mono text-yellow-400 font-semibold">{fmtUSD(remaining)}</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-green-400 text-xs">
                    <CheckCircle2 size={13} />Pagado completo
                  </div>
                )}
              </div>
            </div>
          )}

          {activePayments.length === 0 && (
            <div className="bg-surface-2 border border-border py-10 text-center text-fg-6 text-sm">
              <DollarSign size={20} className="mx-auto mb-2 opacity-40" />Sin pagos registrados
            </div>
          )}

          {activePayments.map((payment) => (
            <PaymentCard
              key={payment.id}
              payment={payment}
              machineItems={activeItems.filter((it) => payment.machine_item_ids.includes(it.id))}
              onRemove={() => {
                if (removingPaymentId === payment.id) confirmRemovePayment(payment.id);
                else setRemovingPaymentId(payment.id);
              }}
              removing={removingPaymentId === payment.id}
              removeLoading={removeLoading}
            />
          ))}
        </div>
      </div>

      {showAddItem    && <AddItemModal    orderId={order.id} onClose={() => setShowAddItem(false)}    onSaved={(o) => { setOrder(o); setShowAddItem(false); }} />}
      {showAddPayment && <AddPaymentModal order={order}      onClose={() => setShowAddPayment(false)} onSaved={(o) => { setOrder(o); setShowAddPayment(false); }} />}
      {showEditOrder  && <EditOrderModal  order={order} suppliers={suppliers} onClose={() => setShowEditOrder(false)} onSaved={(o) => { setOrder(o); setShowEditOrder(false); }} />}
      {editingItem    && <EditItemModal   orderId={order.id} item={editingItem} onClose={() => setEditingItem(null)} onSaved={() => { setEditingItem(null); load(); }} />}
    </div>
  );
}
