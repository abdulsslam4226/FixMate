"use client";

import { useEffect, useRef, useState } from "react";
import { MessageCircle, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { getBookingMessages, sendBookingMessage } from "@/lib/api";
import type { Message } from "@/lib/types";

const fmt = (iso: string) =>
  new Date(iso).toLocaleString("en-NG", { dateStyle: "short", timeStyle: "short" });

export function MessageThread({
  bookingId,
  currentUserId,
  apiToken,
  disabled,
}: {
  bookingId: string;
  currentUserId: string;
  apiToken: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[] | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || messages !== null) return;
    getBookingMessages(bookingId, apiToken)
      .then(setMessages)
      .catch(() => setMessages([]));
  }, [open, bookingId, apiToken, messages]);

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.trim()) return;
    setSending(true);
    setError(null);
    try {
      const msg = await sendBookingMessage(bookingId, draft.trim(), apiToken);
      setMessages((prev) => [...(prev ?? []), msg]);
      setDraft("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send message.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-fit items-center gap-1.5 font-mono text-xs text-muted-foreground underline underline-offset-2 transition-colors hover:text-foreground"
      >
        <MessageCircle className="h-3.5 w-3.5" />
        {open ? "Hide messages" : `Messages${messages && messages.length > 0 ? ` (${messages.length})` : ""}`}
      </button>

      {open && (
        <div className="flex flex-col gap-2 rounded-xl border border-border/40 bg-background/50 p-3">
          {/* Message list */}
          <div className="flex max-h-64 flex-col gap-2 overflow-y-auto">
            {messages === null && (
              <p className="text-center font-mono text-xs text-muted-foreground py-4">Loading…</p>
            )}
            {messages !== null && messages.length === 0 && (
              <p className="text-center font-mono text-xs text-muted-foreground py-4">
                No messages yet. Say hello!
              </p>
            )}
            {messages?.map((msg) => {
              const mine = msg.senderId === currentUserId;
              return (
                <div key={msg.id} className={`flex flex-col gap-0.5 ${mine ? "items-end" : "items-start"}`}>
                  <div
                    className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                      mine
                        ? "gradient-violet text-primary-foreground"
                        : "bg-muted text-foreground"
                    }`}
                  >
                    {msg.text}
                  </div>
                  <span className="font-mono text-[10px] text-muted-foreground">
                    {mine ? "You" : msg.sender.fullName} · {fmt(msg.createdAt)}
                  </span>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          {!disabled && (
            <form onSubmit={handleSend} className="flex flex-col gap-2 border-t border-border/30 pt-2">
              <Textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Type a message…"
                rows={2}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend(e as unknown as React.FormEvent);
                  }
                }}
                className="resize-none text-sm"
              />
              {error && <p className="text-destructive text-xs">{error}</p>}
              <Button
                type="submit"
                size="sm"
                disabled={sending || !draft.trim()}
                className="gradient-violet w-fit border-0 text-primary-foreground"
              >
                <Send className="h-3.5 w-3.5" />
                {sending ? "Sending…" : "Send"}
              </Button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
