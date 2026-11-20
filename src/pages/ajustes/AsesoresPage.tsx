import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  Loader2, Plus, Pencil, Trash2, Users2, X, Minus,
} from "lucide-react";
import { toast } from "sonner";
import {
  api,
  ADVISOR_TEAMS,
  ADVISOR_TEAM_LABELS,
  type AdvisorProfileResponse,
  type AdvisorProfileCreate,
  type AdvisorProfileUpdate,
  type AdvisorTeam,
} from "../../services/api";


export default function AsesoresPage() {
  const [advisors, setAdvisors] = useState<AdvisorProfileResponse[]>([]);
  const [loading, setLoading]   = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing]   = useState<AdvisorProfileResponse | null>(null);
  const [teamFilter, setTeamFilter] = useState<AdvisorTeam | "all">("all");

  const load = async () => {
    setLoading(true);
    try {
      const list = await api.advisors.list();
      setAdvisors(list);
    } catch (e: any) {
      toast.error(e?.detail ?? "Error cargando asesores");
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const rows = teamFilter === "all"
      ? advisors
      : advisors.filter(a => a.teams.includes(teamFilter));
    return [...rows].sort((a, b) => {
      // Inactivos abajo, luego por carga ascendente, luego por nombre.
      if (a.is_active !== b.is_active) return a.is_active ? -1 : 1;
      if (a.current_load !== b.current_load) return a.current_load - b.current_load;
      return a.name.localeCompare(b.name);
    });
  }, [advisors, teamFilter]);

  // Métricas por team (sobre los activos).
  const metrics = useMemo(() => {
    const byTeam = new Map<AdvisorTeam, { count: number; load: number }>();
    for (const team of ADVISOR_TEAMS) byTeam.set(team, { count: 0, load: 0 });
    for (const a of advisors) {
      if (!a.is_active) continue;
      for (const team of a.teams) {
        const slot = byTeam.get(team)!;
        slot.count += 1;
        slot.load  += a.current_load;
      }
    }
    return Array.from(byTeam.entries()).map(([team, v]) => ({
      team,
      count: v.count,
      avgLoad: v.count ? v.load / v.count : 0,
    }));
  }, [advisors]);

  const toggleActive = async (a: AdvisorProfileResponse) => {
    try {
      const upd = await api.advisors.update(a.id, { is_active: !a.is_active });
      setAdvisors(prev => prev.map(x => x.id === a.id ? upd : x));
    } catch (e: any) {
      toast.error(e?.detail ?? "Error");
    }
  };

  const release = async (a: AdvisorProfileResponse) => {
    if (a.current_load === 0) return;
    try {
      const resp = await api.advisors.release(a.id);
      setAdvisors(prev => prev.map(x =>
        x.id === a.id ? { ...x, current_load: resp.current_load } : x
      ));
      toast.success("Carga liberada");
    } catch (e: any) {
      toast.error(e?.detail ?? "Error");
    }
  };

  const remove = async (a: AdvisorProfileResponse) => {
    if (!confirm(`¿Desactivar al asesor "${a.name}"? Los leads en curso quedan en su bandeja.`)) return;
    try {
      const upd = await api.advisors.remove(a.id);
      setAdvisors(prev => prev.map(x => x.id === a.id ? upd : x));
      toast.success("Asesor desactivado");
    } catch (e: any) {
      toast.error(e?.detail ?? "Error");
    }
  };

  const totalActive = advisors.filter(a => a.is_active).length;

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-fg text-xl font-semibold flex items-center gap-2">
            <Users2 size={18} className="text-accent" /> Asesores (handoff Ivonne)
          </h1>
          <p className="text-fg-5 text-xs mt-1">
            Perfiles que pueden recibir leads enrutados por Ivonne. El bot elige
            al menos cargado dentro del team que atiende el lead.
          </p>
        </div>
        <button
          onClick={() => { setEditing(null); setShowForm(true); }}
          className="flex items-center gap-1.5 bg-accent hover:bg-accent-light text-zinc-900 font-semibold text-xs uppercase tracking-wider px-3 py-2 transition-all"
        >
          <Plus size={13} /> Nuevo asesor
        </button>
      </div>

      {/* Métricas por team */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
        {metrics.map(m => (
          <div key={m.team} className="bg-surface-2 border border-border px-3 py-2">
            <div className="text-[10px] uppercase tracking-wider text-fg-5">
              {ADVISOR_TEAM_LABELS[m.team]}
            </div>
            <div className="text-fg text-base font-semibold">
              {m.count} <span className="text-fg-5 text-xs font-normal">activos</span>
            </div>
            <div className="text-fg-4 text-[11px]">
              carga promedio: {m.avgLoad.toFixed(1)}
            </div>
          </div>
        ))}
      </div>

      {/* Filtro por team */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-fg-5 text-[10px] uppercase tracking-wider">Filtrar:</span>
        <button
          onClick={() => setTeamFilter("all")}
          className={`text-[11px] px-2 py-1 border ${
            teamFilter === "all"
              ? "bg-accent/15 text-accent border-accent/50"
              : "bg-surface-3 text-fg-4 border-border hover:border-border-light"
          }`}
        >
          Todos ({totalActive} activos)
        </button>
        {ADVISOR_TEAMS.map(team => (
          <button
            key={team}
            onClick={() => setTeamFilter(team)}
            className={`text-[11px] px-2 py-1 border ${
              teamFilter === team
                ? "bg-accent/15 text-accent border-accent/50"
                : "bg-surface-3 text-fg-4 border-border hover:border-border-light"
            }`}
          >
            {ADVISOR_TEAM_LABELS[team]}
          </button>
        ))}
      </div>

      {/* Tabla */}
      <div className="bg-surface-2 border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-surface-3">
              <tr>
                <Th>Nombre</Th>
                <Th>Teléfono</Th>
                <Th>Teams</Th>
                <Th>Carga</Th>
                <Th>Activo</Th>
                <Th>Acciones</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr><td colSpan={6} className="py-10 text-center text-fg-5">
                  <Loader2 size={18} className="animate-spin inline text-accent" />
                </td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="py-10 text-center text-fg-6 text-sm">
                  Sin asesores{teamFilter !== "all" ? ` para ${ADVISOR_TEAM_LABELS[teamFilter]}` : ""}
                </td></tr>
              ) : filtered.map(a => {
                const pct = a.max_capacity > 0
                  ? Math.min(100, (a.current_load / a.max_capacity) * 100)
                  : 0;
                const barColor =
                  pct >= 100 ? "bg-red-500"
                  : pct >= 70 ? "bg-amber-500"
                  : "bg-emerald-500";
                return (
                  <tr key={a.id} className={`hover:bg-surface-3 transition-colors ${!a.is_active ? "opacity-50" : ""}`}>
                    <td className="py-3 px-4">
                      <div className="text-fg text-sm font-medium">{a.name}</div>
                      {a.email && <div className="text-fg-6 text-[11px]">{a.email}</div>}
                    </td>
                    <td className="py-3 px-4 text-fg-4 text-xs font-mono">{a.phone}</td>
                    <td className="py-3 px-4">
                      <div className="flex flex-wrap gap-1">
                        {a.teams.length === 0 ? (
                          <span className="text-fg-6 text-[10px] italic">sin teams</span>
                        ) : a.teams.map(t => (
                          <span key={t} className="bg-surface-3 border border-border text-fg-3 text-[10px] px-1.5 py-0.5">
                            {ADVISOR_TEAM_LABELS[t]}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="text-fg text-xs font-mono tabular-nums">
                          {a.current_load}/{a.max_capacity}
                        </div>
                        <div className="w-16 h-1.5 bg-surface-3 border border-border overflow-hidden">
                          <div className={`h-full ${barColor}`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => toggleActive(a)}
                        className={`text-[10px] uppercase tracking-wider border px-2 py-0.5 ${
                          a.is_active
                            ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/40"
                            : "bg-surface-3 text-fg-6 border-border"
                        }`}
                      >
                        {a.is_active ? "Activo" : "Inactivo"}
                      </button>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => { setEditing(a); setShowForm(true); }}
                          className="text-fg-5 hover:text-accent" title="Editar"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          onClick={() => release(a)}
                          disabled={a.current_load === 0}
                          className="text-fg-5 hover:text-accent disabled:opacity-30 disabled:cursor-not-allowed"
                          title="Liberar un lead (–1 a la carga)"
                        >
                          <Minus size={13} />
                        </button>
                        <button
                          onClick={() => remove(a)}
                          className="text-fg-5 hover:text-red-400"
                          title="Desactivar"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <AsesorFormModal
          initial={editing}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSaved={(a) => {
            setAdvisors(prev => {
              const idx = prev.findIndex(x => x.id === a.id);
              return idx >= 0 ? prev.map((x, i) => i === idx ? a : x) : [...prev, a];
            });
            setShowForm(false); setEditing(null);
          }}
        />
      )}
    </div>
  );
}


function Th({ children }: { children: React.ReactNode }) {
  return <th className="py-2 px-4 text-left text-[10px] uppercase tracking-wider text-fg-5 font-semibold">{children}</th>;
}


// ─── Modal ──────────────────────────────────────────────────────────────────

function AsesorFormModal({
  initial, onClose, onSaved,
}: {
  initial: AdvisorProfileResponse | null;
  onClose: () => void;
  onSaved: (a: AdvisorProfileResponse) => void;
}) {
  const [name, setName]       = useState(initial?.name ?? "");
  const [phone, setPhone]     = useState(initial?.phone ?? "");
  const [email, setEmail]     = useState(initial?.email ?? "");
  const [teams, setTeams]     = useState<AdvisorTeam[]>(initial?.teams ?? []);
  const [maxCap, setMaxCap]   = useState<number>(initial?.max_capacity ?? 15);
  const [isActive, setIsActive] = useState(initial?.is_active ?? true);
  const [notes, setNotes]     = useState(initial?.notes ?? "");
  const [saving, setSaving]   = useState(false);

  const toggleTeam = (t: AdvisorTeam) => {
    setTeams(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);
  };

  const submit = async () => {
    if (!name.trim()) { toast.error("Nombre requerido"); return; }
    if (!phone.trim()) { toast.error("Teléfono requerido"); return; }
    if (teams.length === 0) { toast.error("Elige al menos un team"); return; }

    setSaving(true);
    try {
      let saved: AdvisorProfileResponse;
      const normalizedPhone = phone.replace(/\s+/g, "");
      if (initial) {
        const upd: AdvisorProfileUpdate = {
          name: name.trim(),
          phone: normalizedPhone,
          email: email.trim() || null,
          teams,
          max_capacity: maxCap,
          is_active: isActive,
          notes: notes.trim() || null,
        };
        saved = await api.advisors.update(initial.id, upd);
      } else {
        const create: AdvisorProfileCreate = {
          name: name.trim(),
          phone: normalizedPhone,
          email: email.trim() || null,
          teams,
          max_capacity: maxCap,
          is_active: isActive,
          notes: notes.trim() || null,
        };
        saved = await api.advisors.create(create);
      }
      toast.success(initial ? "Asesor actualizado" : "Asesor creado");
      onSaved(saved);
    } catch (e: any) {
      toast.error(e?.detail ?? "No se pudo guardar");
    } finally { setSaving(false); }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={saving ? undefined : onClose} />
      <div className="relative bg-surface-2 border border-border w-full max-w-xl max-h-[90vh] shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-5 py-3 border-b border-border shrink-0">
          <h2 className="text-fg font-semibold text-sm flex items-center gap-2">
            <Users2 size={15} className="text-accent" /> {initial ? "Editar asesor" : "Nuevo asesor"}
          </h2>
          <button onClick={onClose} disabled={saving} className="text-fg-5 hover:text-fg disabled:opacity-40">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Nombre completo *">
              <input value={name} onChange={e => setName(e.target.value)} placeholder="Carlos Gómez"
                className="w-full bg-surface-3 border border-border text-fg px-2 py-2 text-sm outline-none focus:border-accent" />
            </Field>
            <Field label="Teléfono (E.164) *">
              <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="573001234567"
                className="w-full bg-surface-3 border border-border text-fg px-2 py-2 text-sm font-mono outline-none focus:border-accent" />
              <p className="text-fg-6 text-[10px] mt-1">Formato internacional sin "+" ni espacios.</p>
            </Field>
            <Field label="Email">
              <input type="email" value={email ?? ""} onChange={e => setEmail(e.target.value)} placeholder="carlos@coninmaq.com"
                className="w-full bg-surface-3 border border-border text-fg px-2 py-2 text-sm outline-none focus:border-accent" />
            </Field>
            <Field label="Capacidad máxima">
              <input type="number" min={1} max={100} value={maxCap} onChange={e => setMaxCap(parseInt(e.target.value) || 1)}
                className="w-full bg-surface-3 border border-border text-fg px-2 py-2 text-sm outline-none focus:border-accent" />
              <p className="text-fg-6 text-[10px] mt-1">Tope blando. El routing sigue eligiendo al menos cargado aunque esté por encima.</p>
            </Field>
          </div>

          <Field label="Teams que atiende *">
            <p className="text-fg-6 text-[10px] mb-2">
              Ivonne solo enruta leads a asesores cuya lista de teams contenga el destino del lead.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {ADVISOR_TEAMS.map(t => (
                <label key={t} className="flex items-center gap-2 cursor-pointer bg-surface-3 border border-border px-2 py-1.5 hover:border-border-light">
                  <input type="checkbox" checked={teams.includes(t)} onChange={() => toggleTeam(t)} className="accent-accent" />
                  <span className="text-fg-3 text-xs">{ADVISOR_TEAM_LABELS[t]}</span>
                </label>
              ))}
            </div>
          </Field>

          <Field label="Notas">
            <textarea value={notes ?? ""} onChange={e => setNotes(e.target.value)} rows={2}
              placeholder="Vacaciones del 1 al 10, atiende clientes grandes..."
              className="w-full bg-surface-3 border border-border text-fg px-2 py-2 text-sm outline-none focus:border-accent resize-none" />
          </Field>

          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)}
              className="accent-accent" />
            <span className="text-fg-3 text-sm">Asesor activo (recibe leads)</span>
          </label>
        </div>

        <div className="flex justify-end gap-2 px-5 py-3 border-t border-border shrink-0 bg-surface-2">
          <button onClick={onClose} disabled={saving}
            className="px-4 py-2 text-xs text-fg-4 border border-border hover:border-border-light disabled:opacity-40">
            Cancelar
          </button>
          <button onClick={submit} disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-accent hover:bg-accent-light text-zinc-900 disabled:opacity-40">
            {saving && <Loader2 size={11} className="animate-spin" />}
            {initial ? "Guardar cambios" : "Crear asesor"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}


function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[10px] uppercase tracking-wider text-fg-5 font-medium mb-1">{label}</label>
      {children}
    </div>
  );
}
