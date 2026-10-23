import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { X, Loader2, ArrowRight, Plus, Check } from "lucide-react";
import { toast } from "sonner";
import {
  api,
  type RentalMachineAvailability,
  type RentalQuotationConvertItemAssignment,
  type RentalQuotationConvertNewUnit,
  type RentalQuotationResponse,
} from "../../services/api";

type ItemUnitState = {
  mode: "existing" | "new";
  rental_machine_id: string | null;
  new_unit: RentalQuotationConvertNewUnit;
  available: RentalMachineAvailability[];
  loading: boolean;
};

const emptyNewUnit = (): RentalQuotationConvertNewUnit => ({
  plate: "",
  nickname: null,
  engine_serial: null,
  year: null,
  notes: null,
});

interface Props {
  quotation: RentalQuotationResponse;
  onClose: () => void;
  onConverted: (q: RentalQuotationResponse) => void;
}

export default function ConvertQuotationModal({ quotation, onClose, onConverted }: Props) {
  const today = new Date().toISOString().slice(0, 10);
  const [startDate, setStartDate] = useState(today);
  const [cutoffDay, setCutoffDay] = useState(30);
  const [obra, setObra] = useState(quotation.project_name ?? "");
  const [operator, setOperator] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const items = quotation.items ?? [];

  // Estado por item (indexado por idx)
  const [itemStates, setItemStates] = useState<ItemUnitState[]>(() =>
    items.map(() => ({
      mode: "existing",
      rental_machine_id: null,
      new_unit: emptyNewUnit(),
      available: [],
      loading: false,
    }))
  );

  // Carga una sola vez TODAS las unidades físicas con disponibilidad, y por cada item
  // las ordena con las del mismo modelo primero.
  useEffect(() => {
    (async () => {
      setItemStates(prev => prev.map(s => ({ ...s, loading: true })));
      try {
        const allUnits = await api.rental.listAllUnitsAvailability();
        setItemStates(prev => prev.map((s, idx) => {
          const it = items[idx];
          if (!it) return s;
          const catalogId = it.catalog_machine_id ?? null;
          const sorted = [...allUnits].sort((a, b) => {
            const aMatch = catalogId && a.machine.catalog_machine_id === catalogId ? 0 : 1;
            const bMatch = catalogId && b.machine.catalog_machine_id === catalogId ? 0 : 1;
            if (aMatch !== bMatch) return aMatch - bMatch;
            // Dentro del mismo bucket: disponibles primero, luego por placa
            if (a.is_available !== b.is_available) return a.is_available ? -1 : 1;
            return a.machine.plate.localeCompare(b.machine.plate);
          });
          // Preseleccionar: legacy rental_machine_id > primera del mismo modelo disponible > primera disponible
          let preselected: string | null = s.rental_machine_id ?? null;
          if (!preselected && it.rental_machine_id) preselected = it.rental_machine_id;
          if (!preselected) {
            const sameModelAvail = sorted.find(u => catalogId && u.machine.catalog_machine_id === catalogId && u.is_available);
            const anyAvail = sorted.find(u => u.is_available);
            preselected = sameModelAvail?.machine.id ?? anyAvail?.machine.id ?? null;
          }
          return {
            ...s,
            available: sorted,
            loading: false,
            rental_machine_id: preselected,
            mode: sorted.length === 0 ? "new" : s.mode,
          };
        }));
      } catch {
        setItemStates(prev => prev.map(s => ({ ...s, loading: false })));
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quotation.id]);

  function updateState(idx: number, patch: Partial<ItemUnitState>) {
    setItemStates(prev => prev.map((s, i) => i === idx ? { ...s, ...patch } : s));
  }
  function updateNewUnit(idx: number, patch: Partial<RentalQuotationConvertNewUnit>) {
    setItemStates(prev => prev.map((s, i) =>
      i === idx ? { ...s, new_unit: { ...s.new_unit, ...patch } } : s
    ));
  }

  const validationErrors = useMemo<string[]>(() => {
    const errs: string[] = [];
    const platesSeen = new Set<string>();
    itemStates.forEach((s, idx) => {
      const label = `Equipo ${idx + 1} (${items[idx]?.snapshot?.code ?? "—"})`;
      if (s.mode === "existing") {
        if (!s.rental_machine_id) errs.push(`${label}: selecciona una unidad.`);
      } else {
        const p = s.new_unit.plate.trim();
        if (!p) errs.push(`${label}: la placa es obligatoria para la nueva unidad.`);
        else {
          const key = p.toUpperCase();
          if (platesSeen.has(key)) errs.push(`${label}: la placa "${p}" se está usando en más de un equipo.`);
          platesSeen.add(key);
        }
      }
    });
    return errs;
  }, [itemStates, items]);

  async function submit() {
    if (validationErrors.length > 0) {
      toast.error(validationErrors[0]);
      return;
    }
    const payload: RentalQuotationConvertItemAssignment[] = itemStates.map((s, idx) => (
      s.mode === "existing"
        ? { item_index: idx, rental_machine_id: s.rental_machine_id }
        : { item_index: idx, new_unit: { ...s.new_unit, plate: s.new_unit.plate.trim() } }
    ));

    setSubmitting(true);
    try {
      const q = await api.rental.convertQuotation(quotation.id, {
        start_date: startDate,
        cutoff_day: cutoffDay,
        obra: obra || undefined,
        operator: operator || undefined,
        item_assignments: payload,
      });
      toast.success("Cotización convertida — ajusta los detalles en Relaciones");
      onConverted(q);
    } catch (e: any) {
      toast.error(e?.detail ?? "Error al convertir");
    } finally {
      setSubmitting(false);
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={submitting ? undefined : onClose} />
      <div className="relative bg-surface-2 border border-border w-full max-w-3xl max-h-[92vh] shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            <ArrowRight size={16} className="text-violet-400" />
            <h2 className="text-fg font-semibold text-sm">
              Convertir {quotation.number} en asignación
            </h2>
          </div>
          <button onClick={onClose} disabled={submitting} className="text-fg-5 hover:text-fg transition-colors disabled:opacity-40">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Datos generales */}
          <section>
            <h3 className="text-fg-5 text-[10px] uppercase tracking-wider font-semibold mb-2">Datos generales</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Fecha de inicio *">
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                  className="w-full bg-surface-3 border border-border px-2 py-2 text-xs text-fg-2 outline-none focus:border-accent" />
              </Field>
              <Field label="Día de corte">
                <input type="number" min={1} max={31} value={cutoffDay} onChange={e => setCutoffDay(Number(e.target.value) || 30)}
                  className="w-full bg-surface-3 border border-border px-2 py-2 text-xs text-fg-2 outline-none focus:border-accent" />
              </Field>
              <Field label="Obra / proyecto">
                <input type="text" value={obra} onChange={e => setObra(e.target.value)} placeholder="Nombre de la obra"
                  className="w-full bg-surface-3 border border-border px-2 py-2 text-xs text-fg-2 outline-none focus:border-accent" />
              </Field>
              <Field label="Operador (opcional)">
                <input type="text" value={operator} onChange={e => setOperator(e.target.value)} placeholder="Nombre del operador"
                  className="w-full bg-surface-3 border border-border px-2 py-2 text-xs text-fg-2 outline-none focus:border-accent" />
              </Field>
            </div>
          </section>

          {/* Asignación por item */}
          <section>
            <h3 className="text-fg-5 text-[10px] uppercase tracking-wider font-semibold mb-2">
              Unidad física por equipo
            </h3>
            <div className="text-fg-6 text-[11px] mb-3">
              Elige la unidad física que vas a enviar al cliente. Si aún no la tienes registrada, créala al vuelo con su placa.
            </div>

            <div className="space-y-3">
              {items.map((it, idx) => {
                const st = itemStates[idx];
                return (
                  <div key={idx} className="bg-surface-3 border border-border p-3 space-y-2">
                    <div className="flex items-center gap-3">
                      {it.snapshot.image_url && (
                        <img src={it.snapshot.image_url} alt="" className="w-10 h-10 object-contain bg-surface-2 shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="text-fg font-mono text-sm font-bold">{it.snapshot.code ?? "—"}</div>
                        <div className="text-fg-5 text-[11px] truncate">
                          {[it.snapshot.brand, it.snapshot.model].filter(Boolean).join(" · ")}
                        </div>
                      </div>
                      {!it.catalog_machine_id && it.rental_machine_id && (
                        <span className="text-[10px] uppercase tracking-wider bg-amber-500/15 text-amber-300 border border-amber-500/30 px-1.5 py-0.5">
                          Legacy: placa fija
                        </span>
                      )}
                    </div>

                    <>
                        {/* Tabs mode */}
                        <div className="flex gap-1 border-b border-border">
                          <TabBtn active={st.mode === "existing"} onClick={() => updateState(idx, { mode: "existing" })}
                            disabled={st.available.length === 0}>
                            Unidad existente {st.available.length > 0 && <span className="text-fg-6">({st.available.length})</span>}
                          </TabBtn>
                          <TabBtn active={st.mode === "new"} onClick={() => updateState(idx, { mode: "new" })}>
                            <Plus size={10} className="inline mr-0.5" /> Nueva unidad
                          </TabBtn>
                        </div>

                        {st.mode === "existing" && (
                          <>
                            {st.loading ? (
                              <div className="text-fg-6 text-xs flex items-center gap-2 py-2">
                                <Loader2 size={11} className="animate-spin" /> Buscando unidades…
                              </div>
                            ) : st.available.length === 0 ? (
                              <div className="text-fg-6 text-[11px] py-2 border border-dashed border-border px-3">
                                No hay unidades físicas registradas. Crea una nueva.
                              </div>
                            ) : (
                              <div className="space-y-1 max-h-56 overflow-y-auto">
                                {st.available.map(av => {
                                  const sameModel = !!it.catalog_machine_id && av.machine.catalog_machine_id === it.catalog_machine_id;
                                  return (
                                    <label key={av.machine.id}
                                      className={`flex items-center gap-2 px-2 py-1.5 border cursor-pointer transition-colors ${
                                        st.rental_machine_id === av.machine.id
                                          ? "border-accent bg-accent/10"
                                          : "border-border hover:border-border-light"
                                      } ${!av.is_available ? "opacity-70" : ""}`}>
                                      <input type="radio" name={`unit-${idx}`}
                                        checked={st.rental_machine_id === av.machine.id}
                                        onChange={() => updateState(idx, { rental_machine_id: av.machine.id })}
                                        className="accent-accent" />
                                      <div className="flex-1 min-w-0">
                                        <div className="text-fg-2 text-xs font-mono flex items-center gap-1.5 flex-wrap">
                                          <span>{av.machine.plate}</span>
                                          {av.machine.nickname && <span className="text-fg-5">({av.machine.nickname})</span>}
                                          {sameModel && (
                                            <span className="text-[9px] uppercase tracking-wider text-sky-300 border border-sky-500/30 bg-sky-500/10 px-1 py-0.5">
                                              mismo modelo
                                            </span>
                                          )}
                                        </div>
                                        <div className="text-fg-6 text-[10px] truncate">
                                          {av.machine.code} · {[av.machine.brand, av.machine.model].filter(Boolean).join(" ")}
                                        </div>
                                        {!av.is_available && (
                                          <div className="text-amber-400 text-[10px]">
                                            Ocupada: {av.current_assignment_obra ?? ""} {av.current_assignment_client ? `· ${av.current_assignment_client}` : ""}
                                          </div>
                                        )}
                                      </div>
                                      {av.is_available ? (
                                        <span className="text-[10px] uppercase tracking-wider text-emerald-300 border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5">
                                          <Check size={9} className="inline mr-0.5" /> libre
                                        </span>
                                      ) : (
                                        <span className="text-[10px] uppercase tracking-wider text-amber-300 border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5">
                                          ocupada
                                        </span>
                                      )}
                                    </label>
                                  );
                                })}
                              </div>
                            )}
                          </>
                        )}

                        {st.mode === "new" && (
                          <div className="grid grid-cols-2 gap-2">
                            <Field label="Placa *">
                              <input type="text" value={st.new_unit.plate}
                                onChange={e => updateNewUnit(idx, { plate: e.target.value })}
                                placeholder="ABC-123"
                                className="w-full bg-surface-2 border border-border px-2 py-1.5 text-xs text-fg-2 outline-none focus:border-accent" />
                            </Field>
                            <Field label="Año">
                              <input type="number" value={st.new_unit.year ?? ""}
                                onChange={e => updateNewUnit(idx, { year: e.target.value ? Number(e.target.value) : null })}
                                placeholder="2024"
                                className="w-full bg-surface-2 border border-border px-2 py-1.5 text-xs text-fg-2 outline-none focus:border-accent" />
                            </Field>
                            <Field label="Alias (opcional)">
                              <input type="text" value={st.new_unit.nickname ?? ""}
                                onChange={e => updateNewUnit(idx, { nickname: e.target.value || null })}
                                placeholder="La azul"
                                className="w-full bg-surface-2 border border-border px-2 py-1.5 text-xs text-fg-2 outline-none focus:border-accent" />
                            </Field>
                            <Field label="Serial motor (opcional)">
                              <input type="text" value={st.new_unit.engine_serial ?? ""}
                                onChange={e => updateNewUnit(idx, { engine_serial: e.target.value || null })}
                                placeholder="ENG-00123"
                                className="w-full bg-surface-2 border border-border px-2 py-1.5 text-xs text-fg-2 outline-none focus:border-accent" />
                            </Field>
                          </div>
                        )}
                      </>
                  </div>
                );
              })}
            </div>
          </section>

          {validationErrors.length > 0 && (
            <div className="bg-rose-500/10 border border-rose-500/30 p-3 text-rose-300 text-[11px] space-y-1">
              {validationErrors.map((e, i) => <div key={i}>• {e}</div>)}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-2 px-5 py-3 border-t border-border shrink-0 bg-surface-2">
          <div className="text-xs text-fg-5">
            Se crearán {items.length} asignación{items.length === 1 ? "" : "es"}
          </div>
          <div className="flex gap-2">
            <button onClick={onClose} disabled={submitting}
              className="px-4 py-2 text-xs text-fg-4 border border-border hover:border-border-light disabled:opacity-40">
              Cancelar
            </button>
            <button onClick={submit} disabled={submitting || validationErrors.length > 0}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-violet-600 hover:bg-violet-500 text-white disabled:opacity-40">
              {submitting ? <Loader2 size={11} className="animate-spin" /> : <ArrowRight size={11} />}
              Convertir
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="block text-[10px] uppercase tracking-wider text-fg-5 font-medium mb-1">{label}</div>
      {children}
    </div>
  );
}

function TabBtn({ active, onClick, disabled, children }: {
  active: boolean; onClick: () => void; disabled?: boolean; children: React.ReactNode;
}) {
  return (
    <button onClick={onClick} disabled={disabled}
      className={`px-3 py-1.5 text-[11px] uppercase tracking-wider border-b-2 transition-colors ${
        active ? "border-accent text-accent" : "border-transparent text-fg-5 hover:text-fg-3"
      } disabled:opacity-40 disabled:cursor-not-allowed`}>
      {children}
    </button>
  );
}
