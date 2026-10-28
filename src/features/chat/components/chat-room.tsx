"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Loader2, SendHorizontal } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { MAX_MESSAGE_LENGTH, POLL_INTERVAL_MS } from "../constants";
import type { ChatMessage } from "../queries";

type PendingMessage = ChatMessage & { pending?: boolean; failed?: boolean };
type SendResult = { ok: true; message: ChatMessage } | { ok: false; error: string };

function mergeMessages(current: PendingMessage[], incoming: ChatMessage[]) {
  const known = new Set(current.map((m) => m.id));
  const fresh = incoming.filter((m) => !known.has(m.id));
  if (fresh.length === 0) return current;
  return [...current, ...fresh].sort((a, b) => {
    // Optimistic messages (negative ids) stay at the bottom until confirmed.
    if (a.id < 0 && b.id > 0) return 1;
    if (b.id < 0 && a.id > 0) return -1;
    return a.id - b.id;
  });
}

/**
 * Real-time-ish chat over HTTP polling: every few seconds (while the tab is visible) it asks
 * the server for messages newer than the last one it has. Swap `poll` for a WebSocket /
 * Pusher / Supabase Realtime subscription to make it push-based.
 */
export function ChatRoom({
  conversationId,
  currentUser,
  initialMessages,
  hasMoreInitially,
  send,
}: {
  conversationId: string;
  currentUser: { id: string; name: string; avatarUrl: string | null };
  initialMessages: ChatMessage[];
  hasMoreInitially: boolean;
  send: (conversationId: string, body: string) => Promise<SendResult>;
}) {
  const [messages, setMessages] = useState<PendingMessage[]>(initialMessages);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(hasMoreInitially);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);
  const preserveScroll = useRef<number | null>(null);
  const tempId = useRef(-1);

  const lastConfirmedId = messages.reduce((max, m) => (m.id > max ? m.id : max), 0);
  const lastIdRef = useRef(lastConfirmedId);
  useEffect(() => {
    lastIdRef.current = lastConfirmedId;
  }, [lastConfirmedId]);

  const poll = useCallback(async (markRead = false) => {
    try {
      const url = `/api/conversations/${conversationId}/messages?after=${lastIdRef.current}${markRead ? "&read=1" : ""}`;
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) return;
      const data: { messages: ChatMessage[] } = await res.json();
      if (data.messages.length) setMessages((current) => mergeMessages(current, data.messages));
    } catch {
      // Network hiccup: the next tick will retry.
    }
  }, [conversationId]);

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | undefined;
    const start = () => {
      if (timer) return;
      timer = setInterval(() => void poll(), POLL_INTERVAL_MS);
    };
    const stop = () => {
      clearInterval(timer);
      timer = undefined;
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        void poll();
        start();
      } else {
        stop();
      }
    };
    // Mark as read on open, then keep polling while the tab is visible.
    void poll(true);
    if (document.visibilityState === "visible") start();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [conversationId, poll]);

  // Keep the view pinned to the newest message unless the user scrolled up to read history.
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (preserveScroll.current !== null) {
      el.scrollTop = el.scrollHeight - preserveScroll.current;
      preserveScroll.current = null;
    } else if (stickToBottom.current) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages]);

  async function loadOlder() {
    const oldest = messages.find((m) => m.id > 0);
    if (!oldest || loadingOlder) return;
    setLoadingOlder(true);
    try {
      const res = await fetch(`/api/conversations/${conversationId}/messages?before=${oldest.id}`, { cache: "no-store" });
      const data: { messages: ChatMessage[] } = await res.json();
      if (scrollRef.current) preserveScroll.current = scrollRef.current.scrollHeight - scrollRef.current.scrollTop;
      setMessages((current) => mergeMessages(current, data.messages));
      if (data.messages.length < 50) setHasMore(false);
    } finally {
      setLoadingOlder(false);
    }
  }

  async function submit() {
    const body = draft.trim();
    if (!body) return;
    if (body.length > MAX_MESSAGE_LENGTH) {
      setError(`Messages are limited to ${MAX_MESSAGE_LENGTH} characters.`);
      return;
    }
    setDraft("");
    setError(null);
    stickToBottom.current = true;

    const id = tempId.current--;
    const now = new Date();
    const optimistic: PendingMessage = {
      id,
      body,
      createdAt: now.toISOString(),
      day: messages.at(-1)?.day ?? "",
      dayLabel: messages.at(-1)?.dayLabel ?? "Today",
      time: now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false }),
      sender: currentUser,
      pending: true,
    };
    setMessages((current) => [...current, optimistic]);

    const result = await send(conversationId, body).catch(() => ({ ok: false as const, error: "Couldn't send. Check your connection." }));
    if (result.ok) {
      setMessages((current) => mergeMessages(current.filter((m) => m.id !== id), [result.message]));
    } else {
      setMessages((current) => current.map((m) => (m.id === id ? { ...m, pending: false, failed: true } : m)));
      setError(result.error);
      setDraft(body);
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div
        ref={scrollRef}
        onScroll={(e) => {
          const el = e.currentTarget;
          stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
        }}
        className="scrollbar-thin min-h-0 flex-1 overflow-y-auto px-3 py-4 sm:px-5"
        aria-live="polite"
      >
        {hasMore && (
          <div className="mb-4 flex justify-center">
            <Button variant="ghost" size="sm" onClick={loadOlder} disabled={loadingOlder}>
              {loadingOlder && <Loader2 className="animate-spin" />} Load earlier messages
            </Button>
          </div>
        )}
        {messages.length === 0 && (
          <p className="py-12 text-center text-sm text-muted-foreground">No messages yet. Say hello 👋</p>
        )}
        {messages.map((m, i) => {
          const prev = messages[i - 1];
          const mine = m.sender?.id === currentUser.id;
          const newDay = !prev || prev.day !== m.day;
          const grouped =
            !newDay &&
            prev?.sender?.id === m.sender?.id &&
            new Date(m.createdAt).getTime() - new Date(prev.createdAt).getTime() < 5 * 60 * 1000;
          return (
            <div key={m.id}>
              {newDay && m.day && (
                <div className="my-4 flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="h-px flex-1 bg-border" />
                  {m.dayLabel}
                  <span className="h-px flex-1 bg-border" />
                </div>
              )}
              <div className={cn("flex gap-2", mine && "flex-row-reverse", grouped ? "mt-0.5" : "mt-3")}>
                <div className="w-8 shrink-0">
                  {!grouped && !mine && (
                    <Avatar name={m.sender?.name ?? "?"} src={m.sender?.avatarUrl} seed={m.sender?.id ?? "x"} size="sm" />
                  )}
                </div>
                <div className={cn("flex max-w-[80%] flex-col", mine ? "items-end" : "items-start")}>
                  {!grouped && !mine && (
                    <span className="mb-0.5 px-1 text-xs font-medium text-muted-foreground">{m.sender?.name ?? "Deleted user"}</span>
                  )}
                  <div
                    className={cn(
                      "rounded-2xl px-3.5 py-2 text-sm leading-relaxed break-words whitespace-pre-wrap",
                      mine ? "rounded-br-md bg-primary text-primary-foreground" : "rounded-bl-md bg-muted",
                      m.pending && "opacity-60",
                      m.failed && "bg-destructive-soft text-destructive",
                    )}
                    title={m.time}
                  >
                    {m.body}
                  </div>
                  {!messages[i + 1] || messages[i + 1].sender?.id !== m.sender?.id ? (
                    <span className="mt-0.5 px-1 text-[11px] text-muted-foreground">
                      {m.failed ? "Not sent" : m.pending ? "Sending…" : m.time}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <form
        className="border-t border-border bg-card p-3"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        {error && <p className="mb-2 text-xs text-destructive">{error}</p>}
        <div className="flex items-end gap-2">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                void submit();
              }
            }}
            rows={1}
            maxLength={MAX_MESSAGE_LENGTH}
            placeholder="Write a message…"
            aria-label="Message"
            className="max-h-40 min-h-10 flex-1 resize-none rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none [field-sizing:content]"
          />
          <Button type="submit" size="icon" className="size-10 rounded-xl" disabled={!draft.trim()} aria-label="Send">
            <SendHorizontal />
          </Button>
        </div>
      </form>
    </div>
  );
}
