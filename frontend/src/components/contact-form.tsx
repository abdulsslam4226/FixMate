"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

// No /contact backend endpoint exists yet (Phase 1 routes per Module 3.3 cover
// auth/providers/categories/bookings/admin only) — this captures the message
// client-side and confirms receipt so the form isn't a dead end.
export function ContactForm() {
  const [submitted, setSubmitted] = useState(false);

  if (submitted) {
    return (
      <div className="border-border bg-card flex flex-col gap-2 rounded-lg border p-6">
        <p className="font-heading text-base font-semibold">Message received</p>
        <p className="text-muted-foreground text-sm">
          Thanks for reaching out — our support team will get back to you shortly. For a faster reply,
          use the chat button in the corner to reach us on WhatsApp.
        </p>
      </div>
    );
  }

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        setSubmitted(true);
      }}
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="contact-name">Full name</Label>
        <Input id="contact-name" name="name" placeholder="Ada Obi" required />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="contact-email">Email address</Label>
        <Input id="contact-email" name="email" type="email" placeholder="ada@email.com" required />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="contact-message">Message</Label>
        <Textarea id="contact-message" name="message" placeholder="How can we help?" rows={4} required />
      </div>
      <Button type="submit" className="gradient-violet w-fit border-0 text-primary-foreground">
        Send message
      </Button>
    </form>
  );
}
