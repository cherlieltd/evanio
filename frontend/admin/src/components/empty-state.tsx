export function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-card-border bg-white px-6 py-12 text-center">
      <h2 className="font-heading text-lg font-semibold text-ink">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-secondary-text">
        {description}
      </p>
    </div>
  );
}
