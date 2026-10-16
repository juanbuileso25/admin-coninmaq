import { MapPin, AlertCircle } from "lucide-react";
import type { DashboardMetrics } from "../../../services/api";

export default function DashboardCiudadesTab({ metrics, showDevNotes = false }: { metrics: DashboardMetrics; showDevNotes?: boolean }) {
  const cities = metrics.cities_distribution;

  return (
    <div className="space-y-4 animate-fade-up">
      {showDevNotes && (
      <div className="bg-amber-500/5 border border-amber-500/30 p-4 flex items-start gap-3">
        <AlertCircle size={16} className="text-amber-400 shrink-0 mt-0.5" />
        <div className="text-xs text-amber-200/90">
          <div className="font-semibold mb-1">Captura de ciudad del lead pendiente</div>
          <p className="text-amber-200/70 leading-relaxed">
            La tabla <code className="bg-amber-900/40 px-1">bot_leads</code> no guarda ciudad del lead.
            La tabla <code className="bg-amber-900/40 px-1">clients</code> sí tiene <code className="bg-amber-900/40 px-1">city_id</code>,
            pero no todos los leads terminan en cliente. Para habilitar esta vista necesitamos:
          </p>
          <ul className="list-disc list-inside mt-2 space-y-0.5 text-amber-200/80">
            <li>Añadir <code className="bg-amber-900/40 px-1">city_id</code> opcional a <code className="bg-amber-900/40 px-1">bot_leads</code></li>
            <li>Capturar ciudad en la conversación del bot (ya existe locaciones)</li>
            <li>Backfill opcional: para leads convertidos en cliente, heredar ciudad</li>
          </ul>
        </div>
      </div>
      )}

      {cities.length > 0 ? (
        <div className="bg-surface-2 border border-border p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-accent text-xs uppercase tracking-wider font-bold">▸ Resultados por ciudad</h3>
            <MapPin size={14} className="text-fg-5" />
          </div>
          <div className="space-y-2">
            {cities.map((c, i) => (
              <div key={c.label} className="grid grid-cols-[20px_1fr_2fr_60px_60px] gap-2 items-center text-xs">
                <div className="text-fg-6">{i + 1}</div>
                <div className="text-fg-2">{c.label}</div>
                <div className="h-2 bg-surface-3 relative">
                  <div style={{ width: `${c.pct}%` }} className="h-full bg-accent" />
                </div>
                <div className="text-right text-fg-2 font-bold">{c.pct}%</div>
                <div className="text-right text-fg-5 text-[10px]">{c.count} leads</div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-surface-3/40 border border-dashed border-border p-10 text-center text-fg-6 text-sm">
          Sin datos de ciudad disponibles aún.
        </div>
      )}

      {showDevNotes && (
      <div className="bg-surface-3/40 border border-dashed border-border p-4 text-fg-6 text-xs">
        <div className="font-semibold text-fg-5 mb-1">Pendiente para Hoja Ciudades completa:</div>
        <ul className="list-disc list-inside space-y-0.5">
          <li>Tabla con tasas de conversión y valor cerrado por ciudad</li>
          <li>Gráficos mensuales de tasas y valor por ciudad</li>
          <li>Lectura rápida y filtro por ciudad</li>
        </ul>
      </div>
      )}
    </div>
  );
}
