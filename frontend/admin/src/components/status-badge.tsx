import { cn } from "@/lib/utils";
import type { SubscriptionStatus } from "@/lib/admin-mock";

const styles: Record<SubscriptionStatus, string> = {
  active: "bg-status-active-bg text-status-active-fg",
  trialing: "bg-status-trial-bg text-status-trial-fg",
  past_due: "bg-status-pastdue-bg text-status-pastdue-fg",
  canceled: "bg-status-canceled-bg text-status-canceled-fg",
};

const labels: Record<SubscriptionStatus, string> = {
  active: "Active",
  trialing: "Trial",
  past_due: "Past due",
  canceled: "Canceled",
};

export function StatusBadge({ status }: { status: SubscriptionStatus }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold",
        styles[status],
      )}
    >
      {labels[status]}
    </span>
  );
}
