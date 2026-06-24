import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft, Bot, BotOff, Send, User, Headphones, RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { api, type BotSessionDetail, type BotMessageResponse } from "../../services/api";
import { useAbility } from "../../context/AbilityContext";

const PHASE_LABELS: Record<string, string> = {
  calificar:            "Calificando",
  buscar_producto:      "Buscando equipo",
  acumulando_productos: "Acumulando equipos",
  pedir_datos:          "Pidiendo datos",
  confirmar:            "Confirmando",
  elegir_entrega:       "Eligiendo entrega",
  pedir_correo:         "Pidiendo correo",
  despedida:            "Despedida",
};

// ── Burbuja individual ────────────────────────────────────────────────────────

function Bubble({
  msg,
  isFirst,
  isLast,
}: {
  msg: BotMessageResponse;
  isFirst: boolean;
  isLast: boolean;
}) {
  const isUser    = msg.role === "usuario";
  const isAdvisor = msg.role === "advisor";
  const isAgent   = !isUser && !isAdvisor;

  const align = isAdvisor ? "items-end" : "items-start";

  // Border-radius según posición en el grupo (estilo chat moderno)
  const radius = isAdvisor
    ? `rounded-2xl ${isFirst ? "rounded-tr-sm" : ""} ${isLast ? "rounded-br-sm" : ""}`
    : `rounded-2xl ${isFirst ? "rounded-tl-sm" : ""} ${isLast ? "rounded-bl-sm" : ""}`;

  const bubbleBg = isUser
    ? "bg-surface-3 border border-border text-fg"
    : isAdvisor
      ? "bg-accent text-black"
      : "bg-surface-4 border border-border-light text-fg";

  const timeColor = isAdvisor ? "text-black/50" : "text-fg-6";

  const timestamp = new Date(msg.created_at).toLocaleString("es-CO", {
    dateStyle: "short",
    timeStyle: "short",
  });

  return (
    <div className={`flex flex-col gap-0.5 ${align}`}>
      {/* Etiqueta de rol — solo en el primero del grupo */}
      {isFirst && (
        <div className={`flex items-center gap-1 text-[10px] uppercase tracking-wider font-semibold mb-0.5 ${
          isUser ? "text-fg-5" : isAdvisor ? "text-accent" : "text-emerald-400"
        }`}>
          {isUser    && <User       size={10} />}
          {isAgent   && <Bot        size={10} />}
          {isAdvisor && <Headphones size={10} />}
          {isUser ? "Cliente" : isAdvisor ? "Asesor" : "Coni"}
        </div>
      )}

      <div className={`px-3.5 py-2 text-sm leading-relaxed whitespace-pre-wrap ${radius} ${bubbleBg}`}>
        {msg.content}
      </div>

      {/* Timestamp — solo en el último del grupo */}
      {isLast && (
        <span className={`text-[10px] mt-0.5 ${timeColor}`}>{timestamp}</span>
      )}
    </div>
  );
}

// ── Grupo de mensajes consecutivos del mismo rol ──────────────────────────────

function MessageGroup({ messages }: { messages: BotMessageResponse[] }) {
  const isAdvisor = messages[0].role === "advisor";

  return (
    <div className={`flex flex-col gap-0.5 max-w-[75%] ${isAdvisor ? "self-end" : "self-start"}`}>
      {messages.map((msg, i) => (
        <Bubble
          key={msg.id}
          msg={msg}
          isFirst={i === 0}
          isLast={i === messages.length - 1}
        />
      ))}
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────

export default function SesionDetailPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate      = useNavigate();
  const ability       = useAbility();
  const canUpdate     = ability.can("update", "BotSession");

  const [session, setSession]   = useState<BotSessionDetail | null>(null);
  const [loading, setLoading]   = useState(true);
  const [message, setMessage]   = useState("");
  const [sending, setSending]   = useState(false);
  const [toggling, setToggling] = useState(false);

  const bottomRef  = useRef<HTMLDivElement>(null);
  const abortRef   = useRef<AbortController | null>(null);
  const lastMsgId  = useRef<number>(0);

  // Carga inicial
  const load = async (silent = false) => {
    if (!sessionId) return;
    if (!silent) setLoading(true);
    try {
      const s = await api.bot.session(sessionId);
      setSession(s);
      const last = s.messages.at(-1);
      if (last) lastMsgId.current = last.id;
    } catch {
      if (!silent) {
        toast.error("No se encontró la sesión");
        navigate("/agente/sesiones");
      }
    } finally {
      if (!silent) setLoading(false);
    }
  };

  // SSE via fetch — soporta Authorization header, sin token en URL
  useEffect(() => {
    if (!sessionId) return;

    let cancelled = false;
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    const connect = async () => {
      const token = localStorage.getItem("coninmaq_token") ?? sessionStorage.getItem("coninmaq_token") ?? "";

      try {
        const res = await fetch(
          `${import.meta.env.VITE_API_URL}/bot/sessions/${sessionId}/events?after_id=${lastMsgId.current}`,
          { headers: { Authorization: `Bearer ${token}` }, signal: ctrl.signal }
        );
        if (!res.ok || !res.body) return;

        const reader  = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (!cancelled) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
          for (const line of lines) {
            if (!line.startsWith("data:")) continue;
            try {
              const msg: BotMessageResponse = JSON.parse(line.slice(5).trim());
              lastMsgId.current = Math.max(lastMsgId.current, msg.id);
              setSession(prev => {
                if (!prev) return prev;
                if (prev.messages.some(m => m.id === msg.id)) return prev;
                // Si hay un mensaje optimista (id < 0) con el mismo contenido, reemplazarlo
                const tempIdx = prev.messages.findIndex(
                  m => m.id < 0 && m.role === msg.role && m.content === msg.content
                );
                if (tempIdx !== -1) {
                  const msgs = [...prev.messages];
                  msgs[tempIdx] = msg;
                  return { ...prev, messages: msgs };
                }
                return { ...prev, messages: [...prev.messages, msg] };
              });
            } catch { /* línea no parseable, ignorar */ }
          }
        }
      } catch (e: unknown) {
        if ((e as { name?: string }).name === "AbortError") return;
        if (!cancelled) setTimeout(connect, 3000);
      }
    };

    // Esperar que load() termine y lastMsgId.current esté inicializado
    const t = setTimeout(connect, 800);
    return () => {
      cancelled = true;
      clearTimeout(t);
      ctrl.abort();
    };
  }, [sessionId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [sessionId]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [session?.messages.length]);

  const toggleBot = async () => {
    if (!session) return;
    setToggling(true);
    // Actualización optimista del estado del bot
    const nextActive = !session.bot_active;
    setSession(prev => prev ? { ...prev, bot_active: nextActive } : prev);
    try {
      const updated = await api.bot.patchSession(session.session_id, { bot_active: nextActive });
      setSession(updated);
      toast.success(updated.bot_active ? "Bot reactivado" : "Bot pausado — ahora puede atender usted");
    } catch {
      // Revertir si falló
      setSession(prev => prev ? { ...prev, bot_active: !nextActive } : prev);
      toast.error("Error al cambiar estado del bot");
    } finally {
      setToggling(false);
    }
  };

  const sendMessage = async () => {
    if (!session || !message.trim() || session.bot_active) return;
    const text = message.trim();
    setMessage("");

    // Actualización optimista — el mensaje aparece al instante
    const tempId = -Date.now();
    const tempMsg: BotMessageResponse = {
      id: tempId,
      role: "advisor",
      content: text,
      created_at: new Date().toISOString(),
    };
    setSession(prev => prev ? { ...prev, messages: [...prev.messages, tempMsg] } : prev);

    setSending(true);
    try {
      await api.bot.sendMessage(session.session_id, text);
      // El SSE se encarga de reemplazar el mensaje optimista con el real
    } catch {
      toast.error("No se pudo enviar el mensaje");
      setSession(prev => prev
        ? { ...prev, messages: prev.messages.filter(m => m.id !== tempId) }
        : prev
      );
    } finally {
      setSending(false);
    }
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-fg-5">
        Cargando conversación...
      </div>
    );
  }

  if (!session) return null;

  const dc = session.client_data_cache ?? {};

  // Agrupar mensajes consecutivos del mismo rol
  const groups: BotMessageResponse[][] = [];
  for (const msg of session.messages) {
    const last = groups[groups.length - 1];
    if (last && last[0].role === msg.role) {
      last.push(msg);
    } else {
      groups.push([msg]);
    }
  }

  return (
    <div className="flex flex-col gap-4 h-full">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/agente/sesiones")}
            className="flex items-center justify-center w-8 h-8 border border-border text-fg-5 hover:text-fg hover:bg-surface-3 transition-colors flex-shrink-0"
          >
            <ArrowLeft size={15} />
          </button>
          <div className="min-w-0">
            <h1 className="text-fg font-bold text-xl truncate">
              {(dc as Record<string, string>)["cliente_nombre"] ?? session.phone_number ?? session.session_id}
            </h1>
            <p className="text-fg-5 text-sm mt-0.5">
              {PHASE_LABELS[session.phase] ?? session.phase}
              {" · "}
              {session.phone_number}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => load()}
            className="flex items-center gap-1.5 px-3 py-2 border border-border text-fg-5 hover:text-fg hover:bg-surface-3 text-sm transition-colors"
          >
            <RefreshCw size={13} />
            <span className="hidden sm:inline">Actualizar</span>
          </button>
          {canUpdate && (
            <button
              onClick={toggleBot}
              disabled={toggling}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors ${
                session.bot_active
                  ? "bg-amber-500/15 border border-amber-500/40 text-amber-400 hover:bg-amber-500/25"
                  : "bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/25"
              }`}
            >
              {session.bot_active
                ? <><BotOff size={14} /> <span className="hidden sm:inline">Pausar bot</span></>
                : <><Bot    size={14} /> <span className="hidden sm:inline">Reactivar bot</span></>
              }
            </button>
          )}
        </div>
      </div>

      {/* Main — chat + sidebar */}
      <div className="flex flex-col lg:flex-row gap-4 flex-1 min-h-0 overflow-hidden">

        {/* Chat */}
        <div className="flex-1 flex flex-col bg-surface-2 border border-border min-h-0 lg:min-h-[400px]">

          {/* Banner bot pausado */}
          {!session.bot_active && (
            <div className="flex items-center gap-2 px-4 py-2 bg-amber-500/10 border-b border-amber-500/30 text-amber-400 text-xs font-medium">
              <BotOff size={12} />
              Bot pausado — los mensajes que escribas se envían directamente al cliente por WhatsApp
            </div>
          )}

          {/* Mensajes */}
          <div className="flex-1 overflow-y-auto p-4">
            <div className="flex flex-col gap-3">
              {groups.map((group, i) => (
                <MessageGroup key={i} messages={group} />
              ))}
              <div ref={bottomRef} />
            </div>
          </div>

          {/* Input */}
          {canUpdate && (
            <div className="border-t border-border p-3 flex gap-2">
              <textarea
                rows={2}
                className="flex-1 bg-surface-3 border border-border text-fg text-sm px-3 py-2 resize-none outline-none focus:border-accent placeholder:text-fg-6 rounded-sm"
                placeholder={
                  session.bot_active
                    ? "El bot está activo. Pausa el bot para escribir al cliente."
                    : "Escribir mensaje como asesor (Enter para enviar)..."
                }
                value={message}
                onChange={e => setMessage(e.target.value)}
                onKeyDown={handleKey}
                disabled={sending || session.bot_active}
              />
              <button
                onClick={sendMessage}
                disabled={sending || !message.trim() || session.bot_active}
                className="px-4 bg-accent text-black font-semibold hover:bg-accent/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors rounded-sm"
              >
                <Send size={15} />
              </button>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="lg:w-72 xl:w-80 lg:flex-shrink-0 lg:overflow-y-auto lg:max-h-full flex flex-col gap-3">

          {/* Estado */}
          <div className="bg-surface-2 border border-border p-4 space-y-3">
            <p className="text-fg-5 text-xs uppercase tracking-wider font-semibold">Estado</p>
            <div className="space-y-2 text-sm">
              <Row label="Bot" value={
                session.bot_active
                  ? <span className="text-emerald-400 flex items-center gap-1"><Bot size={12} /> Activo</span>
                  : <span className="text-amber-400 flex items-center gap-1"><BotOff size={12} /> Pausado</span>
              } />
              <Row label="Sesión"  value={session.is_active ? "Abierta" : "Cerrada"} />
              <Row label="Fase"    value={PHASE_LABELS[session.phase] ?? session.phase} />
              {session.accumulated_products.length > 0 && (
                <Row label="Equipos" value={String(session.accumulated_products.length)} />
              )}
            </div>
          </div>

          {/* Cliente — solo campos relevantes, sin nulls ni internos */}
          {(() => {
            const LABELS: Record<string, string> = {
              cliente_nombre:  "Nombre",
              cliente_empresa: "Empresa",
              cliente_email:   "Correo",
              tipo_cliente:    "Tipo",
            };
            const entries = Object.entries(LABELS)
              .map(([key, label]) => ({ label, value: (dc as Record<string, unknown>)[key] }))
              .filter(({ value }) => value != null && value !== "" && value !== false);

            if (entries.length === 0) return null;
            return (
              <div className="bg-surface-2 border border-border p-4 space-y-3">
                <p className="text-fg-5 text-xs uppercase tracking-wider font-semibold">Cliente</p>
                <div className="space-y-2 text-sm">
                  {entries.map(({ label, value }) => (
                    <div key={label} className="flex flex-col gap-0.5">
                      <span className="text-fg-5 text-[10px] uppercase tracking-wide">{label}</span>
                      <span className="text-fg break-all leading-snug">{String(value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* Equipos */}
          {session.accumulated_products.length > 0 && (
            <div className="bg-surface-2 border border-border p-4 space-y-3">
              <p className="text-fg-5 text-xs uppercase tracking-wider font-semibold">Equipos</p>
              <div className="space-y-2">
                {(session.accumulated_products as Record<string, unknown>[]).map((p, i) => (
                  <div key={i} className="text-sm border-b border-border pb-2 last:border-0 last:pb-0">
                    <p className="text-fg font-medium leading-snug">
                      {String(p.nombre_oficial ?? p.nombre ?? "—")}
                    </p>
                    <p className="text-fg-5 text-xs mt-0.5">
                      x{String(p.cantidad ?? 1)}
                      {p.precio_base
                        ? ` · $${Number(p.precio_base).toLocaleString("es-CO")}`
                        : " · Consultar precio"
                      }
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-2">
      <span className="text-fg-5 capitalize flex-shrink-0">{label}</span>
      <span className="text-fg text-right">{value}</span>
    </div>
  );
}
