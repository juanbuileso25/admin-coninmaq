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
  const thisYear = today.getFullYear();
  const opts: Intl.DateTimeFormatOptions = { weekday: "long", day: "numeric", month: "long" };
  if (date.getFullYear() !== thisYear) opts.year = "numeric";
  return date.toLocaleDateString("es-CO", opts);
}

function formatTime(d: string) {
  return new Date(d).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" });
}

// ── Media content parser ───────────────────────────────────────────────────────
type MediaContent =
  | { kind: "text" }
  | { kind: "audio"; url: string }
  | { kind: "image"; url: string; name: string }
  | { kind: "video"; url: string }
  | { kind: "pdf"; url: string; name: string }
  | { kind: "document"; url: string; name: string }
  | { kind: "contact"; name: string };

const MEDIA_RE = /^\[(Audio|Foto|PDF|Video|Contacto|Documento|Adjunto)\] (.+)$/;

function parseMedia(content: string): MediaContent {
  const m = MEDIA_RE.exec(content.trim());
  if (!m) return { kind: "text" };
  const [, label, rest] = m;
  const isUrl = rest.startsWith("http");
  switch (label) {
    case "Audio":    return isUrl ? { kind: "audio", url: rest } : { kind: "text" };
    case "Foto":     return isUrl ? { kind: "image", url: rest, name: "Foto" } : { kind: "text" };
    case "Video":    return isUrl ? { kind: "video", url: rest } : { kind: "text" };
    case "PDF":      return { kind: "pdf",      url: isUrl ? rest : "", name: rest };
    case "Documento":return { kind: "document", url: isUrl ? rest : "", name: rest };
    case "Contacto": return { kind: "contact",  name: rest };
    default:         return { kind: "text" };
  }
}

function MediaBubble({ media, txtColor, bgColor }: { media: MediaContent; txtColor: string; bgColor: string }) {
  if (media.kind === "audio") {
    return (
      <div style={{ width: 280 }}>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-lg">🎵</span>
          <span className="text-xs opacity-60" style={{ color: txtColor }}>Nota de voz</span>
        </div>
        <audio
          controls
          src={media.url}
          style={{ width: 280, height: 36, colorScheme: "dark", display: "block" }}
        />
      </div>
    );
  }
  if (media.kind === "image") {
    return (
      <a href={media.url} target="_blank" rel="noopener noreferrer" style={{ display: "block", maxWidth: 280 }}>
        <img src={media.url} alt="Foto" style={{ maxWidth: 280, borderRadius: 6, display: "block" }} loading="lazy" />
      </a>
    );
  }
  if (media.kind === "video") {
    return (
      <video controls src={media.url} style={{ maxWidth: 280, borderRadius: 6, display: "block" }} />
    );
  }
  if (media.kind === "pdf" || media.kind === "document") {
    const icon = media.kind === "pdf" ? "📄" : "📎";
    const shortName = media.name.replace(/^https?:\/\/[^\s/]+\/[^\s/]+\/[^\s/]+\//, "");
    return (
      <div style={{ width: 240 }}>
        {media.url ? (
          <a
            href={media.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-start gap-2 text-sm no-underline"
            style={{ color: txtColor }}
          >
            <span className="text-2xl flex-shrink-0">{icon}</span>
            <span className="break-all leading-snug">{shortName}</span>
          </a>
        ) : (
          <div className="flex items-start gap-2 text-sm" style={{ color: txtColor }}>
            <span className="text-2xl flex-shrink-0">{icon}</span>
            <span className="break-all leading-snug opacity-70">{shortName}</span>
          </div>
        )}
      </div>
    );
  }
  if (media.kind === "contact") {
    const name = media.name.replace(/\.[^.]+$/, "").replace(/^\d+-/, "");
    return (
      <div className="flex items-center gap-2 text-sm" style={{ color: txtColor }}>
        <span
          className="w-8 h-8 rounded-full flex items-center justify-center text-base flex-shrink-0"
          style={{ backgroundColor: bgColor === C.userBg ? "#2a3942" : "rgba(255,255,255,0.1)" }}
        >
          👤
        </span>
        <span>{name}</span>
      </div>
    );
  }
  return null;
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
  const isUser    = msg.role === "usuario" || msg.role === "user";
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

      {(() => {
        const media = parseMedia(msg.content);
        const isMedia = media.kind !== "text";
        return (
          <div
            className={`relative px-3 pt-2 pb-1.5 ${radius} ${isMedia ? "" : "max-w-[85%]"}`}
            style={{ backgroundColor: bgColor, minWidth: isMedia ? undefined : 220 }}
          >
            {isFirst && <Tail side={isRight ? "right" : "left"} color={bgColor} />}
            {isMedia
              ? <MediaBubble media={media} txtColor={txtColor} bgColor={bgColor} />
              : <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: txtColor }}>{msg.content}</p>
            }
            {isLast && (
              <span
                className="block text-right text-[10px] mt-0.5"
                style={{ color: tsColor }}
              >
                {formatTime(msg.created_at)}
              </span>
            )}
          </div>
        );
      })()}
    </div>
  );
}

// ── Grupo de mensajes del mismo rol ───────────────────────────────────────────
export function ChatMessageGroup({ messages }: { messages: BotMessageResponse[] }) {
  const role    = messages[0].role;
  const isUser  = role === "usuario" || role === "user";
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
