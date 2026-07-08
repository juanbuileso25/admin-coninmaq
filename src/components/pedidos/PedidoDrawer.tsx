import { useState } from "react";
import { X, Plus, Trash2, Loader2, AlertCircle, Package } from "lucide-react";
import { api, type SupplierResponse } from "../../services/api";
import DatePicker from "../ui/DatePicker";
import Select from "../ui/Select";

type ItemForm = {
  model: string;
  description: string;
  machine_serial: string;
  engine_serial: string;
  client_name: string;
  invoice_number: string;
  fob_value_usd: string;
};

const emptyItem = (): ItemForm => ({
  model: "", description: "", machine_serial: "",
  engine_serial: "", client_name: "", invoice_number: "", fob_value_usd: "",
});

type Props = {
  suppliers: SupplierResponse[];
  onClose:  () => void;
  onSaved:  () => void;
};

const LONKING_ID = "00000000-0000-0000-0000-000000004c4b";

const STATUS_OPTIONS = [
  { value: "pendiente",     label: "Pendiente"     },
  { value: "en_transito",   label: "En tránsito"   },
  { value: "llegado",       label: "Llegado"       },
  { value: "nacionalizado", label: "Nacionalizado" },
  { value: "cerrado",       label: "Cerrado"       },
];

export default function PedidoDrawer({ suppliers, onClose, onSaved }: Props) {
  const [form, setForm] = useState({
    supplier_id:          LONKING_ID,
    factory_order_number: "",
    order_date:           "",
    bl_number:            "",
    bl_date:              "",
    due_date:             "",
    lonking_invoice:      "",
    year:                 String(new Date().getFullYear()),
    status:               "pendiente",
    freight_agent:        "",
    customs_broker:       "",
    notes:                "",
  });
  const [items,   setItems]   = useState<ItemForm[]>([emptyItem()]);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  const setF = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((p) => ({ ...p, [k]: e.target.value }));
  const setVal = (k: string) => (v: string | null) =>
    setForm((p) => ({ ...p, [k]: v ?? "" }));

  const setItem = (idx: number, k: keyof ItemForm) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setItems((prev) => prev.map((it, i) => i === idx ? { ...it, [k]: e.target.value } : it));

  const addItem    = () => setItems((p) => [...p, emptyItem()]);
  const removeItem = (idx: number) => setItems((p) => p.filter((_, i) => i !== idx));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!form.supplier_id) { setError("Selecciona un proveedor"); return; }
    if (!form.factory_order_number) { setError("El número de pedido es obligatorio"); return; }
    if (items.some((it) => !it.model)) { setError("Todos los ítems deben tener modelo"); return; }

    setLoading(true);
    try {
      await api.machineOrders.create({
        supplier_id:          form.supplier_id,
        factory_order_number: form.factory_order_number,
        order_date:           form.order_date    || null,
        bl_number:            form.bl_number     || null,
        bl_date:              form.bl_date       || null,
        due_date:             form.due_date      || null,
        lonking_invoice:      form.lonking_invoice || null,
        year:                 form.year ? Number(form.year) : null,
        status:               form.status,
        freight_agent:        form.freight_agent  || null,
        customs_broker:       form.customs_broker || null,
        notes:                form.notes          || null,
        items: items.map((it) => ({
          model:          it.model,
          description:    it.description    || null,
          machine_serial: it.machine_serial || null,
          engine_serial:  it.engine_serial  || null,
          client_name:    it.client_name    || null,
          invoice_number: it.invoice_number || null,
          fob_value_usd:  it.fob_value_usd  ? Number(it.fob_value_usd) : null,
        })),
      });
      onSaved();
    } catch (err: unknown) {
      const e = err as { detail?: string };
      setError(e?.detail ?? "Ocurrió un error. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-full max-w-2xl bg-surface-2 border-l border-border flex flex-col h-full shadow-card animate-fade-up overflow-hidden">
        {/* Top accent */}
        <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-accent to-transparent flex-shrink-0" />

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
          <div>
            <h2 className="text-fg text-base font-semibold">Nuevo pedido</h2>
            <p className="text-fg-6 text-xs mt-0.5">Completa la información del pedido de fábrica</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center text-fg-5 hover:text-fg hover:bg-surface-3 transition-all">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <form id="pedido-form" onSubmit={handleSubmit} noValidate className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-6">

            {/* Pedido info */}
            <section className="space-y-4">
              <h3 className="text-fg-4 text-xs font-semibold uppercase tracking-wider border-b border-border pb-2">Información del pedido</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 space-y-1.5">
                  <label className="text-fg-4 text-xs font-medium uppercase tracking-wider">Proveedor *</label>
                  <Select
                    value={form.supplier_id}
                    onChange={setVal("supplier_id")}
                    options={suppliers.map((s) => ({ value: s.id, label: s.name }))}
                    placeholder="Seleccionar proveedor..."
                  />
                </div>
                <div className="col-span-2 space-y-1.5">
                  <label className="text-fg-4 text-xs font-medium uppercase tracking-wider"># Pedido fábrica *</label>
                  <input value={form.factory_order_number} onChange={setF("factory_order_number")} required className="input-dark w-full" placeholder="ej. SC2024-03823" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-fg-4 text-xs font-medium uppercase tracking-wider">Año</label>
                  <input value={form.year} onChange={setF("year")} type="number" className="input-dark w-full" placeholder="2025" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-fg-4 text-xs font-medium uppercase tracking-wider">Estado</label>
                  <Select value={form.status} onChange={setVal("status")} options={STATUS_OPTIONS} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-fg-4 text-xs font-medium uppercase tracking-wider">Fecha pedido</label>
                  <DatePicker value={form.order_date || null} onChange={setVal("order_date")} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-fg-4 text-xs font-medium uppercase tracking-wider">Factura proveedor</label>
                  <input value={form.lonking_invoice} onChange={setF("lonking_invoice")} className="input-dark w-full" placeholder="CV2025-0157" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-fg-4 text-xs font-medium uppercase tracking-wider"># BL</label>
                  <input value={form.bl_number} onChange={setF("bl_number")} className="input-dark w-full" placeholder="SZSD25011293" />
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
                  <input value={form.freight_agent} onChange={setF("freight_agent")} className="input-dark w-full" placeholder="WORLD CARGO" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-fg-4 text-xs font-medium uppercase tracking-wider">Aduana</label>
                  <input value={form.customs_broker} onChange={setF("customs_broker")} className="input-dark w-full" />
                </div>
                <div className="col-span-2 space-y-1.5">
                  <label className="text-fg-4 text-xs font-medium uppercase tracking-wider">Notas</label>
                  <textarea value={form.notes} onChange={setF("notes")} rows={2} className="input-dark w-full resize-none" placeholder="Observaciones..." />
                </div>
              </div>
            </section>

            {/* Items / Machines */}
            <section className="space-y-4">
              <div className="flex items-center justify-between border-b border-border pb-2">
                <h3 className="text-fg-4 text-xs font-semibold uppercase tracking-wider">Máquinas</h3>
                <button type="button" onClick={addItem}
                  className="flex items-center gap-1.5 text-xs text-accent hover:text-accent-light transition-colors">
                  <Plus size={13} /> Agregar máquina
                </button>
              </div>

              {items.map((item, idx) => (
                <div key={idx} className="bg-surface-3 border border-border p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Package size={13} className="text-accent" />
                      <span className="text-fg-4 text-xs font-semibold uppercase tracking-wider">Máquina {idx + 1}</span>
                    </div>
                    {items.length > 1 && (
                      <button type="button" onClick={() => removeItem(idx)}
                        className="w-6 h-6 flex items-center justify-center text-fg-6 hover:text-red-400 hover:bg-red-950/20 transition-all">
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2 space-y-1.5">
                      <label className="text-fg-5 text-[11px] font-medium uppercase tracking-wider">Modelo *</label>
                      <input value={item.model} onChange={setItem(idx, "model")} required className="input-dark w-full" placeholder="CDM856" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-fg-5 text-[11px] font-medium uppercase tracking-wider">Descripción</label>
                      <input value={item.description} onChange={setItem(idx, "description")} className="input-dark w-full" placeholder="CARGADOR FRONTAL" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-fg-5 text-[11px] font-medium uppercase tracking-wider">FOB (USD)</label>
                      <input value={item.fob_value_usd} onChange={setItem(idx, "fob_value_usd")} type="number" step="0.01" className="input-dark w-full" placeholder="40000" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-fg-5 text-[11px] font-medium uppercase tracking-wider">Serie máquina</label>
                      <input value={item.machine_serial} onChange={setItem(idx, "machine_serial")} className="input-dark w-full" placeholder="LSH0856..." />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-fg-5 text-[11px] font-medium uppercase tracking-wider">Serie motor</label>
                      <input value={item.engine_serial} onChange={setItem(idx, "engine_serial")} className="input-dark w-full" placeholder="7524L..." />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-fg-5 text-[11px] font-medium uppercase tracking-wider">Cliente</label>
                      <input value={item.client_name} onChange={setItem(idx, "client_name")} className="input-dark w-full" placeholder="Nombre del cliente" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-fg-5 text-[11px] font-medium uppercase tracking-wider"># Factura</label>
                      <input value={item.invoice_number} onChange={setItem(idx, "invoice_number")} className="input-dark w-full" placeholder="FE4736" />
                    </div>
                  </div>
                </div>
              ))}
            </section>

            {error && (
              <div className="flex items-start gap-2.5 bg-red-950/40 border border-red-800/40 px-3 py-2.5">
                <AlertCircle size={13} className="text-red-400 mt-0.5 flex-shrink-0" />
                <p className="text-red-400 text-xs">{error}</p>
              </div>
            )}
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border flex-shrink-0 bg-surface-3">
          <button type="button" onClick={onClose}
            className="px-4 py-2 text-xs text-fg-4 border border-border hover:border-border-light transition-all">
            Cancelar
          </button>
          <button type="submit" form="pedido-form" disabled={loading}
            className="flex items-center gap-2 px-5 py-2 bg-accent hover:bg-accent-light text-zinc-900
                       font-semibold text-xs uppercase tracking-wider transition-all hover:shadow-glow disabled:opacity-60">
            {loading && <Loader2 size={13} className="animate-spin" />}
            Crear pedido
          </button>
        </div>
      </div>
    </div>
  );
}
