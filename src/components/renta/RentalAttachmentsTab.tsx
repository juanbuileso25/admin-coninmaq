import { useEffect, useMemo, useState } from "react";
import { ExternalLink, Filter } from "lucide-react";
import { api } from "../../services/api";

interface Props {
  machineId: string;
}

type AttachmentRow = {
  id: string;
  file_url: string;
  file_name: string;
  content_type: string | null;
  created_at: string;
  source: "reading" | "maintenance";
  source_label: string;
  source_ref: string;
  kind?: string;
};

const KIND_LABELS: Record<string, string> = {
  receipt: "Recibo",
  invoice: "Factura",
  horometer_photo: "Foto horómetro",
  other: "Otro",
};

function formatDate(d: string): string {
  return new Date(d).toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" });
}

export default function RentalAttachmentsTab({ machineId }: Props) {
  const [rows, setRows] = useState<AttachmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "reading" | "maintenance">("all");

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [readings, maints] = await Promise.all([
          api.rental.listReadings(machineId),
          api.rental.listMaintenances(machineId),
        ]);
        const all: AttachmentRow[] = [];
        for (const r of readings) {
          for (const a of r.attachments) {
            all.push({
              id: a.id,
              file_url: a.file_url,
              file_name: a.file_name,
              content_type: a.content_type,
              created_at: a.created_at,
              source: "reading",
              source_label: `Registro ${r.date}`,
              source_ref: String(r.id),
              kind: a.kind,
            });
          }
        }
        for (const m of maints) {
          for (const a of m.attachments) {
            all.push({
              id: a.id,
              file_url: a.file_url,
              file_name: a.file_name,
              content_type: a.content_type,
              created_at: a.created_at,
              source: "maintenance",
              source_label: `Mant. ${m.date} (${m.kind === "preventive" ? "Prev." : "Corr."})`,
              source_ref: m.id,
            });
          }
        }
        all.sort((a, b) => b.created_at.localeCompare(a.created_at));
        setRows(all);
      } finally {
        setLoading(false);
      }
    })();
  }, [machineId]);

  const filtered = useMemo(
    () => filter === "all" ? rows : rows.filter(r => r.source === filter),
    [rows, filter]
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Filter size={13} className="text-fg-5" />
        {(["all", "reading", "maintenance"] as const).map(k => (
          <button
            key={k}
            onClick={() => setFilter(k)}
            className={`px-3 py-1.5 text-xs font-medium border transition-all
              ${filter === k
                ? "bg-accent/10 border-accent text-accent"
                : "border-border text-fg-4 hover:border-border-light"}`}
          >
            {k === "all" ? "Todos" : k === "reading" ? "Facturación" : "Mantenimiento"}
          </button>
        ))}
        <span className="text-fg-6 text-xs ml-auto">{filtered.length} archivos</span>
      </div>

      <div className="bg-surface-2 border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-3 text-fg-5 text-[10px] uppercase tracking-wider">
                <th className="text-left px-3 py-2 font-medium">Archivo</th>
                <th className="text-left px-3 py-2 font-medium">Tipo</th>
                <th className="text-left px-3 py-2 font-medium">Origen</th>
                <th className="text-left px-3 py-2 font-medium">Subido</th>
                <th className="text-right px-3 py-2 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading && (
                <tr><td colSpan={5} className="text-center py-8 text-fg-6 text-sm">Cargando...</td></tr>
              )}
              {!loading && filtered.length === 0 && (
                <tr><td colSpan={5} className="text-center py-12 text-fg-6 text-sm">Sin archivos</td></tr>
              )}
              {filtered.map(r => (
                <tr key={`${r.source}-${r.id}`} className="hover:bg-surface-3 transition-colors">
                  <td className="px-3 py-2 text-fg-2 text-xs truncate max-w-[250px]">{r.file_name}</td>
                  <td className="px-3 py-2 text-fg-4 text-xs">
                    {r.kind ? (KIND_LABELS[r.kind] ?? r.kind) : "Mantenimiento"}
                  </td>
                  <td className="px-3 py-2 text-fg-4 text-xs">{r.source_label}</td>
                  <td className="px-3 py-2 text-fg-5 text-xs">{formatDate(r.created_at)}</td>
                  <td className="px-3 py-2 text-right">
                    <a href={r.file_url} target="_blank" rel="noreferrer" className="text-fg-5 hover:text-accent transition-colors inline-flex">
                      <ExternalLink size={12} />
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
