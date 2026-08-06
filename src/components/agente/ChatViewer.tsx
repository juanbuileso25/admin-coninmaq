import { useEffect, useRef } from "react";
import { Bot, User, Headphones } from "lucide-react";
import type { BotMessageResponse } from "../../services/api";

// ── Colores fijos para el área de chat (dark-only) ────────────────────────────
const C = {
  bg:           "#0b1014",
  datePill:     "#182229",
  dateTxt:      "#8696a0",
  userBg:       "#182229",
  botBg:        "#054640",
  advisorBg:    "#3d2600",
  userTxt:      "#e9edef",
  botTxt:       "#d1f4cc",
  advisorTxt:   "#ffd580",
  userLabel:    "#53bdeb",
  botLabel:     "#25d366",
  advisorLabel: "#ffc837",
  userTs:       "#8696a0",
  outTs:        "rgba(255,255,255,0.4)",
  userAvatar:   "#1c3142",
  botAvatar:    "#054640",
  advisorAvatar:"#3d2600",
};

// ── Helpers ────────────────────────────────────────────────────────────────────
function getDateKey(d: string) {
  return new Date(d).toLocaleDateString("es-CO");
}

function formatDateLabel(d: string) {
  const date  = new Date(d);
  const today = new Date();
  const yest  = new Date(today);
  yest.setDate(yest.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return "Hoy";
  if (date.toDateString() === yest.toDateString())  return "Ayer";
  return date.toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long" });
}

function formatTime(d: string) {
  return new Date(d).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" });
}

// ── Tail (cola de burbuja) ─────────────────────────────────────────────────────
function Tail({ side, color }: { side: "left" | "right"; color: string }) {
  const style: React.CSSProperties =
    side === "left"
      ? { borderWidth: "0 7px 9px 0", borderColor: `transparent ${color} transparent transparent` }
      : { borderWidth: "0 0 9px 7px", borderColor: `transparent transparent transparent ${color}` };
  return (
    <div
      className="absolute top-0"
      style={{
        [side === "left" ? "left" : "right"]: -6,
        width: 0,
        height: 0,
        borderStyle: "solid",
        ...style,
      }}
    />
  );
}

// ── Burbuja individual ─────────────────────────────────────────────────────────
export function ChatBubble({
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
  const isRight   = !isUser;

  const bgColor  = isUser ? C.userBg  : isAdvisor ? C.advisorBg  : C.botBg;
  const txtColor = isUser ? C.userTxt : isAdvisor ? C.advisorTxt : C.botTxt;
  const tsColor  = isUser ? C.userTs  : C.outTs;

  const radius = isRight
    ? `rounded-lg ${isFirst ? "rounded-tr-none" : ""}`
    : `rounded-lg ${isFirst ? "rounded-tl-none" : ""}`;

  return (
    <div className={`flex flex-col gap-0.5 ${isRight ? "items-end" : "items-start"}`}>
      {isFirst && (
        <span
          className="text-[10px] font-semibold uppercase tracking-wider px-1"
          style={{ color: isUser ? C.userLabel : isAdvisor ? C.advisorLabel : C.botLabel }}
        >
          {isUser ? "Cliente" : isAdvisor ? "Asesor" : "Coni"}
        </span>
      )}

      <div
        className={`relative max-w-[85%] px-3 pt-2 pb-1.5 ${radius}`}
        style={{ backgroundColor: bgColor }}
      >
        {isFirst && <Tail side={isRight ? "right" : "left"} color={bgColor} />}

        <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: txtColor }}>
          {msg.content}
        </p>

        {isLast && (
          <span
            className="block text-right text-[10px] mt-0.5"
            style={{ color: tsColor }}
          >
            {formatTime(msg.created_at)}
          </span>
        )}
      </div>
    </div>
  );
}

// ── Grupo de mensajes del mismo rol ───────────────────────────────────────────
export function ChatMessageGroup({ messages }: { messages: BotMessageResponse[] }) {
  const role    = messages[0].role;
  const isUser  = role === "usuario";
  const isRight = !isUser;

  const avatarBg =
    isUser ? C.userAvatar : role === "advisor" ? C.advisorAvatar : C.botAvatar;

  const AvatarIcon =
    isUser ? <User size={13} style={{ color: C.userLabel }} />
    : role === "advisor" ? <Headphones size={13} style={{ color: C.advisorLabel }} />
    : <Bot size={13} style={{ color: C.botLabel }} />;

  return (
    <div className={`flex gap-2 items-end ${isRight ? "flex-row-reverse" : "flex-row"}`}>
      {/* Avatar */}
      <div
        className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mb-0.5"
        style={{ backgroundColor: avatarBg }}
      >
        {AvatarIcon}
      </div>

      {/* Burbujas */}
      <div className={`flex flex-col gap-0.5 ${isRight ? "items-end" : "items-start"} min-w-0 flex-1`}>
        {messages.map((msg, i) => (
          <ChatBubble
            key={msg.id}
            msg={msg}
            isFirst={i === 0}
            isLast={i === messages.length - 1}
          />
        ))}
      </div>
    </div>
  );
}

// ── ChatViewer (solo lectura) ──────────────────────────────────────────────────
export default function ChatViewer({ messages }: { messages: BotMessageResponse[] }) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView();
  }, [messages.length]);

  if (messages.length === 0) {
    return (
      <div
        className="flex items-center justify-center h-40 text-sm"
        style={{ backgroundColor: C.bg, color: C.dateTxt }}
      >
        Sin mensajes en esta conversación.
      </div>
    );
  }

  // Agrupar mensajes consecutivos del mismo rol
  const groups: BotMessageResponse[][] = [];
  for (const msg of messages) {
    const last = groups[groups.length - 1];
    if (last && last[0].role === msg.role) last.push(msg);
    else groups.push([msg]);
  }

  // Intercalar separadores de fecha
  type Item =
    | { kind: "date"; label: string }
    | { kind: "group"; messages: BotMessageResponse[] };

  const items: Item[] = [];
  let lastDate = "";
  for (const group of groups) {
    const key = getDateKey(group[0].created_at);
    if (key !== lastDate) {
      items.push({ kind: "date", label: formatDateLabel(group[0].created_at) });
      lastDate = key;
    }
    items.push({ kind: "group", messages: group });
  }

  return (
    <div
      className="flex flex-col gap-3 p-4 h-full overflow-y-auto"
      style={{ backgroundColor: C.bg }}
    >
      {items.map((item, i) =>
        item.kind === "date" ? (
          <div key={`d${i}`} className="flex justify-center my-1">
            <span
              className="text-[11px] px-3 py-1 rounded-full"
              style={{ backgroundColor: C.datePill, color: C.dateTxt }}
            >
              {item.label}
            </span>
          </div>
        ) : (
          <ChatMessageGroup key={`g${i}`} messages={item.messages} />
        )
      )}
      <div ref={bottomRef} />
    </div>
  );
}
