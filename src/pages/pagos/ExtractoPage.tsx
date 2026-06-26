import { useEffect, useRef, useState } from "react";
import { Upload, Loader2, FileSpreadsheet, Clock, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { api, type BankTransactionResponse } from "../../services/api";
import { useAbility } from "../../context/AbilityContext";
import StatCard from "../../components/StatCard";
import DatePicker from "../../components/ui/DatePicker";

const fmtCOP = new Intl.NumberFormat("es-CO", {
  style: "currency", currency: "COP", maximumFractionDigits: 0,
});
function fmt(amount: number) {
  return fmtCOP.format(Number(amount));
}

function fmtDate(d: string) {
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}

export default function ExtractoPage() {
  const ability = useAbility();
  const canUpload = ability.can("create", "Payments");

  const [txs, setTxs] = useState<BankTransactionResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [filter, setFilter] = useState<string>("all");
  const [uploadDate, setUploadDate] = useState(new Date().toISOString().slice(0, 10));
  const fileRef = useRef<HTMLInputElement>(null);

  async function load() {
    setLoading(true);
    try {
      const matched = filter === "all" ? undefined : filter === "matched";
      const data = await api.payments.bankTransactions.list(matched);
      setTxs(data);
    } catch {
      toast.error("Error cargando extracto");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [filter]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setUploading(true);
    try {
      const summary = await api.payments.bankTransactions.upload(file, uploadDate);
      toast.success(
        `Importadas: ${summary.imported} | Omitidas: ${summary.skipped} | Auto-conciliadas: ${summary.auto_matched}`
      );
      await load();
    } catch (err: unknown) {
      const detail = (err as { detail?: string }).detail;
      toast.error(detail ?? "Error al importar el archivo");
    } finally {
      setUploading(false);
    }
  }

  const total    = txs.length;
  const matched  = txs.filter((t) => t.matched).length;
  const pending  = total - matched;

  return (
    <div className="p-6 space-y-6 animate-fade-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-fg">Extracto bancario</h1>
          <p className="text-sm text-fg-5 mt-0.5">Transacciones importadas de Bancolombia</p>
        </div>
        {canUpload && (
          <div className="flex items-end gap-3">
            <div className="flex flex-col gap-1 w-44">
              <label className="text-xs text-fg-5 uppercase tracking-wide font-medium">Día a importar</label>
              <DatePicker
                value={uploadDate}
                onChange={(v) => setUploadDate(v ?? "")}
                placeholder="Seleccionar día"
              />
            </div>
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={handleUpload}
            />
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading || !uploadDate}
              className="flex items-center gap-2 px-4 py-2 bg-accent text-black text-sm font-medium rounded hover:bg-accent/90 transition-colors disabled:opacity-60"
            >
              {uploading
                ? <Loader2 size={15} className="animate-spin" />
                : <Upload size={15} />
              }
              Importar Excel
            </button>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Total"       value={String(total)}   icon={FileSpreadsheet} />
        <StatCard label="Pendientes"  value={String(pending)} icon={Clock} />
        <StatCard label="Conciliados" value={String(matched)} icon={CheckCircle2} />
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {[
          { key: "all",     label: "Todos"       },
          { key: "pending", label: "Pendientes"  },
          { key: "matched", label: "Conciliados" },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`px-3 py-1.5 rounded text-xs font-medium transition-all ${
              filter === key
                ? "bg-accent text-black"
                : "bg-surface-3 text-fg-4 hover:text-fg"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-surface-2 border border-border rounded-lg overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 size={24} className="animate-spin text-fg-5" />
          </div>
        ) : txs.length === 0 ? (
          <p className="text-center text-fg-5 py-16 text-sm">Sin transacciones</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-fg-5 text-xs uppercase tracking-wide">
                <th className="px-4 py-3 text-left font-medium">Fecha</th>
                <th className="px-4 py-3 text-left font-medium">Descripción</th>
                <th className="px-4 py-3 text-right font-medium">Valor</th>
                <th className="px-4 py-3 text-left font-medium">Cuenta</th>
                <th className="px-4 py-3 text-left font-medium">Estado</th>
              </tr>
            </thead>
            <tbody>
              {txs.map((tx) => (
                <tr key={tx.id} className="border-b border-border/50 hover:bg-surface-3/50 transition-colors">
                  <td className="px-4 py-3 text-fg-4 whitespace-nowrap">{fmtDate(tx.transaction_date)}</td>
                  <td className="px-4 py-3 text-fg-3 max-w-xs truncate">{tx.description || "—"}</td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <span className="font-semibold text-accent font-mono text-sm">
                      {fmt(tx.amount)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-fg-5 font-mono text-xs">{tx.account || "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      tx.matched
                        ? "bg-green-500/10 text-green-400 border border-green-500/20"
                        : "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20"
                    }`}>
                      {tx.matched ? "Conciliado" : "Pendiente"}
                    </span>
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
