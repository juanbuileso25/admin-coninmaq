import { useState } from "react";
import { X, Loader2, FileDown } from "lucide-react";
import { type MachineInfoResponse } from "../../services/api";
import { generateCartaTraslado } from "../../utils/cartaTraslado";

interface Props {
  machine: MachineInfoResponse;
  onClose: () => void;
}

export default function CartaTrasladoModal({ machine, onClose }: Props) {
  const [desde,   setDesde]   = useState("");
  const [hasta,   setHasta]   = useState("");
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    if (!desde.trim() || !hasta.trim()) return;
    setLoading(true);
    try {
      await generateCartaTraslado(machine, desde.trim(), hasta.trim());
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleGenerate();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />

      <div className="relative w-full max-w-sm bg-surface-2 border border-border p-6 shadow-xl">
        {/* Header */}
        <div className="flex items-start justify-between mb-5">
          <div>
            <h3 className="text-fg font-semibold text-sm">Carta de traslado</h3>
            <p className="text-fg-5 text-xs mt-0.5">
              {machine.plate} — {machine.brand} {machine.model}
            </p>
          </div>
          <button onClick={onClose} className="text-fg-5 hover:text-fg p-1 ml-4 flex-shrink-0">
            <X size={16} />
          </button>
        </div>

        {/* Campos */}
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-fg-4 mb-1.5">Desde</label>
            <input
              className="w-full bg-surface-3 border border-border text-fg px-3.5 py-2.5 text-sm placeholder:text-fg-6 focus:outline-none focus:border-accent/60"
              placeholder="ej. Caldas, Antioquia"
              value={desde}
              onChange={(e) => setDesde(e.target.value)}
              onKeyDown={handleKey}
              autoFocus
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-fg-4 mb-1.5">Hasta</label>
            <input
              className="w-full bg-surface-3 border border-border text-fg px-3.5 py-2.5 text-sm placeholder:text-fg-6 focus:outline-none focus:border-accent/60"
              placeholder="ej. Vegachí, Antioquia"
              value={hasta}
              onChange={(e) => setHasta(e.target.value)}
              onKeyDown={handleKey}
            />
          </div>
        </div>

        {/* Botones */}
        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 text-sm text-fg-4 border border-border hover:bg-surface-3 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleGenerate}
            disabled={!desde.trim() || !hasta.trim() || loading}
            className="flex-1 py-2.5 text-sm bg-accent text-black font-semibold hover:bg-accent/90 disabled:opacity-60 flex items-center justify-center gap-2 transition-colors"
          >
            {loading
              ? <Loader2 size={14} className="animate-spin" />
              : <FileDown size={14} />
            }
            {loading ? "Generando..." : "Generar PDF"}
          </button>
        </div>
      </div>
    </div>
  );
}
