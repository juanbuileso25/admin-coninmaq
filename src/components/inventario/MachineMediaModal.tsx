import { useEffect, useRef, useState } from "react";
import { X, Upload, Film, ImageIcon, Loader2, Images, Download } from "lucide-react";
import { toast } from "sonner";
import type { Machine, MachineMedia } from "../../types/machine";
import { api } from "../../services/api";

interface Props {
  machine: Machine | null;
  onClose: () => void;
}

export default function MachineMediaModal({ machine, onClose }: Props) {
  const [media,          setMedia]          = useState<MachineMedia[]>([]);
  const [loading,        setLoading]        = useState(false);
  const [uploading,      setUploading]      = useState(false);
  const [deletingId,     setDeletingId]     = useState<string | null>(null);
  const [lightbox,       setLightbox]       = useState<MachineMedia | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!machine) return;
    setLoading(true);
    api.machines.listMedia(machine.id)
      .then((items) => setMedia(items as unknown as MachineMedia[]))
      .catch(() => toast.error("Error al cargar recursos"))
      .finally(() => setLoading(false));
  }, [machine]);

  if (!machine) return null;

  const handleUpload = async (files: File[]) => {
    if (!files.length) return;
    setUploading(true);
    let uploaded = 0;
    for (const file of files) {
      try {
        const item = await api.machines.uploadMedia(machine.id, file);
        setMedia((prev) => [...prev, item as unknown as MachineMedia]);
        uploaded++;
      } catch (e: unknown) {
        const err = e as { status?: number };
        if (err.status === 415) toast.error(`Tipo no permitido: ${file.name}`);
        else if (err.status === 413) toast.error(`Archivo demasiado grande: ${file.name}`);
        else toast.error(`Error al subir: ${file.name}`);
      }
    }
    if (uploaded > 0) {
      toast.success(uploaded === 1 ? "Archivo subido" : `${uploaded} archivos subidos`);
    }
    setUploading(false);
  };

  const handleDelete = async (mediaId: string) => {
    setDeletingId(mediaId);
    try {
      await api.machines.deleteMedia(machine.id, mediaId);
      setMedia((prev) => prev.filter((m) => m.id !== mediaId));
      toast.success("Archivo eliminado");
    } catch {
      toast.error("Error al eliminar");
    } finally {
      setDeletingId(null);
    }
  };

  const images = media.filter((m) => m.media_type === "image");
  const videos = media.filter((m) => m.media_type === "video");

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="pointer-events-auto w-full max-w-5xl max-h-[90vh] bg-surface-2 border border-border flex flex-col shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
            <div className="flex items-center gap-3">
              <Images size={18} className="text-accent" />
              <div>
                <p className="text-fg font-semibold text-sm">{machine.model}</p>
                <p className="text-fg-6 text-xs">{machine.code} · Recursos internos</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center text-fg-5 hover:text-fg hover:bg-surface-4 transition-all"
            >
              <X size={16} />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">

            {loading ? (
              <div className="flex items-center justify-center py-16 text-fg-5">
                <Loader2 size={24} className="animate-spin" />
              </div>
            ) : (
              <>
                {/* Upload area */}
                <div>
                  <button
                    type="button"
                    onClick={() => inputRef.current?.click()}
                    disabled={uploading}
                    className="w-full flex items-center justify-center gap-2 py-4 border border-dashed border-border-light
                               text-fg-5 hover:text-accent hover:border-accent/40 text-sm transition-all disabled:opacity-50"
                  >
                    {uploading
                      ? <><Loader2 size={15} className="animate-spin" /> Subiendo archivos...</>
                      : <><Upload size={15} /> Subir imágenes o videos</>
                    }
                  </button>
                  <p className="text-fg-7 text-[11px] mt-1.5 text-center">
                    Imágenes: jpg, png, webp (máx. 10 MB) · Videos: mp4, mov, avi (máx. 500 MB)
                  </p>
                  <input
                    ref={inputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/x-msvideo"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      const files = Array.from(e.target.files ?? []);
                      e.target.value = "";
                      handleUpload(files);
                    }}
                  />
                </div>

                {/* Empty state */}
                {media.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-12 text-fg-6 gap-2">
                    <Images size={36} className="opacity-30" />
                    <p className="text-sm">Sin recursos todavía</p>
                    <p className="text-xs text-fg-7">Sube imágenes o videos para esta máquina</p>
                  </div>
                )}

                {/* Images */}
                {images.length > 0 && (
                  <section>
                    <div className="flex items-center gap-3 mb-3">
                      <ImageIcon size={13} className="text-fg-5" />
                      <span className="text-fg-4 text-xs font-semibold uppercase tracking-wider">
                        Imágenes ({images.length})
                      </span>
                      <div className="flex-1 h-px bg-border" />
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                      {images.map((item) => (
                        <MediaCard
                          key={item.id}
                          item={item}
                          deleting={deletingId === item.id}
                          onView={() => setLightbox(item)}
                          onDelete={() => handleDelete(item.id)}
                        />
                      ))}
                    </div>
                  </section>
                )}

                {/* Videos */}
                {videos.length > 0 && (
                  <section>
                    <div className="flex items-center gap-3 mb-3">
                      <Film size={13} className="text-fg-5" />
                      <span className="text-fg-4 text-xs font-semibold uppercase tracking-wider">
                        Videos ({videos.length})
                      </span>
                      <div className="flex-1 h-px bg-border" />
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                      {videos.map((item) => (
                        <MediaCard
                          key={item.id}
                          item={item}
                          deleting={deletingId === item.id}
                          onView={() => setLightbox(item)}
                          onDelete={() => handleDelete(item.id)}
                        />
                      ))}
                    </div>
                  </section>
                )}
              </>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-6 py-3 border-t border-border bg-surface-3 flex-shrink-0">
            <p className="text-fg-6 text-xs">
              {media.length === 0
                ? "Sin archivos"
                : `${images.length} imagen${images.length !== 1 ? "es" : ""} · ${videos.length} video${videos.length !== 1 ? "s" : ""}`
              }
            </p>
            <button
              onClick={onClose}
              className="px-5 py-2 text-sm text-fg-4 hover:text-fg border border-border hover:border-border-light transition-all"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>

      {/* Lightbox (imágenes y videos) */}
      {lightbox && (
        <div
          className="fixed inset-0 z-[60] bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <div className="absolute top-4 right-4 flex items-center gap-2">
            <button
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-white/70 hover:text-white bg-white/10 hover:bg-white/20 transition-all"
              onClick={(e) => { e.stopPropagation(); downloadFile(lightbox.url, lightbox.file_name); }}
            >
              <Download size={13} /> Descargar
            </button>
            <button
              className="w-9 h-9 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-all"
              onClick={() => setLightbox(null)}
            >
              <X size={20} />
            </button>
          </div>

          {lightbox.media_type === "image" ? (
            <img
              src={lightbox.url}
              alt={lightbox.title ?? lightbox.file_name}
              className="max-w-full max-h-full object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <video
              src={lightbox.url}
              controls
              autoPlay
              className="max-w-full max-h-full"
              onClick={(e) => e.stopPropagation()}
            />
          )}

          <p className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/50 text-xs">
            {lightbox.file_name}
          </p>
        </div>
      )}
    </>
  );
}

/* ── Download helper (works cross-origin via fetch+blob) ── */
async function downloadFile(url: string, fileName: string) {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(blobUrl);
  } catch {
    // Fallback: abrir en nueva pestaña
    window.open(url, "_blank");
  }
}

/* ── Media Card ── */
function MediaCard({
  item,
  deleting,
  onView,
  onDelete,
}: {
  item: MachineMedia;
  deleting: boolean;
  onView: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="relative group bg-surface-3 border border-border overflow-hidden aspect-square">
      {item.media_type === "image" ? (
        <img
          src={item.url}
          alt={item.title ?? item.file_name}
          className="w-full h-full object-contain p-1"
        />
      ) : (
        <div className="w-full h-full relative">
          <video
            src={item.url}
            preload="metadata"
            muted
            playsInline
            className="w-full h-full object-cover"
          />
          <div className="absolute bottom-1 left-1 bg-black/60 px-1.5 py-0.5 flex items-center gap-1">
            <Film size={9} className="text-white" />
            <span className="text-[9px] text-white/80 max-w-[80px] truncate">{item.file_name}</span>
          </div>
        </div>
      )}

      {/* Overlay */}
      {deleting ? (
        <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
          <Loader2 size={20} className="animate-spin text-white" />
        </div>
      ) : (
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2">
          <div className="flex flex-col gap-1.5">
            <button
              type="button"
              onClick={onView}
              className="text-[11px] font-semibold text-white bg-surface-4/80 hover:bg-surface-4 px-3 py-1.5 transition-colors w-full text-center"
            >
              Ver
            </button>
            <button
              type="button"
              onClick={() => downloadFile(item.url, item.file_name)}
              className="text-[11px] font-semibold text-white bg-surface-4/60 hover:bg-surface-4 px-3 py-1.5 transition-colors w-full text-center flex items-center justify-center gap-1"
            >
              <Download size={10} /> Descargar
            </button>
          </div>
          <button
            type="button"
            onClick={onDelete}
            className="text-[11px] font-semibold text-white bg-red-700/80 hover:bg-red-600 px-3 py-1.5 transition-colors w-full text-center"
          >
            Eliminar
          </button>
        </div>
      )}

      {/* Type badge */}
      <span className="absolute bottom-1.5 right-1.5 opacity-50">
        {item.media_type === "video"
          ? <Film size={11} className="text-white" />
          : <ImageIcon size={11} className="text-white" />
        }
      </span>
    </div>
  );
}
