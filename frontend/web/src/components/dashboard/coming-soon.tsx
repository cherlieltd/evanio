import { PageHeader } from "@/components/dashboard/page-header";
import { EmptyState } from "@/components/dashboard/empty-state";

type ComingSoonProps = {
  title: string;
  description: string;
};

export function ComingSoon({ title, description }: ComingSoonProps) {
  return (
    <div>
      <PageHeader title={title} description={description} />
      <EmptyState
        title="Coming soon"
        description="This feature is on the roadmap. You will be able to use it from this page when it ships."
      />
    </div>
  );
}
