import { useState } from "react";
import { Ghost, Loader2 } from "lucide-react";
import { api } from "../../services/api";
import { toast } from "sonner";

interface Props {
  quotationId: string;
  onClose: () => void;
  onDone: () => void;
}

const PRESETS = [
  "Se fue a competencia",
  "Precio muy alto",
  "Timing no era el adecuado",
  "No respondió / se enfrió",
  "Proyecto cancelado",
];

export default function LostQuotationModal({ quotationId, onClose, onDone }: Props) {
  const [reason, setReason] = useState("");
  const [preset, setPreset] = useState<string>("");
  const [busy, setBusy] = useState(false);

  async function go() {
    setBusy(true);
    const finalReason = reason.trim() || preset || undefined;
    try {
      await api.rental.loseQuotation(quotationId, finalReason);
      toast.success("Cotización marcada como perdida");
      onDone();
    } catch (e: any) {
      toast.error(e?.detail ?? "Error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-surface-2 border border-border w-full max-w-md shadow-2xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Ghost size={16} className="text-rose-400" />
          <h3 className="text-fg font-semibold text-sm">Marcar como perdida</h3>
        </div>
        <p className="text-fg-5 text-xs">
          Usa esta opción cuando la cotización se perdió <strong>sin que el cliente la rechazara formalmente</strong>:
          no respondió, se fue a competencia, timing o precio.
        </p>
        <div>
          <label className="text-[10px] uppercase tracking-wider text-fg-5 font-medium block mb-1.5">
            Motivo rápido
          </label>
          <div className="flex flex-wrap gap-1.5">
            {PRESETS.map(p => (
              <button key={p} onClick={() => { setPreset(p); setReason(""); }}
                className={`text-[11px] px-2 py-1 border transition-colors
                  ${preset === p ? "bg-rose-500/20 border-rose-500/50 text-rose-200" : "bg-surface-3 border-border text-fg-4 hover:border-rose-500/40"}`}>
                {p}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-[10px] uppercase tracking-wider text-fg-5 font-medium block mb-1">
            O escribe el motivo (opcional)
          </label>
          <textarea rows={2} value={reason} onChange={e => { setReason(e.target.value); setPreset(""); }}
            placeholder="Detalles adicionales..."
            className="w-full bg-surface-3 border border-border px-2 py-2 text-xs text-fg-2 outline-none focus:border-accent resize-none" />
        </div>
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-xs text-fg-4 border border-border">Cancelar</button>
          <button onClick={go} disabled={busy}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white disabled:opacity-40">
            {busy ? <Loader2 size={11} className="animate-spin" /> : <Ghost size={11} />}
            Confirmar pérdida
          </button>
        </div>
      </div>
    </div>
  );
}
