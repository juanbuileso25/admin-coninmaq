import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { api, type BotLeadResponse, type LeadScoreDetail } from "../../services/api";

function TierBadge({ tier, large }: { tier?: string | null; large?: boolean }) {
  if (!tier) return <span className="text-fg-6">Sin datos</span>;
  const styles = ({
    A:      "bg-green-500/15 text-green-400 border-green-500/30",
    B:      "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
    no_fit: "bg-red-500/15 text-red-400 border-red-500/30",
  } as Record<string, string>)[tier] ?? "bg-surface-3 text-fg-5 border-border";
  const label = tier === "no_fit" ? "No Fit" : `Tier ${tier}`;
  return (
    <span className={`border rounded-sm font-bold ${large ? "px-4 py-2 text-lg" : "px-2 py-0.5 text-[11px]"} ${styles}`}>
      {label}
    </span>
  );
}

export default function LeadScorePage() {
  const { leadId } = useParams<{ leadId: string }>();
  const navigate = useNavigate();
  const [lead, setLead] = useState<BotLeadResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!leadId) return;
    api.bot.leadScore(Number(leadId))
      .then(setLead)
      .catch(() => null)
      .finally(() => setLoading(false));
  }, [leadId]);

  const score = lead?.score;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-fg-5 hover:text-fg transition-colors flex-shrink-0">
          <ArrowLeft size={18} />
        </button>
        <div className="min-w-0">
          <h1 className="text-fg font-bold text-xl">Calificación ICP</h1>
          <p className="text-fg-5 text-sm truncate">
            {lead?.name ?? "..."}{lead?.company ? ` — ${lead.company}` : ""}
          </p>
        </div>
      </div>

      {loading && <p className="text-fg-5 text-sm">Cargando...</p>}

      {!loading && !score && (
        <div className="bg-surface-2 border border-border p-5 text-fg-5 text-sm">
          Este lead aún no tiene calificación. Se genera automáticamente al recomendar un equipo.
        </div>
      )}

      {!loading && score && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">

          {/* Columna izquierda — resumen */}
          <div className="space-y-3">
            {/* Score card */}
            <div className="bg-surface-2 border border-border p-5">
              <div className="text-fg-5 text-xs uppercase tracking-wider mb-3">Score final</div>
              <div className="flex items-end justify-between gap-3">
                <div>
                  <span className="text-5xl font-bold text-fg">{score.final_score}</span>
                  <span className="text-fg-5 text-lg ml-1">/ 20</span>
                </div>
                <TierBadge tier={score.tier_final} large />
              </div>
              {score.raw_score !== score.final_score && (
                <div className="text-xs text-fg-5 mt-3 pt-3 border-t border-border">
                  Score bruto: <span className="font-mono">{score.raw_score} pts</span> · multiplicador ×0.8 aplicado por forma de pago
                </div>
              )}
            </div>

            {/* Umbrales */}
            <div className="bg-surface-2 border border-border divide-y divide-border">
              <div className="px-4 py-3 flex justify-between items-center">
                <span className="text-fg-5 text-sm">Tier A desde</span>
                <span className="text-fg font-mono font-bold">{score.tier_a_threshold} pts</span>
              </div>
              <div className="px-4 py-3 flex justify-between items-center">
                <span className="text-fg-5 text-sm">Tier B desde</span>
                <span className="text-fg font-mono font-bold">{score.tier_b_threshold} pts</span>
              </div>
            </div>

            {/* Info lead */}
            <div className="bg-surface-2 border border-border divide-y divide-border text-sm">
              {lead?.phone_number && (
                <div className="px-4 py-3 flex justify-between gap-2">
                  <span className="text-fg-5">Teléfono</span>
                  <span className="text-fg font-mono text-xs">{lead.phone_number}</span>
                </div>
              )}
              {lead?.email && (
                <div className="px-4 py-3 flex justify-between gap-2">
                  <span className="text-fg-5">Email</span>
                  <span className="text-fg text-xs truncate">{lead.email}</span>
                </div>
              )}
              {lead?.industry && (
                <div className="px-4 py-3 flex justify-between gap-2">
                  <span className="text-fg-5">Industria</span>
                  <span className="text-fg">{lead.industry}</span>
                </div>
              )}
              {lead?.equipment_interest && (
                <div className="px-4 py-3 flex justify-between gap-2">
                  <span className="text-fg-5">Equipo</span>
                  <span className="text-fg">{lead.equipment_interest}</span>
                </div>
              )}
              {lead?.budget_text && (
                <div className="px-4 py-3 flex justify-between gap-2">
                  <span className="text-fg-5">Presupuesto</span>
                  <span className="text-fg">{lead.budget_text}</span>
                </div>
              )}
            </div>

            <div className="text-xs text-fg-6 px-1">
              Calculado el {new Date(score.calculated_at).toLocaleString("es-CO")}
              {score.product_code && <><br />Equipo cotizado: {score.product_code}</>}
            </div>
          </div>

          {/* Columna derecha — desglose (ocupa 2/3) */}
          <div className="lg:col-span-2 bg-surface-2 border border-border">
            <div className="px-4 py-3 border-b border-border">
              <span className="text-fg font-medium text-sm">Desglose por variable</span>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  {["Variable", "Valor capturado", "Resultado", "Tier", "Pts"].map(h => (
                    <th key={h} className="text-left px-4 py-2.5 text-fg-5 text-xs uppercase tracking-wider font-medium whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Object.entries(score.detail).map(([key, d]: [string, LeadScoreDetail]) => (
                  <tr key={key} className="border-b border-border last:border-0">
                    <td className="px-4 py-3 text-fg font-medium whitespace-nowrap">{d.display_name}</td>
                    <td className="px-4 py-3 text-fg-5 font-mono text-xs">{d.captured_value ?? "—"}</td>
                    <td className="px-4 py-3 text-fg-4">{d.label}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`px-2 py-0.5 text-[11px] font-medium border rounded-sm ${
                        d.tier === "A" ? "bg-green-500/15 text-green-400 border-green-500/30" :
                        d.tier === "B" ? "bg-yellow-500/15 text-yellow-400 border-yellow-500/30" :
                                        "bg-red-500/15 text-red-400 border-red-500/30"
                      }`}>{d.tier === "C" ? "No fit" : `Tier ${d.tier}`}</span>
                    </td>
                    <td className="px-4 py-3 text-fg font-mono font-bold text-right">{d.points}</td>
                  </tr>
                ))}
                <tr className="bg-surface-3">
                  <td colSpan={4} className="px-4 py-3 text-fg-5 text-xs uppercase tracking-wider font-medium">Total</td>
                  <td className="px-4 py-3 text-fg font-mono font-bold text-right">{score.final_score}</td>
                </tr>
              </tbody>
            </table>
          </div>

        </div>
      )}
    </div>
  );
}
