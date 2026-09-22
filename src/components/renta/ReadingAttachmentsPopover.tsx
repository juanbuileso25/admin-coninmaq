import { useRef, useState } from "react";
import { Upload, Trash2, ExternalLink, X } from "lucide-react";
import { api, type RentalReadingResponse } from "../../services/api";
import Select from "../ui/Select";

interface Props {
  reading: RentalReadingResponse;
  onClose: () => void;
  onChange: () => void;
}

const KIND_LABELS: Record<string, string> = {
  receipt: "Recibo",
  invoice: "Factura",
  horometer_photo: "Foto horómetro",
  other: "Otro",
};

export default function ReadingAttachmentsPopover({ reading, onClose, onChange }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [kind, setKind] = useState<string>("horometer_photo");
  const [uploading, setUploading] = useState(false);

  async function handleUpload(file: File) {
    setUploading(true);
    try {
      await api.rental.uploadReadingAttachment(reading.id, file, kind);
      onChange();
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("¿Eliminar este archivo?")) return;
    await api.rental.deleteReadingAttachment(id);
    onChange();
  }

  return (
    <div
      className="absolute right-0 top-full mt-1 z-30 bg-surface-2 border border-border shadow-xl w-72 animate-fade-in"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <span className="text-fg-3 text-xs font-semibold">Adjuntos</span>
        <button onClick={onClose} className="text-fg-5 hover:text-fg transition-colors">
          <X size={14} />
        </button>
      </div>

      <div className="p-3 space-y-2 max-h-60 overflow-y-auto">
        {reading.attachments.length === 0 && (
          <p className="text-fg-6 text-xs text-center py-2">Sin adjuntos</p>
        )}
        {reading.attachments.map(att => (
          <div key={att.id} className="flex items-center gap-2 bg-surface-3 border border-border px-2.5 py-2 text-xs">
            <div className="flex-1 min-w-0">
              <div className="text-fg-2 truncate">{att.file_name}</div>
              <div className="text-fg-6 text-[10px]">{KIND_LABELS[att.kind] ?? att.kind}</div>
            </div>
            <a href={att.file_url} target="_blank" rel="noreferrer" className="text-fg-5 hover:text-accent">
              <ExternalLink size={12} />
            </a>
            <button onClick={() => handleDelete(att.id)} className="text-fg-5 hover:text-red-400">
              <Trash2 size={12} />
            </button>
          </div>
        ))}
      </div>

      <div className="border-t border-border p-3 space-y-2">
        <Select
          value={kind}
          onChange={setKind}
          compact
          options={[
            { value: "horometer_photo", label: "Foto horómetro" },
            { value: "receipt",         label: "Recibo" },
            { value: "invoice",         label: "Factura" },
            { value: "other",           label: "Otro" },
          ]}
        />
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleUpload(f);
            e.target.value = "";
          }}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="w-full flex items-center justify-center gap-2 bg-accent/10 border border-accent/40 text-accent text-xs font-semibold py-1.5 hover:bg-accent/20 transition-all disabled:opacity-40"
        >
          <Upload size={12} />
          {uploading ? "Subiendo..." : "Subir archivo"}
        </button>
      </div>
    </div>
  );
}
