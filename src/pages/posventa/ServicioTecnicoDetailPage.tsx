import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft, Loader2, Save, Upload, Trash2, Paperclip,
  Wrench, History, Package, Plus, FileText, Download, Mail, X, Send, CheckSquare, Square,
  Check, PauseCircle,
} from "lucide-react";
import { toast } from "sonner";
import {
  api,
  SERVICE_TYPE_LABELS,
  SERVICE_STATUS_LABELS,
  type ChecklistTemplateInfo,
  type ServiceOrderDetail,
  type ServiceStatus,
} from "../../services/api";

const STATUS_COLORS: Record<ServiceStatus, string> = {
  solicitado:         "bg-slate-500/15 text-slate-300 border-slate-500/30",
  programado:         "bg-sky-500/15 text-sky-300 border-sky-500/30",
  en_camino:          "bg-indigo-500/15 text-indigo-300 border-indigo-500/30",
  en_ejecucion:       "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  esperando_repuesto: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  finalizado:         "bg-blue-500/15 text-blue-300 border-blue-500/30",
  cerrado:            "bg-zinc-500/15 text-zinc-300 border-zinc-500/30",
};

type Tab = "info" | "trabajo" | "checklist" | "repuestos" | "archivos" | "historial";

export default function ServicioTecnicoDetailPage() {
  const { id } = useParams<{ id: string }>();
  const nav = useNavigate();

  const [order, setOrder] = useState<ServiceOrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("info");
  const [changingStatus, setChangingStatus] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [showSendModal, setShowSendModal] = useState(false);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const o = await api.serviceOrders.get(Number(id));
      setOrder(o);
    } catch (e: any) {
      toast.error(e?.detail ?? "No se pudo cargar");
      nav("/posventa/servicio-tecnico");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id]);

  const downloadPdf = async () => {
    if (!order) return;
    setDownloadingPdf(true);
    try {
      await api.serviceOrders.downloadReportPdf(order.id, order.order_number);
    } catch (e: any) {
      toast.error(e?.detail ?? "No se pudo descargar el PDF");
    } finally {
      setDownloadingPdf(false);
    }
  };

  const changeStatus = async (s: ServiceStatus) => {
    if (!order) return;
    const note = s === "esperando_repuesto"
      ? prompt("¿Qué repuesto se está esperando?") ?? undefined
      : undefined;
    setChangingStatus(true);
    try {
      const updated = await api.serviceOrders.changeStatus(order.id, s, note);
      setOrder(updated);
      toast.success(`Estado cambiado a "${SERVICE_STATUS_LABELS[s]}"`);
    } catch (e: any) {
      toast.error(e?.detail ?? "Error al cambiar estado");
    } finally {
      setChangingStatus(false);
    }
  };

  if (loading || !order) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 size={20} className="animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-3 min-w-0">
          <button onClick={() => nav("/posventa/servicio-tecnico")} className="text-fg-5 hover:text-fg mt-1">
            <ArrowLeft size={18} />
          </button>
          <div>
            <p className="text-fg-6 text-xs uppercase tracking-wider">Servicio técnico</p>
            <h1 className="text-fg text-xl font-semibold flex items-center gap-2">
              {order.order_number}
              <span className={`inline-flex items-center text-[10px] uppercase tracking-wider px-1.5 py-0.5 border ${STATUS_COLORS[order.status] ?? "bg-surface-3 text-fg-5 border-border"}`}>
                {SERVICE_STATUS_LABELS[order.status] ?? order.status}
              </span>
            </h1>
            <p className="text-fg-5 text-xs mt-1">
              {order.client_name ?? "Sin cliente"}
              {order.technician_name ? ` · ${order.technician_name}` : ""}
            </p>
          </div>
        </div>

        {/* Acciones */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={downloadPdf}
            disabled={downloadingPdf}
            className="flex items-center gap-1.5 bg-surface-2 border border-border hover:border-accent text-fg-3 hover:text-accent text-xs uppercase tracking-wider px-3 py-2 transition-all disabled:opacity-40"
          >
            {downloadingPdf ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
            Descargar PDF
          </button>
          <button
            onClick={() => setShowSendModal(true)}
            className="flex items-center gap-1.5 bg-surface-2 border border-border hover:border-accent text-fg-3 hover:text-accent text-xs uppercase tracking-wider px-3 py-2 transition-all"
          >
            <Mail size={12} /> Enviar al cliente
          </button>
        </div>
      </div>

      {/* Stepper de estados */}
      <StatusStepper status={order.status} onChange={changeStatus} disabled={changingStatus} />

      {/* Tabs */}
      <div className="border-b border-border flex gap-1">
        {([
          { k: "info",       label: "Info general",    icon: FileText },
          { k: "trabajo",    label: "Diagnóstico y trabajo", icon: Wrench },
          { k: "checklist",  label: `Checklist${order.checklist_total ? ` (${order.checklist_done}/${order.checklist_total})` : ""}`, icon: CheckSquare },
          { k: "repuestos",  label: "Repuestos usados", icon: Package },
          { k: "archivos",   label: "Archivos",        icon: Paperclip },
          { k: "historial",  label: "Historial",       icon: History },
        ] as const).map(t => (
          <button
            key={t.k}
            onClick={() => setTab(t.k as Tab)}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs uppercase tracking-wider border-b-2 transition-colors ${
              tab === t.k
                ? "border-accent text-accent"
                : "border-transparent text-fg-5 hover:text-fg-3"
            }`}
          >
            <t.icon size={12} /> {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {tab === "info"      && <InfoTab order={order} onUpdated={setOrder} />}
      {tab === "trabajo"   && <TrabajoTab order={order} onUpdated={setOrder} />}
      {tab === "checklist" && <ChecklistTab order={order} onUpdated={setOrder} />}
      {tab === "repuestos" && <RepuestosTab order={order} onUpdated={setOrder} />}
      {tab === "archivos"  && <ArchivosTab order={order} onUpdated={setOrder} />}
      {tab === "historial" && <HistorialTab order={order} />}

      {showSendModal && (
        <EnviarReporteModal
          order={order}
          onClose={() => setShowSendModal(false)}
          onSent={() => setShowSendModal(false)}
        />
      )}
    </div>
  );
}

// ─── Tabs ───────────────────────────────────────────────────────────────────

function InfoTab({ order }: { order: ServiceOrderDetail; onUpdated: (o: ServiceOrderDetail) => void }) {
  const mi = order.machine_info ?? {};
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card title="Cliente">
        <KV label="Cliente" value={order.client_name ?? "—"} />
        <KV label="Ubicación" value={order.location ?? "—"} />
      </Card>
      <Card title="Equipo">
        <KV label="Marca / Modelo" value={[mi.brand, mi.model].filter(Boolean).join(" ") || "—"} />
        <KV label="Serial" value={mi.serial ?? "—"} />
        <KV label="Horómetro" value={mi.horometer != null ? `${mi.horometer.toLocaleString("es-CO")} h` : "—"} />
      </Card>
      <Card title="Servicio">
        <KV label="Tipo" value={SERVICE_TYPE_LABELS[order.service_type] ?? order.service_type} />
        <KV label="Técnico" value={order.technician_name ?? "Sin asignar"} />
        <KV label="Programado" value={order.scheduled_at ? new Date(order.scheduled_at).toLocaleString("es-CO") : "—"} />
      </Card>
      <Card title="Tiempos">
        <KV label="Creada" value={new Date(order.created_at).toLocaleString("es-CO")} />
        <KV label="Iniciada" value={order.started_at ? new Date(order.started_at).toLocaleString("es-CO") : "—"} />
        <KV label="Finalizada" value={order.completed_at ? new Date(order.completed_at).toLocaleString("es-CO") : "—"} />
      </Card>
    </div>
  );
}

function TrabajoTab({ order, onUpdated }: { order: ServiceOrderDetail; onUpdated: (o: ServiceOrderDetail) => void }) {
  const [fault, setFault]   = useState(order.fault_reported ?? "");
  const [diag,  setDiag]    = useState(order.diagnosis ?? "");
  const [work,  setWork]    = useState(order.work_done ?? "");
  const [hours, setHours]   = useState<string>(order.labor_hours != null ? String(order.labor_hours) : "");
  const [cost,  setCost]    = useState<string>(order.labor_cost != null ? String(order.labor_cost) : "");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      const upd = await api.serviceOrders.update(order.id, {
        fault_reported: fault || null,
        diagnosis: diag || null,
        work_done: work || null,
        labor_hours: hours ? Number(hours) : null,
        labor_cost: cost ? Number(cost) : null,
      });
      onUpdated(upd);
      toast.success("Guardado");
    } catch (e: any) {
      toast.error(e?.detail ?? "Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <TextArea label="Falla reportada por el cliente" value={fault} onChange={setFault} rows={3} />
      <TextArea label="Diagnóstico del técnico" value={diag} onChange={setDiag} rows={4} />
      <TextArea label="Trabajo realizado" value={work} onChange={setWork} rows={4} />
      <div className="grid grid-cols-2 gap-3">
        <Field label="Horas mano de obra">
          <input type="number" step="0.5" value={hours} onChange={e => setHours(e.target.value)}
            className="w-full bg-surface-3 border border-border text-fg px-3 py-2 text-sm outline-none focus:border-accent" />
        </Field>
        <Field label="Costo mano de obra (COP)">
          <input type="number" value={cost} onChange={e => setCost(e.target.value)}
            className="w-full bg-surface-3 border border-border text-fg px-3 py-2 text-sm outline-none focus:border-accent" />
        </Field>
      </div>
      <div className="flex justify-end">
        <button onClick={save} disabled={saving}
          className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-accent hover:bg-accent-light text-zinc-900 disabled:opacity-40">
          {saving ? <Loader2 size={11} className="animate-spin" /> : <Save size={11} />} Guardar
        </button>
      </div>
    </div>
  );
}

function RepuestosTab({ order, onUpdated }: { order: ServiceOrderDetail; onUpdated: (o: ServiceOrderDetail) => void }) {
  const [desc, setDesc]   = useState("");
  const [qty, setQty]     = useState(1);
  const [cost, setCost]   = useState(0);
  const [adding, setAdding] = useState(false);

  const addPart = async () => {
    if (!desc.trim()) { toast.error("Descripción requerida"); return; }
    setAdding(true);
    try {
      await api.serviceOrders.addPart(order.id, { description: desc.trim(), quantity: qty, unit_cost: cost });
      const upd = await api.serviceOrders.get(order.id);
      onUpdated(upd);
      setDesc(""); setQty(1); setCost(0);
    } catch (e: any) {
      toast.error(e?.detail ?? "Error");
    } finally { setAdding(false); }
  };

  const removePart = async (partId: number) => {
    if (!confirm("¿Eliminar este repuesto?")) return;
    try {
      await api.serviceOrders.deletePart(order.id, partId);
      const upd = await api.serviceOrders.get(order.id);
      onUpdated(upd);
    } catch (e: any) {
      toast.error(e?.detail ?? "Error");
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-surface-2 border border-border">
        <table className="w-full text-sm">
          <thead className="bg-surface-3 text-fg-5 text-[10px] uppercase tracking-wider">
            <tr>
              <th className="text-left py-2 px-3">Repuesto</th>
              <th className="text-right py-2 px-3 w-20">Cant</th>
              <th className="text-right py-2 px-3 w-32">V. unit</th>
              <th className="text-right py-2 px-3 w-32">Total</th>
              <th className="w-10"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {order.parts.length === 0 ? (
              <tr><td colSpan={5} className="py-8 text-center text-fg-6 text-xs">Sin repuestos usados aún</td></tr>
            ) : order.parts.map(p => (
              <tr key={p.id}>
                <td className="py-2 px-3 text-fg">
                  {p.description}
                  {p.spare_part_code && <span className="text-fg-5 text-[10px] ml-2 font-mono">({p.spare_part_code})</span>}
                </td>
                <td className="py-2 px-3 text-right text-fg-3">{p.quantity}</td>
                <td className="py-2 px-3 text-right text-fg-3 font-mono text-xs">${p.unit_cost.toLocaleString("es-CO")}</td>
                <td className="py-2 px-3 text-right text-fg font-semibold font-mono text-xs">${(p.unit_cost * p.quantity).toLocaleString("es-CO")}</td>
                <td className="py-2 px-3">
                  <button onClick={() => removePart(p.id)} className="text-fg-6 hover:text-red-400">
                    <Trash2 size={12} />
                  </button>
                </td>
              </tr>
            ))}
            <tr className="bg-surface-3">
              <td colSpan={3} className="py-2 px-3 text-right text-fg-5 text-xs uppercase tracking-wider">Repuestos</td>
              <td className="py-2 px-3 text-right text-fg-2 font-mono">${order.parts_total.toLocaleString("es-CO")}</td>
              <td></td>
            </tr>
            {order.labor_cost != null && order.labor_cost > 0 && (
              <tr className="bg-surface-3">
                <td colSpan={3} className="py-2 px-3 text-right text-fg-5 text-xs uppercase tracking-wider">
                  Mano de obra{order.labor_hours != null ? ` (${order.labor_hours} h)` : ""}
                </td>
                <td className="py-2 px-3 text-right text-fg-2 font-mono">${order.labor_cost.toLocaleString("es-CO")}</td>
                <td></td>
              </tr>
            )}
            <tr className="bg-surface-3 border-t-2 border-accent/40">
              <td colSpan={3} className="py-2 px-3 text-right text-fg-5 text-xs uppercase tracking-wider font-bold">Total general</td>
              <td className="py-2 px-3 text-right text-accent font-bold font-mono text-sm">${order.grand_total.toLocaleString("es-CO")}</td>
              <td></td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="bg-surface-2 border border-dashed border-border p-3">
        <h4 className="text-fg-5 text-[10px] uppercase tracking-wider mb-2">Añadir repuesto</h4>
        <div className="grid grid-cols-[1fr_80px_120px_auto] gap-2 items-center">
          <input value={desc} onChange={e => setDesc(e.target.value)} placeholder="Descripción"
            className="bg-surface-3 border border-border text-fg px-2 py-1.5 text-sm outline-none focus:border-accent" />
          <input type="number" min={1} value={qty} onChange={e => setQty(parseInt(e.target.value) || 1)}
            className="bg-surface-3 border border-border text-fg px-2 py-1.5 text-sm text-right outline-none focus:border-accent" />
          <input type="number" min={0} value={cost} onChange={e => setCost(parseInt(e.target.value) || 0)} placeholder="V. unit COP"
            className="bg-surface-3 border border-border text-fg px-2 py-1.5 text-sm text-right outline-none focus:border-accent" />
          <button onClick={addPart} disabled={adding}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold bg-accent hover:bg-accent-light text-zinc-900 disabled:opacity-40">
            {adding ? <Loader2 size={11} className="animate-spin" /> : <Plus size={11} />}
          </button>
        </div>
      </div>
    </div>
  );
}

function ArchivosTab({ order, onUpdated }: { order: ServiceOrderDetail; onUpdated: (o: ServiceOrderDetail) => void }) {
  const [uploading, setUploading] = useState(false);
  const [category, setCategory] = useState("reporte_campo");
  const fileRef = useRef<HTMLInputElement>(null);

  const upload = async (files: FileList | File[]) => {
    const arr = Array.from(files);
    if (arr.length === 0) return;
    setUploading(true);
    try {
      for (const f of arr) {
        await api.serviceOrders.uploadAttachment(order.id, f, category);
      }
      const upd = await api.serviceOrders.get(order.id);
      onUpdated(upd);
    } catch (e: any) {
      toast.error(e?.detail ?? "Error subiendo");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const remove = async (attId: number) => {
    if (!confirm("¿Eliminar este archivo?")) return;
    try {
      await api.serviceOrders.deleteAttachment(order.id, attId);
      const upd = await api.serviceOrders.get(order.id);
      onUpdated(upd);
    } catch (e: any) {
      toast.error(e?.detail ?? "Error");
    }
  };

  const fmtSize = (bytes: number | null) => {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <select value={category} onChange={e => setCategory(e.target.value)}
          className="bg-surface-2 border border-border text-fg text-xs px-3 py-2 outline-none focus:border-accent">
          <option value="reporte_campo">Reporte de campo</option>
          <option value="foto">Foto</option>
          <option value="factura">Factura</option>
          <option value="otro">Otro</option>
        </select>
        <input ref={fileRef} type="file" multiple className="hidden" onChange={e => e.target.files && upload(e.target.files)} />
        <button onClick={() => fileRef.current?.click()} disabled={uploading}
          className="flex items-center gap-1.5 text-xs text-fg-3 border border-dashed border-fg-6 hover:border-accent hover:text-accent px-3 py-2 disabled:opacity-50">
          {uploading ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
          {uploading ? "Subiendo..." : "Subir archivos"}
        </button>
      </div>

      {order.attachments.length === 0 ? (
        <div className="text-fg-6 text-xs text-center py-10 border border-dashed border-border">
          Sin archivos aún
        </div>
      ) : (
        <ul className="space-y-2">
          {order.attachments.map(a => (
            <li key={a.id} className="flex items-center gap-2 bg-surface-2 border border-border px-3 py-2 text-sm">
              <Paperclip size={13} className="text-fg-5 shrink-0" />
              <a href={a.file_url} target="_blank" rel="noreferrer" className="flex-1 min-w-0 text-fg-2 truncate hover:text-accent">
                {a.file_name}
              </a>
              <span className="text-fg-6 text-[10px] shrink-0">{a.category}</span>
              <span className="text-fg-6 text-[10px] shrink-0">{fmtSize(a.file_size)}</span>
              <button onClick={() => remove(a.id)} className="text-fg-6 hover:text-red-400">
                <Trash2 size={13} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function HistorialTab({ order }: { order: ServiceOrderDetail }) {
  if (order.status_history.length === 0) {
    return <div className="text-fg-6 text-xs text-center py-10">Sin historial</div>;
  }
  return (
    <ol className="relative border-l-2 border-border ml-3 space-y-4">
      {order.status_history.map(h => (
        <li key={h.id} className="pl-5 relative">
          <span className="absolute -left-[7px] top-1.5 w-3 h-3 rounded-full bg-accent border-2 border-surface-2" />
          <div className="text-sm text-fg">
            {h.from_status ? `${SERVICE_STATUS_LABELS[h.from_status as ServiceStatus] ?? h.from_status} → ` : ""}
            <strong>{SERVICE_STATUS_LABELS[h.to_status as ServiceStatus] ?? h.to_status}</strong>
          </div>
          {h.note && <div className="text-fg-5 text-xs mt-1">{h.note}</div>}
          <div className="text-fg-6 text-[10px] mt-1">
            {new Date(h.created_at).toLocaleString("es-CO")}
            {h.changed_by_name ? ` · ${h.changed_by_name}` : ""}
          </div>
        </li>
      ))}
    </ol>
  );
}

// ─── Checklist ──────────────────────────────────────────────────────────────

function ChecklistTab({ order, onUpdated }: { order: ServiceOrderDetail; onUpdated: (o: ServiceOrderDetail) => void }) {
  const [templates, setTemplates] = useState<ChecklistTemplateInfo[]>([]);
  const [selectedTpl, setSelectedTpl] = useState("");
  const [applying, setApplying] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [adding, setAdding] = useState(false);
  const [editingNote, setEditingNote] = useState<number | null>(null);
  const [noteDraft, setNoteDraft] = useState("");

  useEffect(() => {
    api.serviceOrders.checklistTemplates()
      .then(ts => { setTemplates(ts); if (!selectedTpl && ts.length) setSelectedTpl(ts[0].key); })
      .catch(() => {});
    // eslint-disable-next-line
  }, []);

  const applyTemplate = async (replace: boolean) => {
    if (!selectedTpl) return;
    if (replace && order.checklist_total > 0 && !confirm("Esto reemplaza el checklist actual. ¿Continuar?")) return;
    setApplying(true);
    try {
      const upd = await api.serviceOrders.applyChecklistTemplate(order.id, selectedTpl, replace);
      onUpdated(upd);
      toast.success("Plantilla aplicada");
    } catch (e: any) {
      toast.error(e?.detail ?? "No se pudo aplicar");
    } finally { setApplying(false); }
  };

  const toggleDone = async (itemId: number, isDone: boolean) => {
    try {
      await api.serviceOrders.updateChecklistItem(order.id, itemId, { is_done: !isDone });
      const upd = await api.serviceOrders.get(order.id);
      onUpdated(upd);
    } catch (e: any) {
      toast.error(e?.detail ?? "Error");
    }
  };

  const addItem = async () => {
    if (!newLabel.trim()) return;
    setAdding(true);
    try {
      await api.serviceOrders.addChecklistItem(order.id, { label: newLabel.trim() });
      const upd = await api.serviceOrders.get(order.id);
      onUpdated(upd);
      setNewLabel("");
    } catch (e: any) {
      toast.error(e?.detail ?? "Error");
    } finally { setAdding(false); }
  };

  const removeItem = async (itemId: number) => {
    if (!confirm("¿Eliminar esta tarea?")) return;
    try {
      await api.serviceOrders.deleteChecklistItem(order.id, itemId);
      const upd = await api.serviceOrders.get(order.id);
      onUpdated(upd);
    } catch (e: any) {
      toast.error(e?.detail ?? "Error");
    }
  };

  const saveNote = async (itemId: number) => {
    try {
      await api.serviceOrders.updateChecklistItem(order.id, itemId, { note: noteDraft || undefined });
      const upd = await api.serviceOrders.get(order.id);
      onUpdated(upd);
      setEditingNote(null);
    } catch (e: any) {
      toast.error(e?.detail ?? "Error");
    }
  };

  const pct = order.checklist_total > 0 ? Math.round((order.checklist_done / order.checklist_total) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* Progreso + aplicar template */}
      <div className="bg-surface-2 border border-border p-4 flex items-center gap-4 flex-wrap">
        <div className="flex-1 min-w-[200px]">
          <div className="flex items-center justify-between text-xs text-fg-5 mb-1">
            <span>Avance del checklist</span>
            <span className="text-fg-3 font-mono">{order.checklist_done} / {order.checklist_total}</span>
          </div>
          <div className="h-2 bg-surface-3 overflow-hidden">
            <div className={`h-full ${pct === 100 ? "bg-emerald-400" : "bg-accent"}`} style={{ width: `${pct}%` }} />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <select value={selectedTpl} onChange={e => setSelectedTpl(e.target.value)}
            className="bg-surface-3 border border-border text-fg text-xs px-2 py-1.5 outline-none focus:border-accent">
            {templates.map(t => <option key={t.key} value={t.key}>{t.label} ({t.item_count})</option>)}
          </select>
          <button onClick={() => applyTemplate(false)} disabled={applying || !selectedTpl}
            className="text-xs text-fg-3 border border-border hover:border-accent hover:text-accent px-3 py-1.5 disabled:opacity-40">
            Añadir plantilla
          </button>
          <button onClick={() => applyTemplate(true)} disabled={applying || !selectedTpl}
            className="text-xs bg-accent hover:bg-accent-light text-zinc-900 font-semibold px-3 py-1.5 disabled:opacity-40">
            {applying ? <Loader2 size={12} className="animate-spin inline" /> : "Reemplazar"}
          </button>
        </div>
      </div>

      {/* Lista */}
      {order.checklist.length === 0 ? (
        <div className="text-fg-6 text-xs text-center py-10 border border-dashed border-border">
          Sin tareas en el checklist. Aplica una plantilla o añade tareas manualmente.
        </div>
      ) : (
        <ul className="space-y-1">
          {order.checklist.map(it => (
            <li key={it.id} className="bg-surface-2 border border-border px-3 py-2 flex items-start gap-3">
              <button onClick={() => toggleDone(it.id, it.is_done)}
                className={`mt-0.5 shrink-0 ${it.is_done ? "text-emerald-400" : "text-fg-6 hover:text-accent"}`}>
                {it.is_done ? <CheckSquare size={16} /> : <Square size={16} />}
              </button>
              <div className="flex-1 min-w-0">
                <div className={`text-sm ${it.is_done ? "line-through text-fg-5" : "text-fg"}`}>
                  {it.label}
                  {it.template_key && <span className="text-fg-6 text-[10px] ml-2 font-mono">[{it.template_key}]</span>}
                </div>
                {editingNote === it.id ? (
                  <div className="flex items-center gap-1 mt-1">
                    <input value={noteDraft} onChange={e => setNoteDraft(e.target.value)}
                      autoFocus placeholder="Nota..."
                      className="flex-1 bg-surface-3 border border-border text-fg text-xs px-2 py-1 outline-none focus:border-accent" />
                    <button onClick={() => saveNote(it.id)} className="text-accent hover:text-accent-light text-xs px-2 py-1">OK</button>
                    <button onClick={() => setEditingNote(null)} className="text-fg-6 hover:text-fg text-xs px-2 py-1">X</button>
                  </div>
                ) : it.note ? (
                  <div className="text-fg-5 text-xs italic mt-0.5 cursor-pointer hover:text-fg-3"
                    onClick={() => { setEditingNote(it.id); setNoteDraft(it.note || ""); }}>
                    {it.note}
                  </div>
                ) : (
                  <button onClick={() => { setEditingNote(it.id); setNoteDraft(""); }}
                    className="text-fg-6 text-[10px] hover:text-accent mt-0.5">+ nota</button>
                )}
              </div>
              <button onClick={() => removeItem(it.id)} className="text-fg-6 hover:text-red-400 mt-0.5">
                <Trash2 size={12} />
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Añadir manual */}
      <div className="bg-surface-2 border border-dashed border-border p-3">
        <div className="flex items-center gap-2">
          <input value={newLabel} onChange={e => setNewLabel(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") addItem(); }}
            placeholder="Añadir tarea manual…"
            className="flex-1 bg-surface-3 border border-border text-fg px-2 py-1.5 text-sm outline-none focus:border-accent" />
          <button onClick={addItem} disabled={adding || !newLabel.trim()}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold bg-accent hover:bg-accent-light text-zinc-900 disabled:opacity-40">
            {adding ? <Loader2 size={11} className="animate-spin" /> : <Plus size={11} />}
          </button>
        </div>
      </div>
    </div>
  );
}


// ─── Enviar reporte ─────────────────────────────────────────────────────────

function EnviarReporteModal({
  order, onClose, onSent,
}: {
  order: ServiceOrderDetail;
  onClose: () => void;
  onSent: () => void;
}) {
  const [to, setTo]           = useState("");
  const [cc, setCc]           = useState("");
  const [subject, setSubject] = useState(`CONINMAQ — Reporte de servicio ${order.order_number}`);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const send = async () => {
    const toList = to.split(/[,;\s]+/).map(s => s.trim()).filter(Boolean);
    if (toList.length === 0) { toast.error("Agrega al menos un destinatario"); return; }
    const ccList = cc.split(/[,;\s]+/).map(s => s.trim()).filter(Boolean);
    setSending(true);
    try {
      await api.serviceOrders.sendReport(order.id, {
        to: toList,
        cc: ccList.length > 0 ? ccList : undefined,
        subject: subject || undefined,
        message: message || undefined,
      });
      toast.success("Reporte enviado");
      onSent();
    } catch (e: any) {
      toast.error(e?.detail ?? "No se pudo enviar");
    } finally {
      setSending(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={sending ? undefined : onClose} />
      <div className="relative bg-surface-2 border border-border w-full max-w-xl max-h-[90vh] shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-5 py-3 border-b border-border shrink-0">
          <h2 className="text-fg font-semibold text-sm flex items-center gap-2">
            <Mail size={15} className="text-accent" /> Enviar reporte al cliente
          </h2>
          <button onClick={onClose} disabled={sending} className="text-fg-5 hover:text-fg disabled:opacity-40">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-fg-5 font-medium mb-1">Para *</label>
            <input value={to} onChange={e => setTo(e.target.value)} placeholder="cliente@empresa.com"
              className="w-full bg-surface-3 border border-border text-fg px-3 py-2 text-sm outline-none focus:border-accent" />
            <p className="text-fg-6 text-[10px] mt-1">Separa varios correos con coma, punto y coma o espacio.</p>
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-fg-5 font-medium mb-1">CC (opcional)</label>
            <input value={cc} onChange={e => setCc(e.target.value)} placeholder="otro@empresa.com"
              className="w-full bg-surface-3 border border-border text-fg px-3 py-2 text-sm outline-none focus:border-accent" />
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-fg-5 font-medium mb-1">Asunto</label>
            <input value={subject} onChange={e => setSubject(e.target.value)}
              className="w-full bg-surface-3 border border-border text-fg px-3 py-2 text-sm outline-none focus:border-accent" />
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-fg-5 font-medium mb-1">Mensaje (opcional)</label>
            <textarea rows={4} value={message} onChange={e => setMessage(e.target.value)}
              placeholder="Mensaje adicional para el cliente..."
              className="w-full bg-surface-3 border border-border text-fg px-3 py-2 text-sm outline-none focus:border-accent resize-none" />
          </div>
          <div className="bg-surface-3 border border-border px-3 py-2 text-fg-5 text-[11px]">
            Se adjunta el PDF del reporte. Las respuestas llegarán a <b className="text-fg-3">cgomez@coninmaqsas.com</b> y <b className="text-fg-3">comercioexterior@coninmaqsas.com</b>.
          </div>
        </div>

        <div className="flex justify-end gap-2 px-5 py-3 border-t border-border shrink-0 bg-surface-2">
          <button onClick={onClose} disabled={sending}
            className="px-4 py-2 text-xs text-fg-4 border border-border hover:border-border-light disabled:opacity-40">
            Cancelar
          </button>
          <button onClick={send} disabled={sending}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-accent hover:bg-accent-light text-zinc-900 disabled:opacity-40">
            {sending ? <Loader2 size={11} className="animate-spin" /> : <Send size={11} />}
            Enviar
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}


// ─── Stepper de estados ─────────────────────────────────────────────────────

// Flujo principal (sin esperando_repuesto que es una pausa paralela)
const STEPPER_FLOW: ServiceStatus[] = [
  "solicitado", "programado", "en_camino", "en_ejecucion", "finalizado", "cerrado",
];
const STATUS_ORDER: Record<ServiceStatus, number> = {
  solicitado: 0, programado: 1, en_camino: 2, en_ejecucion: 3,
  esperando_repuesto: 3,   // misma posición que en_ejecucion (es una pausa)
  finalizado: 4, cerrado: 5,
};

function StatusStepper({
  status, onChange, disabled,
}: {
  status: ServiceStatus;
  onChange: (s: ServiceStatus) => void;
  disabled: boolean;
}) {
  const currentIdx = STATUS_ORDER[status];
  const isWaitingPart = status === "esperando_repuesto";

  return (
    <div className="bg-surface-2 border border-border p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-fg-5 text-[10px] uppercase tracking-wider font-semibold">Flujo del servicio</h3>
        <button
          onClick={() => onChange(isWaitingPart ? "en_ejecucion" : "esperando_repuesto")}
          disabled={disabled || currentIdx < 2 || currentIdx >= 4}
          className={`flex items-center gap-1.5 text-[10px] uppercase tracking-wider px-2 py-1 border transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${
            isWaitingPart
              ? "bg-amber-500/15 text-amber-300 border-amber-500/40 hover:border-amber-400"
              : "bg-surface-3 text-fg-5 border-border hover:border-amber-500/60 hover:text-amber-300"
          }`}
          title={isWaitingPart ? "Reanudar ejecución" : "Pausar: esperando repuesto"}
        >
          <PauseCircle size={11} />
          {isWaitingPart ? "Esperando repuesto" : "Marcar pausa"}
        </button>
      </div>

      {/* Línea con pasos */}
      <div className="flex items-start overflow-x-auto">
        {STEPPER_FLOW.map((s, idx) => {
          const isPast    = idx < currentIdx && !isWaitingPart;
          const isCurrent = idx === currentIdx && !isWaitingPart;

          const circleBase = "w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold border-2 shrink-0 transition-colors";
          const circleCls =
            isPast    ? "bg-emerald-500 border-emerald-500 text-white"
          : isCurrent ? "bg-accent border-accent text-zinc-900 shadow-glow-xs"
                      : "bg-surface-3 border-border text-fg-6";

          const labelCls =
            isPast    ? "text-fg-3"
          : isCurrent ? "text-accent font-semibold"
                      : "text-fg-6";

          const barCls =
            idx < currentIdx ? "bg-emerald-500"
          : idx === currentIdx ? "bg-gradient-to-r from-accent to-border"
                               : "bg-border";

          return (
            <div key={s} className="flex items-start flex-1 min-w-[80px]">
              <button
                type="button"
                disabled={disabled}
                onClick={() => onChange(s)}
                className="flex flex-col items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed group"
                title={isCurrent ? "Estado actual" : isPast ? "Volver a este estado" : "Avanzar a este estado"}
              >
                <div className={`${circleCls} ${circleBase} ${!disabled && !isCurrent ? "group-hover:border-accent" : ""}`}>
                  {isPast ? <Check size={13} /> : idx + 1}
                </div>
                <div className={`text-[10px] uppercase tracking-wider text-center leading-tight ${labelCls}`}>
                  {SERVICE_STATUS_LABELS[s]}
                </div>
              </button>
              {idx < STEPPER_FLOW.length - 1 && (
                <div className={`flex-1 h-0.5 mt-3.5 ${barCls}`} />
              )}
            </div>
          );
        })}
      </div>

      {/* Banda de "esperando repuesto" */}
      {isWaitingPart && (
        <div className="mt-3 flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs px-3 py-2">
          <PauseCircle size={13} />
          <span>Pausado — esperando repuesto. El tiempo no cuenta como avance hasta que reanudes.</span>
        </div>
      )}
    </div>
  );
}


// ─── Helpers ────────────────────────────────────────────────────────────────

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-surface-2 border border-border p-4">
      <h3 className="text-fg-5 text-[10px] uppercase tracking-wider font-semibold mb-3">{title}</h3>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function KV({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-fg-5 text-xs">{label}</span>
      <span className="text-fg text-sm text-right">{value}</span>
    </div>
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

function TextArea({ label, value, onChange, rows = 4 }: { label: string; value: string; onChange: (v: string) => void; rows?: number }) {
  return (
    <Field label={label}>
      <textarea rows={rows} value={value} onChange={e => onChange(e.target.value)}
        className="w-full bg-surface-3 border border-border text-fg px-3 py-2 text-sm outline-none focus:border-accent resize-none" />
    </Field>
  );
}
