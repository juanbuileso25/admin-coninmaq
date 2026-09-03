import { useRef, useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Clock, Building2, Phone, Briefcase, FileText, GripVertical, ChevronDown, Globe, Trash2, AlertTriangle } from "lucide-react";
import {
  api,
  type BotLeadResponse,
  type PipelineColumnResponse,
  type PipelineStage,
  PIPELINE_STAGES,
  PIPELINE_STAGE_LABELS,
} from "../../services/api";

const STAGE_COLORS: Record<PipelineStage, { col: string; badge: string; badgeActive: string; dot: string }> = {
  interesado:           { col: "border-t-slate-400",   badge: "bg-slate-500/15 text-slate-300 border-slate-500/30",   badgeActive: "bg-slate-500/30 text-slate-200 border-slate-400",   dot: "bg-slate-400"   },
  contactado:           { col: "border-t-blue-400",    badge: "bg-blue-500/15 text-blue-300 border-blue-500/30",      badgeActive: "bg-blue-500/30 text-blue-200 border-blue-400",      dot: "bg-blue-400"    },
  calificado:           { col: "border-t-violet-400",  badge: "bg-violet-500/15 text-violet-300 border-violet-500/30", badgeActive: "bg-violet-500/30 text-violet-200 border-violet-400", dot: "bg-violet-400"  },
  cotizacion_propuesta: { col: "border-t-amber-400",   badge: "bg-amber-500/15 text-amber-300 border-amber-500/30",   badgeActive: "bg-amber-500/30 text-amber-200 border-amber-400",   dot: "bg-amber-400"   },
  seguimiento:          { col: "border-t-orange-400",  badge: "bg-orange-500/15 text-orange-300 border-orange-500/30", badgeActive: "bg-orange-500/30 text-orange-200 border-orange-400", dot: "bg-orange-400"  },
  cerrado:              { col: "border-t-emerald-400", badge: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30", badgeActive: "bg-emerald-500/30 text-emerald-200 border-emerald-400", dot: "bg-emerald-400" },
  perdido:              { col: "border-t-red-400",     badge: "bg-red-500/15 text-red-300 border-red-500/30",         badgeActive: "bg-red-500/30 text-red-200 border-red-400",         dot: "bg-red-400"     },
  referido:             { col: "border-t-pink-400",    badge: "bg-pink-500/15 text-pink-300 border-pink-500/30",      badgeActive: "bg-pink-500/30 text-pink-200 border-pink-400",      dot: "bg-pink-400"    },
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `${days}d`;
}

function ConfirmDeleteModal({
  lead,
  onConfirm,
  onCancel,
  loading,
}: {
  lead: BotLeadResponse;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}) {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-surface-2 border border-border w-full max-w-sm shadow-2xl">
        <div className="p-5 space-y-4">
          <div className="flex items-start gap-3">
            <div className="shrink-0 w-9 h-9 flex items-center justify-center bg-red-500/10 border border-red-500/20">
              <AlertTriangle size={18} className="text-red-400" />
            </div>
            <div>
              <h3 className="text-fg font-semibold text-sm">Eliminar lead</h3>
              <p className="text-fg-5 text-xs mt-1 leading-relaxed">
                <span className="text-fg font-medium">{lead.name ?? "Este lead"}</span> quedará inactivo
                y no aparecerá en el pipeline. Esta acción no se puede deshacer.
              </p>
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              className="flex-1 px-3 py-2 text-xs font-medium text-fg-4 bg-surface-3 border border-border hover:bg-surface-4 transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={loading}
              className="flex-1 px-3 py-2 text-xs font-medium text-white bg-red-600 hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              <Trash2 size={12} />
              {loading ? "Eliminando..." : "Eliminar"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


interface KanbanCardProps {
  lead: BotLeadResponse;
  onMoveStage: (lead: BotLeadResponse, stage: PipelineStage) => void;
  onDragStart: (e: React.DragEvent, lead: BotLeadResponse) => void;
  onTouchOver: (stage: PipelineStage | null) => void;
  onClick: (lead: BotLeadResponse) => void;
  onDelete: (lead: BotLeadResponse) => void;
}

function KanbanCard({ lead, onMoveStage, onDragStart, onTouchOver, onClick, onDelete }: KanbanCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPos, setMenuPos]   = useState({ top: 0, left: 0 });
  const btnRef    = useRef<HTMLButtonElement>(null);
  const menuRef   = useRef<HTMLDivElement>(null);
  const cardRef   = useRef<HTMLDivElement>(null);
  const ghostRef  = useRef<HTMLDivElement | null>(null);
  const touchState = useRef({ offsetX: 0, offsetY: 0, dragging: false });
  const tier = lead.score?.tier_final;

  useEffect(() => {
    if (!menuOpen) return;
    const close = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        btnRef.current?.contains(target) ||
        menuRef.current?.contains(target)
      ) return;
      setMenuOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [menuOpen]);

  // Non-passive touchmove so we can preventDefault and stop page scroll while dragging
  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const onMove = (e: TouchEvent) => {
      if (!touchState.current.dragging || !ghostRef.current) return;
      e.preventDefault();
      const t = e.touches[0];
      ghostRef.current.style.top  = `${t.clientY - touchState.current.offsetY}px`;
      ghostRef.current.style.left = `${t.clientX - touchState.current.offsetX}px`;
      // Detect column underneath for visual highlight
      ghostRef.current.style.visibility = "hidden";
      const below = document.elementFromPoint(t.clientX, t.clientY);
      ghostRef.current.style.visibility = "";
      const col = below?.closest("[data-stage]");
      onTouchOver((col?.getAttribute("data-stage") as PipelineStage) ?? null);
    };
    el.addEventListener("touchmove", onMove, { passive: false });
    return () => el.removeEventListener("touchmove", onMove);
  }, [onTouchOver]);

  const handleTouchStart = (e: React.TouchEvent) => {
    if ((e.target as HTMLElement).closest("button")) return;
    const touch = e.touches[0];
    const rect  = cardRef.current!.getBoundingClientRect();
    touchState.current = { offsetX: touch.clientX - rect.left, offsetY: touch.clientY - rect.top, dragging: true };
    const ghost = cardRef.current!.cloneNode(true) as HTMLDivElement;
    Object.assign(ghost.style, {
      position: "fixed", top: `${rect.top}px`, left: `${rect.left}px`,
      width: `${rect.width}px`, opacity: "0.85", pointerEvents: "none",
      zIndex: "9999", transform: "scale(1.03) rotate(1deg)",
      boxShadow: "0 8px 32px rgba(0,0,0,0.45)", transition: "none",
    });
    document.body.appendChild(ghost);
    ghostRef.current = ghost;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    touchState.current.dragging = false;
    onTouchOver(null);
    if (!ghostRef.current) return;
    const touch = e.changedTouches[0];
    ghostRef.current.style.display = "none";
    const below = document.elementFromPoint(touch.clientX, touch.clientY);
    ghostRef.current.remove();
    ghostRef.current = null;
    const col = below?.closest("[data-stage]");
    const stage = col?.getAttribute("data-stage") as PipelineStage | null;
    if (stage && stage !== lead.pipeline_stage) onMoveStage(lead, stage);
  };

  const openMenu = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    setMenuPos({ top: rect.bottom + 4, left: rect.right });
    setMenuOpen(v => !v);
  };

  return (
    <div
      ref={cardRef}
      draggable
      onDragStart={e => onDragStart(e, lead)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className="bg-surface-3 border border-border p-3 cursor-grab active:cursor-grabbing hover:border-accent/40 transition-colors group relative select-none"
    >
      <div className="absolute left-1 top-1/2 -translate-y-1/2 text-fg-6 opacity-0 group-hover:opacity-100 transition-opacity">
        <GripVertical size={12} />
      </div>

      <div className="pl-1 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0 cursor-pointer" onClick={() => onClick(lead)}>
            <p className="text-fg text-sm font-medium truncate">
              {lead.name ?? <span className="text-fg-6 italic">Sin nombre</span>}
            </p>
            {lead.company && (
              <p className="text-fg-5 text-xs truncate flex items-center gap-1 mt-0.5">
                <Building2 size={10} />{lead.company}
              </p>
            )}
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {lead.lead_source === "whatsapp_bot" ? (
              <span title={`WhatsApp · ${lead.phone_number}`} className="text-green-400">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                  <path d="M12 0C5.373 0 0 5.373 0 12c0 2.126.556 4.111 1.513 5.835L.053 23.447a.75.75 0 0 0 .922.92l5.65-1.46A11.945 11.945 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.854 0-3.6-.5-5.1-1.37l-.364-.214-3.777.977.998-3.692-.235-.38A9.943 9.943 0 0 1 2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
                </svg>
              </span>
            ) : (
              <span title="Creado desde el admin" className="text-blue-400">
                <Globe size={14} />
              </span>
            )}
            <button
              type="button"
              title="Eliminar lead"
              onClick={e => { e.stopPropagation(); onDelete(lead); }}
              className="text-fg-6 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
            >
              <Trash2 size={13} />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3 text-[11px] text-fg-5">
          {lead.phone_number && (
            <span className="flex items-center gap-1"><Phone size={10} />{lead.phone_number}</span>
          )}
          {lead.equipment_interest && (
            <span className="flex items-center gap-1 truncate"><Briefcase size={10} />{lead.equipment_interest}</span>
          )}
        </div>

        {lead.latest_quotation && (
          <div className="flex items-center gap-1.5 text-[11px] text-accent bg-accent/5 border border-accent/20 px-2 py-1">
            <FileText size={10} />
            <span className="font-mono">{lead.latest_quotation.quotation_number}</span>
            <span className="text-fg-5 ml-auto">${(lead.latest_quotation.total / 1_000_000).toFixed(1)}M</span>
          </div>
        )}

        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-[11px] text-fg-6">
            <Clock size={10} />{timeAgo(lead.created_at)}
            {tier && (
              <span className="px-1.5 py-0.5 text-[10px] font-semibold border rounded-sm bg-amber-500/15 text-amber-400 border-amber-500/30">
                {tier === "no_fit" ? "N/F" : tier.toUpperCase()}
              </span>
            )}
          </span>

          <div className="relative">
            <button
              ref={btnRef}
              type="button"
              onClick={openMenu}
              className="flex items-center gap-0.5 text-[11px] text-fg-5 hover:text-fg transition-colors px-1"
            >
              Mover <ChevronDown size={10} />
            </button>
            {menuOpen && (
              <div
                ref={menuRef}
                style={{ position: "fixed", top: menuPos.top, right: `calc(100vw - ${menuPos.left}px)` }}
                className="z-[9999] bg-surface-3 border border-border shadow-xl min-w-[180px]"
              >
                {PIPELINE_STAGES.filter(s => s !== lead.pipeline_stage).map(s => (
                  <button
                    key={s}
                    type="button"
                    onClick={e => { e.stopPropagation(); setMenuOpen(false); onMoveStage(lead, s); }}
                    className="w-full text-left px-3 py-2 text-xs text-fg hover:bg-surface-4 transition-colors flex items-center gap-2"
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${STAGE_COLORS[s].dot}`} />
                    {PIPELINE_STAGE_LABELS[s]}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

interface Props {
  columns: PipelineColumnResponse[];
  onLeadClick: (lead: BotLeadResponse) => void;
  onRefresh: () => void;
}

export default function KanbanBoard({ columns, onLeadClick, onRefresh }: Props) {
  const draggingLead = useRef<BotLeadResponse | null>(null);
  const [draggingOver, setDraggingOver] = useState<PipelineStage | null>(null);
  const [hiddenStages, setHiddenStages] = useState<Set<PipelineStage>>(new Set());
  const [confirmLead, setConfirmLead]   = useState<BotLeadResponse | null>(null);
  const [deleting, setDeleting]         = useState(false);

  // Synchronized dual scrollbar (top + bottom)
  const boardRef  = useRef<HTMLDivElement>(null);
  const topBarRef = useRef<HTMLDivElement>(null);
  const [scrollWidth, setScrollWidth] = useState(0);

  useEffect(() => {
    const board = boardRef.current;
    if (!board) return;
    const obs = new ResizeObserver(() => setScrollWidth(board.scrollWidth));
    obs.observe(board);
    setScrollWidth(board.scrollWidth);
    return () => obs.disconnect();
  }, [hiddenStages]);

  useEffect(() => {
    const board = boardRef.current;
    const top   = topBarRef.current;
    if (!board || !top) return;
    let lock = false;
    const fromBoard = () => { if (lock) return; lock = true; top.scrollLeft = board.scrollLeft; lock = false; };
    const fromTop   = () => { if (lock) return; lock = true; board.scrollLeft = top.scrollLeft; lock = false; };
    board.addEventListener("scroll", fromBoard);
    top.addEventListener("scroll", fromTop);
    return () => { board.removeEventListener("scroll", fromBoard); top.removeEventListener("scroll", fromTop); };
  }, []);

  const toggleStage = (stage: PipelineStage) => {
    setHiddenStages(prev => {
      const next = new Set(prev);
      next.has(stage) ? next.delete(stage) : next.add(stage);
      return next;
    });
  };

  const handleDragStart = (e: React.DragEvent, lead: BotLeadResponse) => {
    draggingLead.current = lead;
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, stage: PipelineStage) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDraggingOver(stage);
  };

  const handleDrop = async (stage: PipelineStage) => {
    setDraggingOver(null);
    const lead = draggingLead.current;
    draggingLead.current = null;
    if (!lead || lead.pipeline_stage === stage) return;
    await moveLeadToStage(lead, stage);
  };

  const moveLeadToStage = async (lead: BotLeadResponse, stage: PipelineStage) => {
    try {
      await api.bot.patchLeadStage(lead.id, { stage });
      toast.success(`${lead.name ?? "Lead"} movido a "${PIPELINE_STAGE_LABELS[stage]}"`);
      onRefresh();
    } catch {
      toast.error("No se pudo mover el lead");
    }
  };

  const handleTouchOver = useCallback((stage: PipelineStage | null) => {
    setDraggingOver(stage);
  }, []);

  const handleDelete = (lead: BotLeadResponse) => setConfirmLead(lead);

  const confirmDelete = async () => {
    if (!confirmLead) return;
    setDeleting(true);
    try {
      await api.bot.deactivateLead(confirmLead.id);
      toast.success(`${confirmLead.name ?? "Lead"} eliminado del pipeline`);
      setConfirmLead(null);
      onRefresh();
    } catch {
      toast.error("No se pudo eliminar el lead");
    } finally {
      setDeleting(false);
    }
  };

  const visibleStages = PIPELINE_STAGES.filter(s => !hiddenStages.has(s));

  return (
    <div>
      {confirmLead && (
        <ConfirmDeleteModal
          lead={confirmLead}
          onConfirm={confirmDelete}
          onCancel={() => setConfirmLead(null)}
          loading={deleting}
        />
      )}
      {/* Stage filter chips */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {PIPELINE_STAGES.map(stage => {
          const col    = columns.find(c => c.stage === stage);
          const active = !hiddenStages.has(stage);
          const colors = STAGE_COLORS[stage];
          return (
            <button
              key={stage}
              type="button"
              onClick={() => toggleStage(stage)}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs border rounded-sm transition-all ${
                active
                  ? colors.badge
                  : "bg-transparent text-fg-6 border-border/40 opacity-40 hover:opacity-60"
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${active ? colors.dot : "bg-fg-6"}`} />
              {PIPELINE_STAGE_LABELS[stage]}
              {active && col && col.count > 0 && (
                <span className="font-bold ml-0.5">{col.count}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Top scrollbar synchronized with the board */}
      <div ref={topBarRef} className="overflow-x-auto mb-1" style={{ height: 14 }}>
        <div style={{ width: scrollWidth, height: 1 }} />
      </div>

      {/* Kanban board */}
      <div
        ref={boardRef}
        className="flex gap-3 overflow-x-auto pb-4 min-h-[calc(100vh-320px)]"
      >
        {visibleStages.map(stage => {
          const col    = columns.find(c => c.stage === stage);
          const leads  = col?.leads ?? [];
          const count  = col?.count ?? 0;
          const colors = STAGE_COLORS[stage];
          const isOver = draggingOver === stage;

          return (
            <div
              key={stage}
              className="flex-shrink-0 w-64 flex flex-col"
              onDragOver={e => handleDragOver(e, stage)}
              onDragLeave={() => setDraggingOver(null)}
              onDrop={() => handleDrop(stage)}
            >
              <div className={`bg-surface-2 border border-border border-t-2 ${colors.col} px-3 py-2.5 mb-2 flex items-center justify-between`}>
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${colors.dot}`} />
                  <h3 className="text-fg text-xs font-semibold">{PIPELINE_STAGE_LABELS[stage]}</h3>
                </div>
                <span className={`px-1.5 py-0.5 text-[10px] font-bold border rounded-sm ${colors.badge}`}>{count}</span>
              </div>

              {/* data-stage lets touch handler detect column via elementFromPoint */}
              <div
                data-stage={stage}
                className={`flex-1 space-y-2 p-1 rounded transition-colors min-h-[80px] ${
                  isOver ? "bg-accent/5 border border-dashed border-accent/40" : ""
                }`}
              >
                {leads.map(lead => (
                  <KanbanCard
                    key={lead.id}
                    lead={lead}
                    onMoveStage={moveLeadToStage}
                    onDragStart={handleDragStart}
                    onTouchOver={handleTouchOver}
                    onClick={onLeadClick}
                    onDelete={handleDelete}
                  />
                ))}
                {leads.length === 0 && !isOver && (
                  <div className="text-center text-fg-6 text-xs py-6 border border-dashed border-border/50">
                    Sin leads
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
