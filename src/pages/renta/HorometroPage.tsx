import { useState, useMemo } from "react";
import { Plus, Trash2, AlertTriangle, ClipboardList } from "lucide-react";

/* ── Types ── */
interface HorometroRecord {
  id:          string;
  numero:      string;
  dia:         string;
  mes:         string;
  anio:        string;
  obra:        string;
  placa:       string;
  horaInicial: string;
  horaFinal:   string;
  horometroInicial: string;
  horometroFinal:   string;
  standBy:     string;
  observaciones:    string;
  elaboro:     string;
  aprobo:      string;
}

const EMPTY: Omit<HorometroRecord, "id"> = {
  numero:           "",
  dia:              "",
  mes:              "",
  anio:             new Date().getFullYear().toString(),
  obra:             "",
  placa:            "",
  horaInicial:      "",
  horaFinal:        "",
  horometroInicial: "",
  horometroFinal:   "",
  standBy:          "",
  observaciones:    "",
  elaboro:          "",
  aprobo:           "",
};

/* ── Helpers ── */
function calcTiempoTotal(ini: string, fin: string): string {
  if (!ini || !fin) return "";
  const [hI, mI] = ini.split(":").map(Number);
  const [hF, mF] = fin.split(":").map(Number);
  const totalMin = (hF * 60 + mF) - (hI * 60 + mI);
  if (isNaN(totalMin) || totalMin < 0) return "";
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

function calcHorometroTotal(ini: string, fin: string): string {
  const a = parseFloat(ini);
  const b = parseFloat(fin);
  if (isNaN(a) || isNaN(b)) return "";
  const diff = b - a;
  if (diff < 0) return "";
  return diff % 1 === 0 ? diff.toString() : diff.toFixed(1);
}

const STORAGE_KEY = "horometro_records";

function loadRecords(): HorometroRecord[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function saveRecords(records: HorometroRecord[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

/* ── Label + Input helpers ── */
function Field({
  label, value, onChange, type = "text", placeholder = "", className = "", readOnly = false,
}: {
  label: string; value: string; onChange?: (v: string) => void;
  type?: string; placeholder?: string; className?: string; readOnly?: boolean;
}) {
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <label className="text-[10px] uppercase tracking-wider text-fg-5 font-medium">{label}</label>
      <input
        type={type}
        value={value}
        readOnly={readOnly}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder={placeholder}
        className={`bg-surface-3 border border-border text-sm text-fg-2 px-3 py-2 outline-none
                    transition-all placeholder:text-fg-6
                    ${readOnly ? "text-accent font-semibold cursor-default" : "focus:border-accent"}`}
      />
    </div>
  );
}

/* ── Main Page ── */
export default function HorometroPage() {
  const [records,    setRecords]    = useState<HorometroRecord[]>(loadRecords);
  const [form,       setForm]       = useState<Omit<HorometroRecord, "id">>(EMPTY);
  const [showForm,   setShowForm]   = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const set = (field: keyof typeof EMPTY) => (val: string) =>
    setForm((prev) => ({ ...prev, [field]: val }));

  const tiempoTotal     = useMemo(() => calcTiempoTotal(form.horaInicial, form.horaFinal),           [form.horaInicial, form.horaFinal]);
  const horometroTotal  = useMemo(() => calcHorometroTotal(form.horometroInicial, form.horometroFinal), [form.horometroInicial, form.horometroFinal]);

  const handleSave = () => {
    const record: HorometroRecord = {
      ...form,
      id: crypto.randomUUID(),
    };
    const updated = [record, ...records];
    setRecords(updated);
    saveRecords(updated);
    setForm(EMPTY);
    setShowForm(false);
  };

  const handleDelete = (id: string) => {
    const updated = records.filter((r) => r.id !== id);
    setRecords(updated);
    saveRecords(updated);
    setDeletingId(null);
  };

  const isValid = form.obra && form.placa && form.dia && form.mes && form.anio;

  return (
    <div className="space-y-5 max-w-[900px]">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 animate-fade-up">
        <div>
          <p className="text-fg-6 text-xs uppercase tracking-wider mb-1">Renta</p>
          <h1 className="text-fg text-xl font-semibold">Horómetro</h1>
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 bg-accent hover:bg-accent-light text-zinc-900 font-semibold
                       text-xs uppercase tracking-wider px-4 py-2.5 transition-all hover:shadow-glow hover:-translate-y-px flex-shrink-0"
          >
            <Plus size={15} /> Nuevo registro
          </button>
        )}
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-surface-2 border border-border animate-fade-up">

          {/* Form header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <div className="flex items-center gap-2.5">
              <ClipboardList size={16} className="text-accent" />
              <span className="text-fg font-semibold text-sm">Nuevo Registro de Horómetro</span>
            </div>
          </div>

          <div className="p-5 space-y-5">

            {/* Fila 1: No. y Fecha */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <Field label="N° Documento" value={form.numero} onChange={set("numero")} placeholder="0055" />
              <Field label="Día"  type="number" value={form.dia}  onChange={set("dia")}  placeholder="21" />
              <Field label="Mes"  type="number" value={form.mes}  onChange={set("mes")}  placeholder="05" />
              <Field label="Año"  type="number" value={form.anio} onChange={set("anio")} placeholder="2026" />
            </div>

            {/* Fila 2: Obra y Placa */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Obra"  value={form.obra}  onChange={set("obra")}  placeholder="Nombre de la obra" />
              <Field label="Placa" value={form.placa} onChange={set("placa")} placeholder="0128" />
            </div>

            {/* Tiempo Trabajado */}
            <div>
              <p className="text-[10px] uppercase tracking-wider text-fg-5 font-medium mb-2">Tiempo Trabajado</p>
              <div className="border border-border">
                <div className="grid grid-cols-3 border-b border-border bg-surface-3">
                  <div className="px-3 py-2 text-[11px] font-semibold text-fg-4 uppercase tracking-wide border-r border-border">Hora Inicial</div>
                  <div className="px-3 py-2 text-[11px] font-semibold text-fg-4 uppercase tracking-wide border-r border-border">Hora Final</div>
                  <div className="px-3 py-2 text-[11px] font-semibold text-fg-4 uppercase tracking-wide">Total</div>
                </div>
                <div className="grid grid-cols-3">
                  <div className="border-r border-border">
                    <input
                      type="time"
                      value={form.horaInicial}
                      onChange={(e) => set("horaInicial")(e.target.value)}
                      className="w-full bg-transparent text-sm text-fg-2 px-3 py-3 outline-none focus:bg-surface-3 transition-all"
                    />
                  </div>
                  <div className="border-r border-border">
                    <input
                      type="time"
                      value={form.horaFinal}
                      onChange={(e) => set("horaFinal")(e.target.value)}
                      className="w-full bg-transparent text-sm text-fg-2 px-3 py-3 outline-none focus:bg-surface-3 transition-all"
                    />
                  </div>
                  <div className="px-3 py-3 text-sm font-semibold text-accent">
                    {tiempoTotal || <span className="text-fg-6">—</span>}
                  </div>
                </div>
              </div>
            </div>

            {/* Horómetro */}
            <div>
              <p className="text-[10px] uppercase tracking-wider text-fg-5 font-medium mb-2">Horómetro</p>
              <div className="border border-border">
                <div className="grid grid-cols-3 border-b border-border bg-surface-3">
                  <div className="px-3 py-2 text-[11px] font-semibold text-fg-4 uppercase tracking-wide border-r border-border">Horómetro Inicial</div>
                  <div className="px-3 py-2 text-[11px] font-semibold text-fg-4 uppercase tracking-wide border-r border-border">Horómetro Final</div>
                  <div className="px-3 py-2 text-[11px] font-semibold text-fg-4 uppercase tracking-wide">Total</div>
                </div>
                <div className="grid grid-cols-3">
                  <div className="border-r border-border">
                    <input
                      type="number"
                      step="0.1"
                      value={form.horometroInicial}
                      onChange={(e) => set("horometroInicial")(e.target.value)}
                      placeholder="3093.9"
                      className="w-full bg-transparent text-sm text-fg-2 px-3 py-3 outline-none focus:bg-surface-3 transition-all placeholder:text-fg-6"
                    />
                  </div>
                  <div className="border-r border-border">
                    <input
                      type="number"
                      step="0.1"
                      value={form.horometroFinal}
                      onChange={(e) => set("horometroFinal")(e.target.value)}
                      placeholder="3101.8"
                      className="w-full bg-transparent text-sm text-fg-2 px-3 py-3 outline-none focus:bg-surface-3 transition-all placeholder:text-fg-6"
                    />
                  </div>
                  <div className="px-3 py-3 text-sm font-semibold text-accent">
                    {horometroTotal || <span className="text-fg-6">—</span>}
                  </div>
                </div>
              </div>
            </div>

            {/* Stand By y Observaciones */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Stand By Acordado" value={form.standBy} onChange={set("standBy")} placeholder="" />
              <div className="flex flex-col gap-1">
                <label className="text-[10px] uppercase tracking-wider text-fg-5 font-medium">Observaciones</label>
                <textarea
                  value={form.observaciones}
                  onChange={(e) => set("observaciones")(e.target.value)}
                  placeholder="Conformación lote 18..."
                  rows={3}
                  className="bg-surface-3 border border-border text-sm text-fg-2 px-3 py-2 outline-none
                             focus:border-accent transition-all placeholder:text-fg-6 resize-none"
                />
              </div>
            </div>

            {/* Elaboró y Aprobó */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Elaboró" value={form.elaboro} onChange={set("elaboro")} placeholder="Nombre" />
              <Field label="Aprobó"  value={form.aprobo}  onChange={set("aprobo")}  placeholder="Nombre" />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-2 border-t border-border">
              <button
                onClick={() => { setForm(EMPTY); setShowForm(false); }}
                className="px-5 py-2 text-xs text-fg-4 border border-border hover:border-border-light transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={!isValid}
                className="px-5 py-2 text-xs font-semibold bg-accent hover:bg-accent-light text-zinc-900
                           transition-all hover:shadow-glow disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:shadow-none disabled:hover:translate-y-0"
              >
                Guardar registro
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Records table */}
      <div
        className="bg-surface-2 border border-border overflow-hidden animate-fade-up"
        style={{ animationDelay: "80ms", animationFillMode: "both" }}
      >
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <span className="text-fg-4 text-xs font-medium uppercase tracking-wider">Registros guardados</span>
          <span className="text-fg-6 text-xs">{records.length} {records.length === 1 ? "registro" : "registros"}</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-3 text-fg-5 text-[11px] uppercase tracking-wider font-medium">N°</th>
                <th className="text-left px-4 py-3 text-fg-5 text-[11px] uppercase tracking-wider font-medium">Fecha</th>
                <th className="text-left px-4 py-3 text-fg-5 text-[11px] uppercase tracking-wider font-medium">Obra</th>
                <th className="text-left px-4 py-3 text-fg-5 text-[11px] uppercase tracking-wider font-medium">Placa</th>
                <th className="text-left px-4 py-3 text-fg-5 text-[11px] uppercase tracking-wider font-medium">Tiempo</th>
                <th className="text-left px-4 py-3 text-fg-5 text-[11px] uppercase tracking-wider font-medium">Horómetro</th>
                <th className="text-left px-4 py-3 text-fg-5 text-[11px] uppercase tracking-wider font-medium">Total h</th>
                <th className="text-right px-4 py-3 text-fg-5 text-[11px] uppercase tracking-wider font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {records.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-fg-6 text-sm">
                    No hay registros aún
                  </td>
                </tr>
              )}
              {records.map((r) => {
                const total = calcHorometroTotal(r.horometroInicial, r.horometroFinal);
                const tiempo = calcTiempoTotal(r.horaInicial, r.horaFinal);
                return (
                  <>
                    <tr key={r.id} className="hover:bg-surface-3 transition-colors duration-100">
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs text-fg-4 bg-surface-4 border border-border px-2 py-0.5">
                          {r.numero || "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-fg-3 text-xs">
                        {r.dia}/{r.mes}/{r.anio}
                      </td>
                      <td className="px-4 py-3 text-fg-2 font-medium">{r.obra}</td>
                      <td className="px-4 py-3 text-fg-3 font-mono text-xs">{r.placa}</td>
                      <td className="px-4 py-3 text-fg-4 text-xs">
                        {r.horaInicial && r.horaFinal
                          ? <>{r.horaInicial} → {r.horaFinal} <span className="text-accent ml-1">({tiempo})</span></>
                          : <span className="text-fg-6">—</span>}
                      </td>
                      <td className="px-4 py-3 text-fg-4 text-xs">
                        {r.horometroInicial && r.horometroFinal
                          ? <>{r.horometroInicial} → {r.horometroFinal}</>
                          : <span className="text-fg-6">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-accent font-semibold text-sm">{total || "—"}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => setDeletingId(r.id)}
                          className="w-8 h-8 inline-flex items-center justify-center text-fg-5 hover:text-red-400 hover:bg-red-950/20 transition-all"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>

                    {deletingId === r.id && (
                      <tr key={`del-${r.id}`} className="bg-red-950/20 border-b border-red-900/30">
                        <td colSpan={8} className="px-4 py-3">
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-2.5 text-red-300">
                              <AlertTriangle size={15} />
                              <span className="text-sm">
                                ¿Eliminar registro de <strong>{r.obra}</strong>? Esta acción no se puede deshacer.
                              </span>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <button
                                onClick={() => setDeletingId(null)}
                                className="px-4 py-1.5 text-xs text-fg-4 border border-border hover:border-border-light transition-all"
                              >
                                Cancelar
                              </button>
                              <button
                                onClick={() => handleDelete(r.id)}
                                className="px-4 py-1.5 text-xs font-semibold text-white bg-red-700 hover:bg-red-600 transition-all"
                              >
                                Eliminar
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
