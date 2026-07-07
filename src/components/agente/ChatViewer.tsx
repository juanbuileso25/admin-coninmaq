import { Bot, Headphones, User } from "lucide-react";
import type { BotMessageResponse } from "../../services/api";

// ── Burbuja individual ─────────────────────────────────────────────────────────

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

      {isLast && (
        <span className={`text-[10px] mt-0.5 ${timeColor}`}>{timestamp}</span>
      )}
    </div>
  );
}

// ── Grupo de mensajes consecutivos del mismo rol ───────────────────────────────

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

// ── ChatViewer (solo lectura) ──────────────────────────────────────────────────

export default function ChatViewer({ messages }: { messages: BotMessageResponse[] }) {
  if (messages.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-fg-5 text-sm">
        Sin mensajes en esta conversación.
      </div>
    );
  }

  const groups: BotMessageResponse[][] = [];
  for (const msg of messages) {
    const last = groups[groups.length - 1];
    if (last && last[0].role === msg.role) {
      last.push(msg);
    } else {
      groups.push([msg]);
    }
  }

  return (
    <div className="flex flex-col gap-3 p-4">
      {groups.map((group, i) => (
        <MessageGroup key={i} messages={group} />
      ))}
    </div>
  );
}
