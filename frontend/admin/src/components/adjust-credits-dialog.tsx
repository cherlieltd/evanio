"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { adjustCredits } from "@/lib/admin-data";

type AdjustCreditsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userLabel: string;
  onSaved?: () => void;
};

export function AdjustCreditsDialog({
  open,
  onOpenChange,
  userId,
  userLabel,
  onSaved,
}: AdjustCreditsDialogProps) {
  const [amount, setAmount] = useState("100");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSave(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    const parsed = Number(amount);
    if (!Number.isInteger(parsed) || parsed === 0) {
      setError("Amount must be a non-zero integer.");
      return;
    }
    if (reason.trim().length < 3) {
      setError("Reason is required.");
      return;
    }

    setBusy(true);
    try {
      await adjustCredits({
        userId,
        amount: parsed,
        reason: reason.trim(),
      });
      onOpenChange(false);
      setReason("");
      onSaved?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to adjust credits");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adjust credits</DialogTitle>
          <DialogDescription>
            Update credit balance for {userLabel}. Positive adds, negative
            deducts.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSave} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="adjust-amount">Amount</Label>
            <Input
              id="adjust-amount"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="adjust-reason">Reason</Label>
            <Input
              id="adjust-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              required
              minLength={3}
              placeholder="Support credit, refund correction…"
            />
          </div>
          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
