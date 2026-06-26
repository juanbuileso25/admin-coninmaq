import { useEffect, useRef, useState } from "react";
import { ExternalLink, Link2Off, Loader2, Banknote, Clock, CheckCircle2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { api, type PaymentResponse } from "../../services/api";
import { useAbility } from "../../context/AbilityContext";
import StatCard from "../../components/StatCard";

const STATUS_LABELS: Record<string, string> = {
  pending: "Pendiente",
  matched: "Conciliado",
};

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20",
  matched: "bg-green-500/10 text-green-400 border border-green-500/20",
};

const fmtCOP = new Intl.NumberFormat("es-CO", {
  style: "currency", currency: "COP", maximumFractionDigits: 0,
});
function fmt(amount: number | null) {
  if (amount == null) return "—";
  return fmtCOP.format(Number(amount));
}

function fmtDate(d: string | null) {
  if (!d) return "—";
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}

function isAdminUpload(sender: string) {
  return sender.startsWith("admin:");
}

// ── Upload Modal ──────────────────────────────────────────────────────────────

interface UploadModalProps {
  onClose: () => void;
  onSuccess: (payments: PaymentResponse[]) => void;
}

function UploadModal({ onClose, onSuccess }: UploadModalProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [payerName, setPayerName] = useState("");
  const [caption, setCaption] = useState("");
  const [uploading, setUploading] = useState(false);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files ?? []);
    setFiles((prev) => {
      const names = new Set(prev.map((f) => f.name));
      return [...prev, ...selected.filter((f) => !names.has(f.name))];
    });
    e.target.value = "";
  }

  function removeFile(name: string) {
    setFiles((prev) => prev.filter((f) => f.name !== name));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!files.length) return;
    setUploading(true);
    try {
      const payments = await api.payments.upload(files, payerName || undefined, caption || undefined);
      toast.success(
        payments.length === 1
          ? "Comprobante registrado correctamente"
          : `${payments.length} comprobantes registrados de ${files.length} archivo${files.length !== 1 ? "s" : ""}`
      );
      onSuccess(payments);
      onClose();
    } catch (err: unknown) {
      const detail = (err as { detail?: string }).detail;
      toast.error(detail ?? "Error al procesar los comprobantes");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-surface-2 border border-border rounded-lg w-full max-w-md shadow-xl animate-fade-up">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-sm font-semibold text-fg">Subir comprobantes</h2>
          <button onClick={onClose} className="text-fg-5 hover:text-fg transition-colors">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* File picker */}
          <div>
            <label className="text-xs text-fg-5 uppercase tracking-wide font-medium block mb-2">
              Archivos *
            </label>
            <input
              ref={fileRef}
              type="file"
              accept="image/*,.pdf"
              multiple
              className="hidden"
              onChange={handleFileChange}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="w-full border border-dashed border-border rounded-lg py-6 flex flex-col items-center gap-2
                         text-fg-5 hover:border-accent/40 hover:text-fg-3 transition-all"
            >
              <Upload size={20} />
              <span className="text-xs">Seleccionar imágenes o PDFs</span>
              <span className="text-[10px] text-fg-6">Puedes seleccionar varios a la vez</span>
            </button>

            {/* File list */}
            {files.length > 0 && (
              <ul className="mt-2 space-y-1 max-h-40 overflow-y-auto">
                {files.map((f) => (
                  <li key={f.name} className="flex items-center justify-between bg-surface-3 rounded px-3 py-1.5">
                    <span className="text-xs text-fg-3 truncate">{f.name}</span>
                    <button
                      type="button"
                      onClick={() => removeFile(f.name)}
                      className="text-fg-5 hover:text-red-400 transition-colors ml-2 flex-shrink-0"
                    >
                      <X size={12} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Payer name */}
          <div>
            <label className="text-xs text-fg-5 uppercase tracking-wide font-medium block mb-1.5">
              Nombre del pagador
            </label>
            <input
              type="text"
              value={payerName}
              onChange={(e) => setPayerName(e.target.value)}
              placeholder="Opcional — si Claude no lo detecta"
              className="w-full bg-surface-3 border border-border rounded px-3 py-2 text-sm text-fg
                         placeholder:text-fg-6 focus:outline-none focus:border-accent/50"
            />
          </div>

          {/* Caption / context */}
          <div>
            <label className="text-xs text-fg-5 uppercase tracking-wide font-medium block mb-1.5">
              Contexto adicional
            </label>
            <input
              type="text"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Ej: todos son de $3,000,000"
              className="w-full bg-surface-3 border border-border rounded px-3 py-2 text-sm text-fg
                         placeholder:text-fg-6 focus:outline-none focus:border-accent/50"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 text-sm text-fg-4 hover:text-fg bg-surface-3 rounded transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!files.length || uploading}
              className="flex-1 py-2 text-sm font-medium bg-accent text-black rounded
                         hover:bg-accent/90 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
              {uploading
                ? "Procesando..."
                : `Subir${files.length > 1 ? ` (${files.length})` : ""}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function ComprobantesPage() {
  const ability = useAbility();
  const canWrite = ability.can("update", "Payments");
  const canCreate = ability.can("create", "Payments");

  const [payments, setPayments] = useState<PaymentResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [unmatching, setUnmatching] = useState<string | null>(null);
  const [showUpload, setShowUpload] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const statusFilter = filter === "all" ? undefined : filter;
      const data = await api.payments.list(statusFilter);
      setPayments(data);
    } catch {
      toast.error("Error cargando comprobantes");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [filter]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleUnmatch(id: string) {
    setUnmatching(id);
    try {
      const updated = await api.payments.unmatch(id);
      setPayments((prev) => prev.map((p) => (p.id === id ? updated : p)));
      toast.success("Conciliación eliminada");
    } catch {
      toast.error("Error al desconciliar");
    } finally {
      setUnmatching(null);
    }
  }

  function handleUploadSuccess(newPayments: PaymentResponse[]) {
    setPayments((prev) => [...newPayments, ...prev]);
  }

  const total   = payments.length;
  const pending = payments.filter((p) => p.status === "pending").length;
  const matched = payments.filter((p) => p.status === "matched").length;

  return (
    <div className="p-6 space-y-6 animate-fade-up">
      {showUpload && (
        <UploadModal
          onClose={() => setShowUpload(false)}
          onSuccess={handleUploadSuccess}
        />
      )}

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-fg">Comprobantes de pago</h1>
          <p className="text-sm text-fg-5 mt-0.5">Recibos recibidos por WhatsApp o cargados manualmente</p>
        </div>
        {canCreate && (
          <button
            onClick={() => setShowUpload(true)}
            className="flex items-center gap-2 px-4 py-2 bg-accent text-black text-sm font-medium
                       rounded hover:bg-accent/90 transition-colors"
          >
            <Upload size={15} />
            Subir comprobante
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Total"       value={String(total)}   icon={Banknote} />
        <StatCard label="Pendientes"  value={String(pending)} icon={Clock} />
        <StatCard label="Conciliados" value={String(matched)} icon={CheckCircle2} />
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {["all", "pending", "matched"].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded text-xs font-medium transition-all ${
              filter === s
                ? "bg-accent text-black"
                : "bg-surface-3 text-fg-4 hover:text-fg"
            }`}
          >
            {s === "all" ? "Todos" : STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-surface-2 border border-border rounded-lg overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 size={24} className="animate-spin text-fg-5" />
          </div>
        ) : payments.length === 0 ? (
          <p className="text-center text-fg-5 py-16 text-sm">Sin comprobantes</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-fg-5 text-xs uppercase tracking-wide">
                <th className="px-4 py-3 text-left font-medium">Recibido</th>
                <th className="px-4 py-3 text-left font-medium">Fecha tx.</th>
                <th className="px-4 py-3 text-right font-medium">Valor</th>
                <th className="px-4 py-3 text-left font-medium">Pagador</th>
                <th className="px-4 py-3 text-left font-medium">Origen</th>
                <th className="px-4 py-3 text-left font-medium">Estado</th>
                <th className="px-4 py-3 text-left font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id} className="border-b border-border/50 hover:bg-surface-3/50 transition-colors">
                  <td className="px-4 py-3 text-fg-4 whitespace-nowrap">
                    {fmtDate(p.created_at.slice(0, 10))}
                  </td>
                  <td className="px-4 py-3 text-fg-4 whitespace-nowrap">
                    {fmtDate(p.extracted_date)}
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <span className="font-semibold text-accent font-mono text-sm">
                      {fmt(p.extracted_amount)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-fg-3">{p.payer_name ?? "—"}</td>
                  <td className="px-4 py-3 text-fg-4 text-xs">
                    {isAdminUpload(p.whatsapp_sender) ? (
                      <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 font-medium">
                        Admin
                      </span>
                    ) : (
                      <span title={p.whatsapp_sender}>
                        {p.whatsapp_sender_name ?? p.whatsapp_sender}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_STYLES[p.status]}`}>
                      {STATUS_LABELS[p.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <a
                        href={p.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-fg-5 hover:text-accent transition-colors"
                        title="Ver comprobante"
                      >
                        <ExternalLink size={14} />
                      </a>
                      {canWrite && p.status === "matched" && (
                        <button
                          onClick={() => handleUnmatch(p.id)}
                          disabled={unmatching === p.id}
                          className="text-fg-5 hover:text-red-400 transition-colors disabled:opacity-50"
                          title="Eliminar conciliación"
                        >
                          {unmatching === p.id
                            ? <Loader2 size={14} className="animate-spin" />
                            : <Link2Off size={14} />
                          }
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
