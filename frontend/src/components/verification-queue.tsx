"use client";

import { useState } from "react";
import { BadgeCheck, Calendar, CheckCircle2, MapPin, Phone, ShieldCheck, User, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { setProviderVerification } from "@/lib/api";
import type { VerificationQueueItem } from "@/lib/types";
import type { Session } from "next-auth";

export function VerificationQueue({ queue, session }: { queue: VerificationQueueItem[]; session: Session }) {
  const [items, setItems] = useState(queue);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [decided, setDecided] = useState<Record<string, "VERIFIED" | "REJECTED">>({});
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  async function handleDecision(id: string, verificationStatus: "VERIFIED" | "REJECTED", reason?: string) {
    setPendingId(id);
    try {
      await setProviderVerification(id, verificationStatus, session.apiToken, reason);
      setDecided((prev) => ({ ...prev, [id]: verificationStatus }));
      setRejectingId(null);
      setRejectReason("");
      setTimeout(() => setItems((prev) => prev.filter((item) => item.id !== id)), 1800);
    } finally {
      setPendingId(null);
    }
  }

  function startReject(id: string) {
    setRejectingId(id);
    setRejectReason("");
  }

  function cancelReject() {
    setRejectingId(null);
    setRejectReason("");
  }

  if (items.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        The queue is empty — every submitted provider profile has been reviewed.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {items.map((item) => (
        <Card key={item.id} className="border-border/60">
          <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
            <div className="flex flex-col gap-1">
              <CardTitle className="font-heading text-base">{item.user.fullName}</CardTitle>
              <span className="text-muted-foreground text-xs">
                {item.category.name} · submitted {new Date(item.createdAt).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })}
              </span>
            </div>
            <Badge variant="outline" className="font-mono">
              {item.verificationStatus}
            </Badge>
          </CardHeader>

          <CardContent className="flex flex-col gap-5">
            {/* Bio */}
            <p className="text-muted-foreground text-sm">{item.bio}</p>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              {/* Left column — selfie + identity */}
              <div className="flex flex-col gap-4">
                {/* Selfie */}
                <div className="flex flex-col gap-2">
                  <p className="font-mono text-xs uppercase tracking-wide text-muted-foreground">Verification selfie</p>
                  {item.selfieUrl ? (
                    <a href={item.selfieUrl} target="_blank" rel="noopener noreferrer">
                      <img
                        src={item.selfieUrl}
                        alt={`${item.user.fullName} verification selfie`}
                        className="h-36 w-36 rounded-lg object-cover ring-1 ring-white/10 transition-opacity hover:opacity-80"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                    </a>
                  ) : (
                    <span className="text-muted-foreground text-xs">No selfie submitted</span>
                  )}
                </div>

                {/* NIN / BVN */}
                <div className="flex items-start gap-2 text-sm">
                  <ShieldCheck className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0" />
                  <div>
                    <p className="font-mono text-xs uppercase tracking-wide text-muted-foreground">NIN / BVN</p>
                    <p className="font-mono tracking-wider">{item.idNumber}</p>
                  </div>
                </div>
              </div>

              {/* Right column — contact + guarantor + location */}
              <div className="flex flex-col gap-4 text-sm">
                {/* Contact */}
                <div className="flex items-start gap-2">
                  <User className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0" />
                  <div>
                    <p className="font-mono text-xs uppercase tracking-wide text-muted-foreground">Contact</p>
                    <p>{item.user.email}</p>
                    <p className="text-muted-foreground text-xs">{item.user.phoneNumber}</p>
                  </div>
                </div>

                {/* Guarantor */}
                <div className="flex items-start gap-2">
                  <Phone className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0" />
                  <div>
                    <p className="font-mono text-xs uppercase tracking-wide text-muted-foreground">Guarantor</p>
                    <p>{item.guarantorName}</p>
                    <p className="text-muted-foreground text-xs">{item.guarantorPhone}</p>
                  </div>
                </div>

                {/* Location */}
                <div className="flex items-start gap-2">
                  <MapPin className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0" />
                  <div>
                    <p className="font-mono text-xs uppercase tracking-wide text-muted-foreground">Coverage</p>
                    <p>{Number(item.latitude).toFixed(4)}, {Number(item.longitude).toFixed(4)}</p>
                    <p className="text-muted-foreground text-xs">{item.operatingRadiusKm} km operating radius</p>
                  </div>
                </div>

                {/* Member since */}
                <div className="flex items-start gap-2">
                  <Calendar className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0" />
                  <div>
                    <p className="font-mono text-xs uppercase tracking-wide text-muted-foreground">Account created</p>
                    <p>{new Date(item.user.createdAt).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="border-border/40 flex flex-col gap-3 border-t pt-4">
              {decided[item.id] ? (
                <span className={`flex items-center gap-1.5 font-mono text-xs ${decided[item.id] === "VERIFIED" ? "text-emerald-400" : "text-zinc-400"}`}>
                  <CheckCircle2 className="h-4 w-4" />
                  {decided[item.id] === "VERIFIED" ? "Approved — provider notified" : "Rejected — provider notified"}
                </span>
              ) : rejectingId === item.id ? (
                <div className="flex flex-col gap-2">
                  <label className="font-mono text-xs uppercase tracking-wide text-muted-foreground">
                    Reason for rejection <span className="normal-case tracking-normal opacity-60">(optional — shown to provider)</span>
                  </label>
                  <textarea
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="e.g. Selfie photo is blurry and does not match the submitted ID."
                    rows={2}
                    className="border-input bg-input/30 focus-visible:ring-ring/50 focus-visible:border-ring w-full rounded-lg border px-3 py-2 text-sm outline-none focus-visible:ring-2"
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      disabled={pendingId === item.id}
                      onClick={() => handleDecision(item.id, "REJECTED", rejectReason || undefined)}
                      className="border-destructive/50 text-destructive hover:bg-destructive/10 w-fit"
                      variant="outline"
                    >
                      <XCircle className="h-4 w-4" />
                      {pendingId === item.id ? "Rejecting…" : "Confirm rejection"}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={cancelReject} className="text-muted-foreground">
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    disabled={pendingId === item.id}
                    onClick={() => handleDecision(item.id, "VERIFIED")}
                    className="gradient-violet border-0 text-primary-foreground"
                  >
                    <BadgeCheck className="h-4 w-4" />
                    Approve &amp; verify
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={pendingId === item.id}
                    onClick={() => startReject(item.id)}
                  >
                    <XCircle className="h-4 w-4" />
                    Reject
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
