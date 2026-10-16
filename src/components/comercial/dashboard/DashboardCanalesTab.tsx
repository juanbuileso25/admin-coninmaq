import { Radio, Trophy, AlertCircle } from "lucide-react";
import type { DashboardMetrics } from "../../../services/api";

export default function DashboardCanalesTab({ metrics, showDevNotes = false }: { metrics: DashboardMetrics; showDevNotes?: boolean }) {
  const sources = metrics.sources_distribution;

  return (
    <div className="space-y-4 animate-fade-up">
      {/* Alerta: catálogo de canales pendiente (solo dev) */}
      {showDevNotes && (
      <div className="bg-amber-500/5 border border-amber-500/30 p-4 flex items-start gap-3">
        <AlertCircle size={16} className="text-amber-400 shrink-0 mt-0.5" />
        <div className="text-xs text-amber-200/90">
          <div className="font-semibold mb-1">Catálogo de canales en construcción</div>
          <p className="text-amber-200/70 leading-relaxed">
            Los canales mostrados vienen del campo <code className="bg-amber-900/40 px-1">lead_source</code> de cada lead,
            que hoy no está estandarizado. Para ver <strong>WhatsApp, Redes sociales, Google Ads, Referidos, Ferias,
            Oficina presencial y Licitaciones</strong> con conversión mensual, necesitamos:
          </p>
          <ul className="list-disc list-inside mt-2 space-y-0.5 text-amber-200/80">
            <li>Catálogo cerrado de canales + migración de valores existentes</li>
            <li>Captura obligatoria del canal al crear un lead</li>
            <li>Taggeo retroactivo (opcional) de los leads actuales</li>
          </ul>
        </div>
      </div>
      )}

      {/* Tabla resumen (lo que se puede mostrar hoy) */}
      <div className="bg-surface-2 border border-border p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-accent text-xs uppercase tracking-wider font-bold">▸ Resultados por canal</h3>
            <p className="text-fg-6 text-[10px] mt-0.5">Acumulado del período</p>
          </div>
          <Radio size={14} className="text-fg-5" />
        </div>

        {sources.length === 0 ? (
          <div className="text-center py-10 text-fg-6 text-xs">Sin datos en el período</div>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border text-fg-6 text-[9px] uppercase tracking-wider">
                <th className="text-left py-2 font-medium">Canal</th>
                <th className="text-right py-2 font-medium">Leads</th>
                <th className="text-right py-2 font-medium">% del total</th>
                <th className="text-left py-2 font-medium pl-6"></th>
              </tr>
            </thead>
            <tbody>
              {sources.map(s => (
                <tr key={s.label} className="border-b border-border/50 hover:bg-surface-3 transition-colors">
                  <td className="py-2 text-fg-2">{s.label}</td>
                  <td className="py-2 text-right text-fg-2 font-bold">{s.count}</td>
                  <td className="py-2 text-right text-accent font-bold">{s.pct}%</td>
                  <td className="py-2 pl-6">
                    <div className="h-2 bg-surface-3 relative">
                      <div style={{ width: `${s.pct}%` }} className="h-full bg-accent" />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Top */}
      {sources.length > 0 && (
        <div className="bg-surface-2 border border-border p-4">
          <div className="flex items-center gap-2 mb-3">
            <Trophy size={14} className="text-accent" />
            <h3 className="text-accent text-xs uppercase tracking-wider font-bold">Canal top del período</h3>
          </div>
          <div className="flex items-baseline gap-3">
            <span className="text-fg text-3xl font-extrabold">{sources[0].label}</span>
            <span className="text-accent text-lg font-bold">{sources[0].count} leads</span>
            <span className="text-fg-5 text-sm">· {sources[0].pct}% del total</span>
          </div>
        </div>
      )}

      {/* Faltante para hoja 2 completa (solo dev) */}
      {showDevNotes && (
      <div className="bg-surface-3/40 border border-dashed border-border p-4 text-fg-6 text-xs">
        <div className="font-semibold text-fg-5 mb-1">Pendiente para Hoja Canales completa:</div>
        <ul className="list-disc list-inside space-y-0.5">
          <li>Tasas de conversión por canal (requiere canal estandarizado)</li>
          <li>Gráfico mensual de tasas (barras agrupadas)</li>
          <li>Gráfico mensual de valor cotizado vs cerrado por canal</li>
          <li>Lectura rápida: mejor % cotización, mejor % cierre, mayor valor, peor %</li>
          <li>Filtro por canal específico</li>
        </ul>
      </div>
      )}
    </div>
  );
}
