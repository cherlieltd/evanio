import { EmptyState } from "@/components/dashboard/empty-state";
import { PageHeader } from "@/components/dashboard/page-header";

export function FeaturePlaceholder({
  title,
  description,
  actionHref,
  actionLabel = "Get started",
}: {
  title: string;
  description: string;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <div>
      <PageHeader title={title} description={description} />
      <EmptyState
        title="Nothing here yet"
        description="This workspace page is ready. Start creating to fill it with activity."
        actionHref={actionHref}
        actionLabel={actionLabel}
      />
    </div>
  );
}
