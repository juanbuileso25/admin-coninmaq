import { useEffect, useState } from "react";
import { toast } from "sonner";
import { api, type ScoringVariable, type ScoringRule } from "../../services/api";

export default function ScoringConfigPage() {
  const [variables, setVariables] = useState<ScoringVariable[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<number | null>(null); // rule id being saved

  useEffect(() => {
    api.bot.scoringVariables()
      .then(setVariables)
      .catch(() => toast.error("Error cargando configuración"))
      .finally(() => setLoading(false));
  }, []);

  const handleRuleChange = (varId: number, ruleId: number, field: keyof ScoringRule, value: unknown) => {
    setVariables(prev => prev.map(v =>
      v.id === varId
        ? { ...v, rules: v.rules.map(r => r.id === ruleId ? { ...r, [field]: value } : r) }
        : v
    ));
  };

  const saveRule = async (rule: ScoringRule) => {
    setSaving(rule.id);
    try {
      await api.bot.patchScoringRule(rule.id, {
        points: rule.points,
        label: rule.label,
        value_min: rule.value_min,
        value_max: rule.value_max,
      });
      toast.success("Regla actualizada");
    } catch {
      toast.error("Error al guardar");
    } finally {
      setSaving(null);
    }
  };

  const toggleVariable = async (v: ScoringVariable) => {
    try {
      const updated = await api.bot.patchScoringVariable(v.id, { is_active: !v.is_active });
      setVariables(prev => prev.map(x => x.id === v.id ? updated : x));
      toast.success(updated.is_active ? "Variable activada" : "Variable desactivada");
    } catch {
      toast.error("Error al actualizar");
    }
  };

  const TIER_COLORS: Record<string, string> = {
    A: "text-green-400",
    B: "text-yellow-400",
    C: "text-red-400",
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-fg font-bold text-xl">Configuración de Calificación ICP</h1>
        <p className="text-fg-5 text-sm mt-0.5">Ajusta los puntos y umbrales de cada variable. Los cambios aplican a nuevas cotizaciones.</p>
      </div>

      {loading && <p className="text-fg-5">Cargando...</p>}

      {!loading && variables.map(v => (
        <div key={v.id} className="bg-surface-2 border border-border">
          {/* Variable header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div>
              <span className="text-fg font-medium">{v.display_name}</span>
              <span className="text-fg-6 text-xs ml-2">({v.source} · {v.data_key})</span>
            </div>
            <button
              onClick={() => toggleVariable(v)}
              className={`px-3 py-1 text-xs border rounded-sm transition-colors ${
                v.is_active
                  ? "border-green-500/30 text-green-400 bg-green-500/10 hover:bg-green-500/20"
                  : "border-border text-fg-5 bg-surface-3 hover:bg-surface-4"
              }`}
            >
              {v.is_active ? "Activa" : "Inactiva"}
            </button>
          </div>

          {/* Rules table */}
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                {["Tier", "Condición", "Puntos", "Etiqueta", ""].map(h => (
                  <th key={h} className="text-left px-4 py-2 text-fg-5 text-xs uppercase tracking-wider font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {v.rules.map(r => (
                <tr key={r.id} className="border-b border-border last:border-0">
                  <td className={`px-4 py-2.5 font-bold text-xs ${TIER_COLORS[r.tier] ?? "text-fg-5"}`}>
                    Tier {r.tier}
                  </td>
                  <td className="px-4 py-2.5 text-fg-5 text-xs font-mono">
                    {r.condition_type === "gte"     && `≥ ${r.value_min}`}
                    {r.condition_type === "lte"     && `≤ ${r.value_max}`}
                    {r.condition_type === "between" && `${r.value_min} – ${r.value_max}`}
                    {r.condition_type === "in"      && (r.values_list ?? []).join(", ")}
                    {r.condition_type === "default" && "—"}
                  </td>
                  <td className="px-4 py-2.5 w-24">
                    <input
                      type="number"
                      min={0}
                      max={20}
                      value={r.points}
                      onChange={e => handleRuleChange(v.id, r.id, "points", Number(e.target.value))}
                      className="w-16 bg-surface-3 border border-border text-fg text-sm px-2 py-1 outline-none focus:border-accent"
                    />
                  </td>
                  <td className="px-4 py-2.5">
                    <input
                      type="text"
                      value={r.label}
                      onChange={e => handleRuleChange(v.id, r.id, "label", e.target.value)}
                      className="w-full bg-surface-3 border border-border text-fg text-sm px-2 py-1 outline-none focus:border-accent"
                    />
                  </td>
                  <td className="px-4 py-2.5">
                    <button
                      onClick={() => saveRule(r)}
                      disabled={saving === r.id}
                      className="px-3 py-1 text-xs bg-accent text-black font-medium hover:bg-accent/90 transition-colors disabled:opacity-50"
                    >
                      {saving === r.id ? "..." : "Guardar"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}
