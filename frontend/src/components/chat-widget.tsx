"use client";

import { useState } from "react";
import { MessageCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Floating "Chat with us" entry point. FixMate's support channel runs through
// WhatsApp via the n8n automation engine (Module 1.1) — this widget hands off
// to that channel rather than faking an in-app live chat.
export function ChatWidget() {
  const [open, setOpen] = useState(false);

  return (
    <div className="fixed right-6 bottom-6 z-50 flex flex-col items-end gap-3">
      {open && (
        <Card className="verified-glow w-72 border-0">
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardTitle className="font-heading text-base">Chat with FixMate</CardTitle>
            <Button variant="ghost" size="icon-sm" onClick={() => setOpen(false)} aria-label="Close chat">
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <p className="text-muted-foreground text-sm">
              Got a question about a booking or a verified artisan? Message our support team on WhatsApp
              and we&apos;ll get right back to you.
            </p>
            <Button
              nativeButton={false}
              render={
                <a href="https://wa.me/2340000000000" target="_blank" rel="noopener noreferrer">
                  Open WhatsApp chat
                </a>
              }
              className="gradient-violet border-0 text-primary-foreground"
            />
          </CardContent>
        </Card>
      )}

      <Button
        size="icon-lg"
        onClick={() => setOpen((v) => !v)}
        className="gradient-violet verified-glow rounded-full border-0 text-primary-foreground shadow-lg"
        aria-label={open ? "Close chat" : "Open chat"}
      >
        {open ? <X className="h-5 w-5" /> : <MessageCircle className="h-5 w-5" />}
      </Button>
    </div>
  );
}
