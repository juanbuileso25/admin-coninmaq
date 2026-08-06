import { useRef, useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Clock, Phone, Wrench, FileText, GripVertical, ChevronDown, Package } from "lucide-react";
import {
  api,
  type SparePartRequest,
  type SparePartStage,
  SPARE_PART_STAGES,
  SPARE_PART_STAGE_LABELS,
} from "../../services/api";

const STAGE_COLORS: Record<SparePartStage, { col: string; badge: string; dot: string }> = {
  solicitudes_recibidas: { col: "border-t-slate-400",   badge: "bg-slate-500/15 text-slate-300 border-slate-500/30",    dot: "bg-slate-400"   },
  cotizado:              { col: "border-t-blue-400",    badge: "bg-blue-500/15 text-blue-300 border-blue-500/30",        dot: "bg-blue-400"    },
  esperando_respuesta:   { col: "border-t-amber-400",   badge: "bg-amber-500/15 text-amber-300 border-amber-500/30",     dot: "bg-amber-400"   },
  negociacion:           { col: "border-t-violet-400",  badge: "bg-violet-500/15 text-violet-300 border-violet-500/30",  dot: "bg-violet-400"  },
  venta_ganada:          { col: "border-t-emerald-400", badge: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30", dot: "bg-emerald-400" },
  venta_perdida:         { col: "border-t-red-400",     badge: "bg-red-500/15 text-red-300 border-red-500/30",           dot: "bg-red-400"     },
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

interface CardProps {
  request: SparePartRequest;
  onMove: (req: SparePartRequest, stage: SparePartStage) => void;
  onDragStart: (e: React.DragEvent, req: SparePartRequest) => void;
  onTouchOver: (stage: SparePartStage | null) => void;
  onClick: (req: SparePartRequest) => void;
}

function SparePartCard({ request: req, onMove, onDragStart, onTouchOver, onClick }: CardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPos, setMenuPos]   = useState({ top: 0, left: 0 });
  const btnRef  = useRef<HTMLButtonElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const ghostRef = useRef<HTMLDivElement | null>(null);
  const touchState = useRef({ offsetX: 0, offsetY: 0, dragging: false });

  useEffect(() => {
    if (!menuOpen) return;
    const close = (e: MouseEvent) => {
      if (btnRef.current && !btnRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [menuOpen]);

  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const onMove = (e: TouchEvent) => {
      if (!touchState.current.dragging || !ghostRef.current) return;
      e.preventDefault();
      const t = e.touches[0];
      ghostRef.current.style.top  = `${t.clientY - touchState.current.offsetY}px`;
      ghostRef.current.style.left = `${t.clientX - touchState.current.offsetX}px`;
      ghostRef.current.style.visibility = "hidden";
      const below = document.elementFromPoint(t.clientX, t.clientY);
      ghostRef.current.style.visibility = "";
      const col = below?.closest("[data-stage]");
      onTouchOver((col?.getAttribute("data-stage") as SparePartStage) ?? null);
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
    const stage = col?.getAttribute("data-stage") as SparePartStage | null;
    if (stage && stage !== req.status) onMove(req, stage);
  };

  const openMenu = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    setMenuPos({ top: rect.bottom + 4, left: rect.right });
    setMenuOpen(v => !v);
  };

  const currentStage = SPARE_PART_STAGES.includes(req.status as SparePartStage)
    ? req.status as SparePartStage
    : "solicitudes_recibidas";

  return (
    <div
      ref={cardRef}
      draggable
      onDragStart={e => onDragStart(e, req)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className="bg-surface-3 border border-border p-3 cursor-grab active:cursor-grabbing hover:border-accent/40 transition-colors group relative select-none"
    >
      <div className="absolute left-1 top-1/2 -translate-y-1/2 text-fg-6 opacity-0 group-hover:opacity-100 transition-opacity">
        <GripVertical size={12} />
      </div>

      <div className="pl-1 space-y-2">
        {/* Header: número + cliente */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0 cursor-pointer" onClick={() => onClick(req)}>
            <p className="font-mono text-[11px] text-accent">{req.request_number}</p>
            <p className="text-fg text-sm font-medium truncate mt-0.5">
              {req.lead_name ?? <span className="text-fg-6 italic">Sin nombre</span>}
            </p>
            {req.lead_company && (
              <p className="text-fg-5 text-xs truncate">{req.lead_company}</p>
            )}
          </div>
        </div>

        {/* Repuesto solicitado */}
        {req.part_description && (
          <div className="flex items-start gap-1.5 text-xs text-fg-4">
            <Wrench size={10} className="mt-0.5 shrink-0 text-fg-6" />
            <span className="line-clamp-2">{req.part_description}</span>
          </div>
        )}

        {/* Máquina */}
        {(req.machine_brand || req.machine_model) && (
          <div className="flex items-center gap-1.5 text-[11px] text-fg-5">
            <Package size={10} />
            <span className="truncate">{[req.machine_brand, req.machine_model].filter(Boolean).join(" ")}</span>
            {req.quantity && <span className="ml-auto shrink-0 text-fg-6">x{req.quantity}</span>}
          </div>
        )}

        {/* Teléfono */}
        {req.lead_phone && (
          <div className="flex items-center gap-1.5 text-[11px] text-fg-5">
            <Phone size={10} />{req.lead_phone}
          </div>
        )}

        {/* Cotización vinculada */}
        {req.notes && (
          <div className="flex items-center gap-1.5 text-[11px] text-accent bg-accent/5 border border-accent/20 px-2 py-1">
            <FileText size={10} />
            <span className="truncate">{req.notes}</span>
          </div>
        )}

        {/* Footer: tiempo + mover */}
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1 text-[11px] text-fg-6">
            <Clock size={10} />{timeAgo(req.created_at)}
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
                style={{ position: "fixed", top: menuPos.top, right: `calc(100vw - ${menuPos.left}px)` }}
                className="z-[9999] bg-surface-3 border border-border shadow-xl min-w-[200px]"
              >
                {SPARE_PART_STAGES.filter(s => s !== currentStage).map(s => (
                  <button
                    key={s}
                    type="button"
                    onClick={e => { e.stopPropagation(); setMenuOpen(false); onMove(req, s); }}
                    className="w-full text-left px-3 py-2 text-xs text-fg hover:bg-surface-4 transition-colors flex items-center gap-2"
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${STAGE_COLORS[s].dot}`} />
                    {SPARE_PART_STAGE_LABELS[s]}
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
  grouped: Record<string, SparePartRequest[]>;
  onRefresh: () => void;
}

export default function SparePartsKanbanBoard({ grouped, onRefresh }: Props) {
  const navigate = useNavigate();
  const draggingReq = useRef<SparePartRequest | null>(null);
  const [draggingOver, setDraggingOver]   = useState<SparePartStage | null>(null);
  const [hiddenStages, setHiddenStages]   = useState<Set<SparePartStage>>(new Set());

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

  const toggleStage = (stage: SparePartStage) => {
    setHiddenStages(prev => {
      const next = new Set(prev);
      next.has(stage) ? next.delete(stage) : next.add(stage);
      return next;
    });
  };

  const moveToStage = async (req: SparePartRequest, stage: SparePartStage) => {
    try {
      await api.spareParts.patchRequest(req.id, { status: stage });
      toast.success(`Movido a "${SPARE_PART_STAGE_LABELS[stage]}"`);
      onRefresh();
    } catch {
      toast.error("No se pudo mover la solicitud");
    }
  };

  const handleDragStart = (e: React.DragEvent, req: SparePartRequest) => {
    draggingReq.current = req;
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, stage: SparePartStage) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDraggingOver(stage);
  };

  const handleDrop = async (stage: SparePartStage) => {
    setDraggingOver(null);
    const req = draggingReq.current;
    draggingReq.current = null;
    const currentStage = SPARE_PART_STAGES.includes(req?.status as SparePartStage)
      ? req?.status
      : "solicitudes_recibidas";
    if (!req || currentStage === stage) return;
    await moveToStage(req, stage);
  };

  const handleTouchOver = useCallback((stage: SparePartStage | null) => {
    setDraggingOver(stage);
  }, []);

  const visibleStages = SPARE_PART_STAGES.filter(s => !hiddenStages.has(s));

  return (
    <div>
      {/* Stage chips */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {SPARE_PART_STAGES.map(stage => {
          const count  = (grouped[stage] ?? []).length;
          const active = !hiddenStages.has(stage);
          const colors = STAGE_COLORS[stage];
          return (
            <button
              key={stage}
              type="button"
              onClick={() => toggleStage(stage)}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs border rounded-sm transition-all ${
                active ? colors.badge : "bg-transparent text-fg-6 border-border/40 opacity-40 hover:opacity-60"
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${active ? colors.dot : "bg-fg-6"}`} />
              {SPARE_PART_STAGE_LABELS[stage]}
              {active && count > 0 && <span className="font-bold ml-0.5">{count}</span>}
            </button>
          );
        })}
      </div>

      {/* Top scrollbar */}
      <div ref={topBarRef} className="overflow-x-auto mb-1" style={{ height: 14 }}>
        <div style={{ width: scrollWidth, height: 1 }} />
      </div>

      {/* Board */}
      <div ref={boardRef} className="flex gap-3 overflow-x-auto pb-4 min-h-[calc(100vh-320px)]">
        {visibleStages.map(stage => {
          const cards  = grouped[stage] ?? [];
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
                  <h3 className="text-fg text-xs font-semibold">{SPARE_PART_STAGE_LABELS[stage]}</h3>
                </div>
                <span className={`px-1.5 py-0.5 text-[10px] font-bold border rounded-sm ${colors.badge}`}>{cards.length}</span>
              </div>

              <div
                data-stage={stage}
                className={`flex-1 space-y-2 p-1 rounded transition-colors min-h-[80px] ${
                  isOver ? "bg-accent/5 border border-dashed border-accent/40" : ""
                }`}
              >
                {cards.map(req => (
                  <SparePartCard
                    key={req.id}
                    request={req}
                    onMove={moveToStage}
                    onDragStart={handleDragStart}
                    onTouchOver={handleTouchOver}
                    onClick={req => navigate(`/posventa/leads/${req.id}`)}
                  />
                ))}
                {cards.length === 0 && !isOver && (
                  <div className="text-center text-fg-6 text-xs py-6 border border-dashed border-border/50">
                    Sin solicitudes
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
