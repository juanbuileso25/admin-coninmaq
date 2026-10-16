import { useEffect, useState } from "react";
import { Loader2, Plus, Trash2, Save } from "lucide-react";
import { api, type RentalConditionsTemplate } from "../../services/api";
import { toast } from "sonner";

type Section = "alquiler" | "entrega" | "credito";
const SECTIONS: Array<{ key: Section; label: string; help: string }> = [
  { key: "alquiler", label: "Condiciones del alquiler",   help: "7 numerales por defecto (forma de pago, mantenimiento, exclusiones, llantas, etc.)" },
  { key: "entrega",  label: "Condiciones de la entrega",  help: "Stand by, transporte, seguro, reajuste anual, etc." },
  { key: "credito",  label: "Requisitos apertura de crédito", help: "Documentos para apertura de crédito del cliente." },
];

export default function CondicionesCotizacionRentaPage() {
  const [tpl, setTpl] = useState<RentalConditionsTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const data = await api.rental.getQuotationConditionsTemplate();
      setTpl(data);
    } catch {
      toast.error("Error al cargar la plantilla");
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  function updateItem(section: Section, idx: number, value: string) {
    setTpl(prev => prev ? { ...prev, [section]: prev[section].map((v, i) => i === idx ? value : v) } : prev);
  }
  function addItem(section: Section) {
    setTpl(prev => prev ? { ...prev, [section]: [...prev[section], ""] } : prev);
  }
  function removeItem(section: Section, idx: number) {
    setTpl(prev => prev ? { ...prev, [section]: prev[section].filter((_, i) => i !== idx) } : prev);
  }

  async function handleSave() {
    if (!tpl) return;
    setSaving(true);
    try {
      await api.rental.updateQuotationConditionsTemplate({
        alquiler: tpl.alquiler.filter(x => x.trim()),
        entrega: tpl.entrega.filter(x => x.trim()),
        credito: tpl.credito.filter(x => x.trim()),
      });
      toast.success("Plantilla actualizada");
      load();
    } catch {
      toast.error("No se pudo guardar");
    } finally { setSaving(false); }
  }

  if (loading || !tpl) {
    return <div className="flex items-center justify-center h-64">
      <Loader2 size={18} className="animate-spin text-accent" />
    </div>;
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4 animate-fade-up">
        <div>
          <p className="text-fg-6 text-xs uppercase tracking-wider mb-1">Ajustes</p>
          <h1 className="text-fg text-xl font-semibold">Condiciones · Cotización de renta</h1>
          <p className="text-fg-5 text-xs mt-1">
            Esta plantilla se precarga automáticamente al crear una nueva cotización. Al editarla, los cambios aplican
            a las próximas cotizaciones (las ya enviadas conservan sus condiciones originales).
          </p>
        </div>
        <button onClick={handleSave} disabled={saving}
          className="flex items-center gap-2 bg-accent hover:bg-accent-light text-zinc-900 font-semibold text-xs uppercase tracking-wider px-4 py-2.5 transition-all hover:shadow-glow disabled:opacity-40">
          {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
          Guardar cambios
        </button>
      </div>

      {SECTIONS.map(s => (
        <div key={s.key} className="bg-surface-2 border border-border animate-fade-up">
          <div className="px-4 py-3 border-b border-border">
            <h2 className="text-fg text-sm font-semibold">{s.label}</h2>
            <p className="text-fg-6 text-[11px] mt-0.5">{s.help}</p>
          </div>
          <div className="p-4 space-y-2">
            {tpl[s.key].map((v, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="text-accent text-xs font-mono bg-surface-3 border border-border px-2 py-2 min-w-[32px] text-center">
                  {(i + 1).toString().padStart(2, "0")}
                </span>
                <textarea value={v} onChange={e => updateItem(s.key, i, e.target.value)} rows={2}
                  className="flex-1 bg-surface-3 border border-border px-3 py-2 text-xs text-fg-2 outline-none focus:border-accent resize-none" />
                <button onClick={() => removeItem(s.key, i)} className="text-fg-5 hover:text-red-400 p-2">
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
            <button onClick={() => addItem(s.key)}
              className="w-full flex items-center justify-center gap-1 text-xs text-fg-5 hover:text-accent border border-dashed border-border py-2 transition-colors">
              <Plus size={12} /> Añadir condición
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
