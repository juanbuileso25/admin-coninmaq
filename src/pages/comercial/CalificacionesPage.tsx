import { useEffect, useState } from "react";
import { Star, ThumbsUp, MessageSquare, Users, CheckCircle, XCircle, Share2, Copy, Check, X } from "lucide-react";
import { api } from "../../services/api";
import type { ReviewResponse, PaginatedResponse } from "../../services/api";

const SURVEY_URL = "https://coninmaqsas.com/calificar";

const QR_URL = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(SURVEY_URL)}&bgcolor=ffffff&color=1a1a1a&margin=4`;

function ShareModal({ onClose }: { onClose: () => void }) {
  const [copied, setCopied] = useState(false);

  const copyLink = async () => {
    await navigator.clipboard.writeText(SURVEY_URL);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadQR = () => {
    const a = document.createElement("a");
    a.href = QR_URL;
    a.download = "qr-encuesta-coninmaq.png";
    a.target = "_blank";
    a.click();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4" onClick={onClose}>
      <div className="bg-surface-2 border border-border rounded-xl p-6 w-full max-w-sm space-y-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-fg">Compartir encuesta</h2>
          <button onClick={onClose} className="text-fg-5 hover:text-fg transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Link */}
        <div className="space-y-2">
          <p className="text-xs text-fg-5 uppercase tracking-wide">Enlace directo</p>
          <div className="flex items-center gap-2 bg-surface-3 border border-border rounded-lg px-3 py-2">
            <span className="text-xs text-fg-4 flex-1 truncate">{SURVEY_URL}</span>
            <button
              onClick={copyLink}
              className="flex-shrink-0 text-fg-4 hover:text-accent transition-colors"
              title="Copiar enlace"
            >
              {copied ? <Check size={15} className="text-green-400" /> : <Copy size={15} />}
            </button>
          </div>
          {copied && <p className="text-xs text-green-400">¡Enlace copiado!</p>}
        </div>

        {/* QR */}
        <div className="space-y-3">
          <p className="text-xs text-fg-5 uppercase tracking-wide">Código QR</p>
          <div className="flex justify-center bg-white rounded-lg p-4">
            <img
              src={QR_URL}
              alt="QR encuesta"
              width={160}
              height={160}
              className="w-40 h-40"
            />
          </div>
          <button
            onClick={downloadQR}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-surface-3 border border-border text-fg-3 text-sm font-medium hover:bg-surface-4 hover:text-fg transition-colors"
          >
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Descargar QR
          </button>
        </div>
      </div>
    </div>
  );
}

const PAGE_SIZE = 20;

function StarDisplay({ score }: { score: number }) {
  const rounded = Math.round(score);
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          size={12}
          className={n <= rounded ? "text-yellow-400 fill-yellow-400" : "text-fg-6"}
        />
      ))}
      <span className="text-xs text-fg-4 ml-1">{score.toFixed(1)}</span>
    </div>
  );
}

function NpsBadge({ nps }: { nps: number }) {
  const color =
    nps >= 9 ? "text-green-400 bg-green-400/10" :
    nps >= 7 ? "text-yellow-400 bg-yellow-400/10" :
               "text-red-400 bg-red-400/10";
  return (
    <span className={`inline-flex items-center justify-center w-7 h-7 rounded text-xs font-bold ${color}`}>
      {nps}
    </span>
  );
}

interface TestimonialEditState {
  reviewId: number;
  name: string;
  role: string;
}

export default function CalificacionesPage() {
  const [reviews, setReviews] = useState<ReviewResponse[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const [editState, setEditState] = useState<TestimonialEditState | null>(null);
  const [showShare, setShowShare] = useState(false);

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const load = async () => {
    setLoading(true);
    try {
      const res: PaginatedResponse<ReviewResponse> = await api.reviews.list({ page, page_size: PAGE_SIZE });
      setReviews(res.data);
      setTotal(res.total);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [page]); // eslint-disable-line react-hooks/exhaustive-deps

  const avgScore = reviews.length
    ? (reviews.reduce((s, r) => s + r.average_score, 0) / reviews.length).toFixed(2)
    : "—";
  const avgNps = reviews.length
    ? (reviews.reduce((s, r) => s + r.q8_nps, 0) / reviews.length).toFixed(1)
    : "—";

  const handleToggleTestimonial = async (review: ReviewResponse) => {
    // Disabling testimonial — apply immediately
    if (review.show_as_testimonial) {
      setTogglingId(review.id);
      try {
        const updated = await api.reviews.patch(review.id, { show_as_testimonial: false });
        setReviews((prev) => prev.map((r) => (r.id === review.id ? updated : r)));
      } finally {
        setTogglingId(null);
      }
      return;
    }
    // Enabling — open name/role editor first
    setEditState({ reviewId: review.id, name: review.reviewer_name ?? "", role: review.reviewer_role ?? "" });
  };

  const handleConfirmTestimonial = async () => {
    if (!editState) return;
    setTogglingId(editState.reviewId);
    try {
      const updated = await api.reviews.patch(editState.reviewId, {
        show_as_testimonial: true,
        reviewer_name: editState.name || undefined,
        reviewer_role: editState.role || undefined,
      });
      setReviews((prev) => prev.map((r) => (r.id === editState.reviewId ? updated : r)));
      setEditState(null);
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {showShare && <ShareModal onClose={() => setShowShare(false)} />}

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-fg">Calificaciones</h1>
          <p className="text-sm text-fg-4 mt-0.5">
            Encuestas de satisfacción recibidas a través del QR
          </p>
        </div>
        <button
          onClick={() => setShowShare(true)}
          className="flex items-center gap-2 px-4 py-2 bg-accent-muted border border-accent/30 text-accent text-sm font-semibold rounded-lg hover:bg-accent/20 transition-colors flex-shrink-0"
        >
          <Share2 size={15} />
          Compartir encuesta
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-surface-2 border border-border rounded-lg p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
            <Users size={18} className="text-accent" />
          </div>
          <div>
            <p className="text-[11px] text-fg-5 uppercase tracking-wide">Total respuestas</p>
            <p className="text-2xl font-bold text-fg">{total}</p>
          </div>
        </div>
        <div className="bg-surface-2 border border-border rounded-lg p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-yellow-400/10 flex items-center justify-center">
            <Star size={18} className="text-yellow-400" />
          </div>
          <div>
            <p className="text-[11px] text-fg-5 uppercase tracking-wide">Puntaje promedio</p>
            <p className="text-2xl font-bold text-fg">{avgScore} <span className="text-sm text-fg-4">/ 5</span></p>
          </div>
        </div>
        <div className="bg-surface-2 border border-border rounded-lg p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-green-400/10 flex items-center justify-center">
            <ThumbsUp size={18} className="text-green-400" />
          </div>
          <div>
            <p className="text-[11px] text-fg-5 uppercase tracking-wide">NPS promedio</p>
            <p className="text-2xl font-bold text-fg">{avgNps} <span className="text-sm text-fg-4">/ 10</span></p>
          </div>
        </div>
      </div>

      {/* Edit testimonial modal */}
      {editState && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="bg-surface-2 border border-border rounded-xl p-6 w-full max-w-md space-y-4 shadow-2xl">
            <h2 className="text-base font-bold text-fg">Configurar testimonio</h2>
            <p className="text-sm text-fg-4">
              Ingrese el nombre y cargo que aparecerán en la sección de testimonios de la web (opcional).
            </p>
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Nombre del cliente"
                value={editState.name}
                onChange={(e) => setEditState((s) => s ? { ...s, name: e.target.value } : s)}
                className="w-full bg-surface-3 border border-border rounded px-3 py-2 text-sm text-fg placeholder:text-fg-6 focus:outline-none focus:border-accent"
              />
              <input
                type="text"
                placeholder="Cargo / Empresa"
                value={editState.role}
                onChange={(e) => setEditState((s) => s ? { ...s, role: e.target.value } : s)}
                className="w-full bg-surface-3 border border-border rounded px-3 py-2 text-sm text-fg placeholder:text-fg-6 focus:outline-none focus:border-accent"
              />
            </div>
            <div className="flex gap-3 justify-end pt-1">
              <button
                onClick={() => setEditState(null)}
                className="px-4 py-2 text-sm text-fg-4 hover:text-fg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmTestimonial}
                disabled={togglingId !== null}
                className="px-4 py-2 text-sm font-semibold bg-accent-muted border border-accent/30 text-accent rounded hover:bg-accent/20 transition-colors disabled:opacity-50"
              >
                {togglingId ? "Guardando..." : "Mostrar en web"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-surface-2 border border-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-3 text-fg-5 text-[11px] uppercase tracking-wide">
                <th className="px-4 py-3 text-left">Fecha</th>
                <th className="px-4 py-3 text-left">Puntaje</th>
                <th className="px-4 py-3 text-left">NPS</th>
                <th className="px-4 py-3 text-left">Detalle (q1–q7)</th>
                <th className="px-4 py-3 text-left">Comentario</th>
                <th className="px-4 py-3 text-left">Revisor</th>
                <th className="px-4 py-3 text-center">Testimonio web</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-fg-5">
                    Cargando...
                  </td>
                </tr>
              )}
              {!loading && reviews.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-fg-5">
                    Sin calificaciones aún
                  </td>
                </tr>
              )}
              {!loading && reviews.map((r) => (
                <tr key={r.id} className="border-b border-border hover:bg-surface-3 transition-colors">
                  <td className="px-4 py-3 text-fg-4 whitespace-nowrap text-xs">
                    {new Date(r.created_at).toLocaleDateString("es-CO", {
                      day: "2-digit", month: "short", year: "numeric",
                    })}
                  </td>
                  <td className="px-4 py-3">
                    <StarDisplay score={r.average_score} />
                  </td>
                  <td className="px-4 py-3">
                    <NpsBadge nps={r.q8_nps} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 flex-wrap">
                      {[r.q1_attention, r.q2_information, r.q3_response_time, r.q4_quality, r.q5_understanding, r.q6_value, r.q7_overall].map((v, i) => (
                        <span
                          key={i}
                          title={["Atención", "Información", "Tiempo resp.", "Calidad", "Comprensión", "Cal/Precio", "Satisfacción"][i]}
                          className={`w-5 h-5 rounded text-[10px] font-bold flex items-center justify-center ${
                            v >= 4 ? "bg-green-400/10 text-green-400" :
                            v === 3 ? "bg-yellow-400/10 text-yellow-400" :
                                      "bg-red-400/10 text-red-400"
                          }`}
                        >
                          {v}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 max-w-[200px]">
                    {r.comment ? (
                      <div className="flex items-start gap-1.5">
                        <MessageSquare size={12} className="text-fg-5 mt-0.5 flex-shrink-0" />
                        <span className="text-fg-4 text-xs line-clamp-2">{r.comment}</span>
                      </div>
                    ) : (
                      <span className="text-fg-6 text-xs">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {r.reviewer_name ? (
                      <div>
                        <p className="text-fg text-xs font-medium">{r.reviewer_name}</p>
                        {r.reviewer_role && <p className="text-fg-5 text-[11px]">{r.reviewer_role}</p>}
                      </div>
                    ) : (
                      <span className="text-fg-6 text-xs">Anónimo</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => handleToggleTestimonial(r)}
                      disabled={togglingId === r.id}
                      title={r.show_as_testimonial ? "Quitar de testimonios" : "Mostrar en web"}
                      className="transition-colors disabled:opacity-50"
                    >
                      {r.show_as_testimonial ? (
                        <CheckCircle size={18} className="text-green-400 hover:text-red-400 transition-colors" />
                      ) : (
                        <XCircle size={18} className="text-fg-6 hover:text-green-400 transition-colors" />
                      )}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pages > 1 && (
          <div className="px-4 py-3 border-t border-border flex items-center justify-between text-xs text-fg-4">
            <span>{total} calificaciones</span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 border border-border rounded hover:bg-surface-3 disabled:opacity-40 transition-colors"
              >
                Anterior
              </button>
              <span className="px-3 py-1.5">{page} / {pages}</span>
              <button
                onClick={() => setPage((p) => Math.min(pages, p + 1))}
                disabled={page === pages}
                className="px-3 py-1.5 border border-border rounded hover:bg-surface-3 disabled:opacity-40 transition-colors"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
