import { Bot, User2 } from "lucide-react";

import { cn } from "@/lib/utils";
import type { ChatMessage as ChatMessageType } from "@/lib/types";

type ChatMessageProps = {
  message: ChatMessageType;
};

export function ChatMessage({ message }: ChatMessageProps) {
  const isAssistant = message.role === "assistant";

  return (
    <article
      className={cn(
        "group rounded-[30px] border px-5 py-4 shadow-[0_24px_60px_rgba(15,23,42,0.22)] backdrop-blur-xl",
        isAssistant
          ? "border-white/10 bg-white/[0.045]"
          : "ml-auto border-[var(--accent)]/25 bg-[linear-gradient(135deg,rgba(45,212,191,0.14),rgba(15,23,42,0.78))]",
      )}
    >
      <div className="mb-3 flex items-center gap-3 text-xs uppercase tracking-[0.28em] text-slate-400">
        <span
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-full border",
            isAssistant ? "border-white/10 bg-white/5" : "border-[var(--accent)]/30 bg-[var(--accent)]/10 text-[var(--accent)]",
          )}
        >
          {isAssistant ? <Bot className="h-4 w-4" /> : <User2 className="h-4 w-4" />}
        </span>
        <div className="flex flex-col gap-1">
          <span className="text-[10px] text-slate-500">{isAssistant ? "Level Wellness AI" : "You"}</span>
          <span>{new Date(message.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
        </div>
      </div>
      <div className="space-y-4 text-[15px] leading-7 whitespace-pre-wrap text-slate-100">{message.content}</div>
    </article>
  );
}
