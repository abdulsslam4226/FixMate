"use client";

import { useState } from "react";
import { BadgeCheck, MapPin, Phone, ShieldCheck, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { setProviderVerification } from "@/lib/api";
import type { VerificationQueueItem } from "@/lib/types";
import type { Session } from "next-auth";

// Admin workspace for the Localized Trust Engine — reviews each provider's
// NIN/BVN, selfie link and physical guarantor, then flips their status via
// PATCH /admin/providers/:id/verify (Module 3.2-A / 3.3).
export function VerificationQueue({ queue, session }: { queue: VerificationQueueItem[]; session: Session }) {
  const [items, setItems] = useState(queue);
  const [pendingId, setPendingId] = useState<string | null>(null);

  async function handleDecision(id: string, verificationStatus: "VERIFIED" | "REJECTED") {
    setPendingId(id);
    try {
      await setProviderVerification(id, verificationStatus, session.apiToken);
      setItems((prev) => prev.filter((item) => item.id !== id));
    } finally {
      setPendingId(null);
    }
  }

  if (items.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        The queue is empty — every submitted provider profile has been reviewed.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {items.map((item) => (
        <Card key={item.id} className="border-border/60">
          <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
            <div className="flex flex-col gap-1">
              <CardTitle className="font-heading text-base">{item.user.fullName}</CardTitle>
              <span className="text-muted-foreground text-xs">{item.category.name} · {item.user.email}</span>
            </div>
            <Badge variant="outline" className="font-mono">
              {item.verificationStatus}
            </Badge>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <p className="text-muted-foreground text-sm">{item.bio}</p>

            <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
              <div className="flex items-start gap-2">
                <ShieldCheck className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0" />
                <div>
                  <p className="font-mono text-xs uppercase tracking-wide text-muted-foreground">NIN / BVN</p>
                  <p>{item.idNumber}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <BadgeCheck className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0" />
                <div>
                  <p className="font-mono text-xs uppercase tracking-wide text-muted-foreground">Selfie link</p>
                  <a href={item.selfieUrl} target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-4 break-all">
                    {item.selfieUrl}
                  </a>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Phone className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0" />
                <div>
                  <p className="font-mono text-xs uppercase tracking-wide text-muted-foreground">Guarantor</p>
                  <p>{item.guarantorName} · {item.guarantorPhone}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <MapPin className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0" />
                <div>
                  <p className="font-mono text-xs uppercase tracking-wide text-muted-foreground">Coverage</p>
                  <p>{item.latitude}, {item.longitude} · {item.operatingRadiusKm}km radius</p>
                </div>
              </div>
            </div>

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
                onClick={() => handleDecision(item.id, "REJECTED")}
              >
                <XCircle className="h-4 w-4" />
                Reject
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
