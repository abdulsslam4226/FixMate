"use client";

import { useState } from "react";
import { BadgeCheck, Calendar, MapPin, Phone, ShieldCheck, User, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { setProviderVerification } from "@/lib/api";
import type { VerificationQueueItem } from "@/lib/types";
import type { Session } from "next-auth";

// Admin workspace for the Localized Trust Engine — renders each provider's
// selfie photo, NIN/BVN, guarantor, and location so the admin can make a
// real trust decision, then approve or reject (Module 3.2-A).
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
            <div className="border-border/40 flex flex-wrap gap-2 border-t pt-4">
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
