import { AlertCircle, Trophy, Target, Star, Hourglass } from "lucide-react";

export default function DashboardVendedoresTab({ showDevNotes = false }: { showDevNotes?: boolean }) {
  if (!showDevNotes) {
    // Vista para usuarios finales: solo mensaje "Próximamente"
    return (
      <div className="animate-fade-up flex flex-col items-center justify-center text-center py-20 bg-surface-2 border border-border">
        <div className="w-14 h-14 bg-accent/10 border border-accent/30 flex items-center justify-center mb-4">
          <Hourglass size={22} className="text-accent" />
        </div>
        <h3 className="text-fg text-lg font-semibold mb-1">Desempeño por vendedor</h3>
        <p className="text-fg-5 text-sm max-w-md">
          Próximamente podrás ver aquí el ranking de vendedores, metas, CSAT y valor facturado por cada asesor.
        </p>
      </div>
    );
  }

  // Vista dev: banner + preview visual
  return (
    <div className="space-y-4 animate-fade-up">
      <div className="bg-amber-500/5 border border-amber-500/30 p-4 flex items-start gap-3">
        <AlertCircle size={16} className="text-amber-400 shrink-0 mt-0.5" />
        <div className="text-xs text-amber-200/90">
          <div className="font-semibold mb-1">Datos de vendedores pendientes</div>
          <p className="text-amber-200/70 leading-relaxed">
            Esta sección requiere datos que aún no se capturan en la BD:
          </p>
          <ul className="list-disc list-inside mt-2 space-y-0.5 text-amber-200/80">
            <li>Asignación formal <strong>lead → asesor</strong> (ya existe <code className="bg-amber-900/40 px-1">advisor_id</code> en leads, falta uso consistente)</li>
            <li>Meta mensual por asesor → tabla nueva <code className="bg-amber-900/40 px-1">advisor_targets</code></li>
            <li>CSAT ligado al asesor que atendió → añadir <code className="bg-amber-900/40 px-1">advisor_id</code> a <code className="bg-amber-900/40 px-1">customer_reviews</code></li>
            <li>Avatar en <code className="bg-amber-900/40 px-1">users.avatar_url</code></li>
            <li>Sede del asesor (opcional) → columna <code className="bg-amber-900/40 px-1">sede</code> en users</li>
          </ul>
        </div>
      </div>

      {/* Placeholder visual de la vista futura */}
      <div className="bg-surface-2 border border-border p-5">
        <h3 className="text-accent text-xs uppercase tracking-wider font-bold mb-4">▸ Preview de la vista futura</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[1, 2, 3].map(rank => (
            <div key={rank} className="bg-surface-3/60 border border-border/60 p-4 relative overflow-hidden opacity-60">
              <div className="absolute top-2 right-2 bg-accent/20 text-accent text-[10px] px-2 py-0.5 flex items-center gap-1 font-bold">
                <Trophy size={10} /> Ranking #{rank}
              </div>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-full bg-surface-4 border border-accent/40 flex items-center justify-center text-fg-5 text-xs font-bold">
                  ??
                </div>
                <div>
                  <div className="text-fg-3 text-sm font-semibold">Asesor {rank}</div>
                  <div className="text-fg-6 text-[10px]">Sede Medellín</div>
                </div>
              </div>
              <div className="mb-3">
                <div className="flex items-center justify-between text-[10px] text-fg-5 mb-1">
                  <span className="uppercase tracking-wider flex items-center gap-1"><Target size={10} /> Meta alcanzada</span>
                  <span className="text-fg-3">—%</span>
                </div>
                <div className="h-1.5 bg-surface-4"><div className="h-full w-0 bg-accent/40"></div></div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-surface-4/60 p-2 border border-border/50">
                  <div className="text-fg-6 text-[9px] uppercase">Leads</div>
                  <div className="text-fg-3 text-lg font-bold">—</div>
                </div>
                <div className="bg-surface-4/60 p-2 border border-border/50">
                  <div className="text-fg-6 text-[9px] uppercase">Cotizaciones</div>
                  <div className="text-fg-3 text-lg font-bold">—</div>
                </div>
                <div className="bg-surface-4/60 p-2 border border-border/50">
                  <div className="text-fg-6 text-[9px] uppercase">Ventas</div>
                  <div className="text-fg-3 text-lg font-bold">—</div>
                </div>
                <div className="bg-surface-4/60 p-2 border border-border/50">
                  <div className="text-fg-6 text-[9px] uppercase">Facturado</div>
                  <div className="text-fg-3 text-sm font-bold">—</div>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-border/50 flex items-center justify-between">
                <span className="text-fg-6 text-[10px] uppercase">CSAT</span>
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map(s => <Star key={s} size={11} className="text-fg-6" />)}
                  <span className="text-fg-6 text-xs ml-1">—/5</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
