"use client";

import { useEffect, useMemo, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { LoaderCircle, Menu, MessageSquarePlus, PanelLeftClose, Sparkles } from "lucide-react";

import { ChatMessage } from "@/components/chat-message";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import type { ChatMessage as ChatMessageType, ChatResponse, ChatThread } from "@/lib/types";
import { cn } from "@/lib/utils";

const storageKey = "levelwellness-thread-id";

function getApiBase() {
  return process.env.NEXT_PUBLIC_API_BASE_URL ?? "/api";
}

const starterPrompts = [
  "Compara custo e latencia entre opcoes DeepSeek e modelos para assistentes web.",
  "Resume os trade-offs de usar Radix UI + shadcn para um produto Vercel-first.",
  "Cria um plano para otimizar custo por conversa mantendo boa qualidade.",
];

export function ChatShell() {
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [status, setStatus] = useState<string>("Ready");
  const apiBase = useMemo(getApiBase, []);

  useEffect(() => {
    const savedThread = window.localStorage.getItem(storageKey);
    if (savedThread) {
      setThreadId(savedThread);
    }
    void loadThreads(savedThread);
  }, []);

  async function loadThreads(preferredThreadId?: string | null) {
    try {
      const response = await fetch(`${apiBase}/threads`, { cache: "no-store" });
      if (!response.ok) {
        throw new Error("Nao foi possivel carregar conversas.");
      }
      const data = (await response.json()) as { threads: ChatThread[] };
      setThreads(data.threads);

      const chosenThread = preferredThreadId ?? data.threads[0]?.id ?? null;
      if (chosenThread) {
        setThreadId(chosenThread);
        window.localStorage.setItem(storageKey, chosenThread);
        await loadMessages(chosenThread);
      }
    } catch (error) {
      console.error(error);
      setStatus("Backend offline or not configured yet.");
    }
  }

  async function loadMessages(nextThreadId: string) {
    try {
      const response = await fetch(`${apiBase}/threads/${nextThreadId}`, { cache: "no-store" });
      if (!response.ok) {
        throw new Error("Nao foi possivel abrir a conversa.");
      }
      const data = (await response.json()) as { messages: ChatMessageType[] };
      setMessages(data.messages);
      setStatus("Conversation loaded");
    } catch (error) {
      console.error(error);
      setMessages([]);
      setStatus("Failed to load conversation");
    }
  }

  async function handleSelectThread(nextThreadId: string) {
    setThreadId(nextThreadId);
    window.localStorage.setItem(storageKey, nextThreadId);
    setSidebarOpen(false);
    await loadMessages(nextThreadId);
  }

  function handleNewThread() {
    const freshThreadId = crypto.randomUUID();
    setThreadId(freshThreadId);
    setMessages([]);
    window.localStorage.setItem(storageKey, freshThreadId);
    setSidebarOpen(false);
    setStatus("New conversation");
  }

  async function submitMessage(message: string) {
    const trimmed = message.trim();
    if (!trimmed || loading) {
      return;
    }

    const activeThreadId = threadId ?? crypto.randomUUID();
    if (!threadId) {
      setThreadId(activeThreadId);
      window.localStorage.setItem(storageKey, activeThreadId);
    }

    setLoading(true);
    setStatus("Thinking...");

    try {
      const response = await fetch(`${apiBase}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          thread_id: activeThreadId,
          message: trimmed,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Falha ao enviar mensagem.");
      }

      const data = (await response.json()) as ChatResponse;
      setMessages(data.messages);
      setThreads((current) => {
        const nextThreads = [data.thread, ...current.filter((item) => item.id !== data.thread.id)];
        return nextThreads;
      });
      setStatus(data.storage === "kv" ? "Saved to Vercel KV" : "Saved in temporary memory");
      setInput("");
    } catch (error) {
      console.error(error);
      setStatus(error instanceof Error ? error.message : "Unexpected error");
    } finally {
      setLoading(false);
    }
  }

  const sidebar = (
    <div className="flex h-full flex-col gap-5 rounded-[30px] border border-white/10 bg-slate-950/70 p-4 shadow-[0_30px_90px_rgba(2,8,23,0.45)] backdrop-blur-xl">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-[var(--accent)]">Level Wellness</p>
          <h2 className="mt-2 text-xl font-semibold text-white">AI Cost Studio</h2>
        </div>
        <Button variant="ghost" size="icon" onClick={handleNewThread} aria-label="New conversation">
          <MessageSquarePlus className="h-5 w-5" />
        </Button>
      </div>
      <div className="rounded-[26px] border border-white/10 bg-white/[0.035] p-4 text-sm text-slate-300">
        Use DeepSeek para responder com contexto do teu backend FastAPI e persistencia no Vercel KV.
      </div>
      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-2 pr-3">
          {threads.length === 0 ? (
            <div className="rounded-[24px] border border-dashed border-white/12 p-4 text-sm text-slate-400">
              Ainda nao ha conversas persistidas.
            </div>
          ) : (
            threads.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => void handleSelectThread(item.id)}
                className={cn(
                  "w-full rounded-[24px] border px-4 py-3 text-left transition",
                  item.id === threadId
                    ? "border-[var(--accent)]/30 bg-[var(--accent)]/10 text-white"
                    : "border-white/8 bg-white/[0.03] text-slate-300 hover:bg-white/[0.06]",
                )}
              >
                <div className="truncate text-sm font-medium">{item.title}</div>
                <div className="mt-1 text-xs text-slate-400">
                  {item.messageCount} msgs · {new Date(item.updatedAt).toLocaleDateString()}
                </div>
              </button>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[1600px] gap-6 px-4 py-4 sm:px-6 lg:px-8 lg:py-6">
      <aside className="hidden w-[320px] shrink-0 lg:block">{sidebar}</aside>

      <div className="flex min-w-0 flex-1 flex-col rounded-[34px] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.84),rgba(2,6,23,0.94))] shadow-[0_50px_150px_rgba(2,8,23,0.55)] backdrop-blur-2xl">
        <header className="flex items-center justify-between border-b border-white/8 px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Dialog.Root open={sidebarOpen} onOpenChange={setSidebarOpen}>
              <Dialog.Trigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open sidebar">
                  <Menu className="h-5 w-5" />
                </Button>
              </Dialog.Trigger>
              <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm" />
                <Dialog.Content className="fixed inset-y-4 left-4 w-[min(88vw,340px)] outline-none lg:hidden">{sidebar}</Dialog.Content>
              </Dialog.Portal>
            </Dialog.Root>
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-[var(--accent)]">Conversational Analytics</p>
              <h1 className="text-lg font-semibold text-white sm:text-2xl">ChatGPT-style assistant for model cost and performance</h1>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={handleNewThread} aria-label="Reset conversation">
            <PanelLeftClose className="h-5 w-5" />
          </Button>
        </header>

        <ScrollArea className="min-h-0 flex-1">
          <div className="mx-auto flex w-full max-w-4xl flex-col gap-5 px-4 py-6 sm:px-6 sm:py-8">
            {messages.length === 0 ? (
              <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
                <div className="rounded-[32px] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(45,212,191,0.18),transparent_42%),linear-gradient(160deg,rgba(255,255,255,0.06),rgba(15,23,42,0.32))] p-7">
                  <div className="mb-5 inline-flex rounded-full border border-[var(--accent)]/25 bg-[var(--accent)]/10 px-4 py-2 text-xs uppercase tracking-[0.32em] text-[var(--accent)]">
                    <Sparkles className="mr-2 h-4 w-4" /> Strategy Mode
                  </div>
                  <h2 className="max-w-2xl text-3xl font-semibold tracking-tight text-white sm:text-5xl">
                    Pergunta como se estivesses a falar com um analista senior de LLM infra.
                  </h2>
                  <p className="mt-4 max-w-2xl text-base leading-8 text-slate-300 sm:text-lg">
                    A interface foi preparada para correr no Vercel com frontend Next.js, App Router API Routes e persistencia em KV para historico de conversas.
                  </p>
                </div>

                <div className="space-y-3">
                  {starterPrompts.map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      onClick={() => setInput(prompt)}
                      className="w-full rounded-[28px] border border-white/10 bg-white/[0.04] p-5 text-left text-sm leading-7 text-slate-200 transition hover:border-[var(--accent)]/25 hover:bg-[var(--accent)]/10"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </section>
            ) : (
              messages.map((message) => <ChatMessage key={message.id} message={message} />)
            )}
          </div>
        </ScrollArea>

        <div className="border-t border-white/8 px-4 py-4 sm:px-6 sm:py-5">
          <div className="mx-auto w-full max-w-4xl">
            <form
              className="space-y-3"
              onSubmit={(event) => {
                event.preventDefault();
                void submitMessage(input);
              }}
            >
              <Textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="Pergunta sobre custo, performance, stack, deploy, Vercel ou comparacoes de modelos..."
                className="min-h-[132px] resize-none"
              />
              <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
                <div className="text-sm text-slate-400">{status}</div>
                <Button type="submit" disabled={loading || !input.trim()}>
                  {loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
                  {loading ? "Generating" : "Send message"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
