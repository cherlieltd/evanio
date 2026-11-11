import { Button } from "@/components/ui/button";

type PaginationControlsProps = {
  page: number;
  pageCount: number;
  total: number;
  onPageChange: (page: number) => void;
  label?: string;
};

export function PaginationControls({
  page,
  pageCount,
  total,
  onPageChange,
  label = "rows",
}: PaginationControlsProps) {
  return (
    <div className="mt-4 flex items-center justify-between gap-3">
      <p className="text-xs text-secondary-text">
        Page {page + 1} of {pageCount} · {total} {label}
      </p>
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={page === 0}
          onClick={() => onPageChange(Math.max(0, page - 1))}
        >
          Previous
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={page >= pageCount - 1}
          onClick={() => onPageChange(Math.min(pageCount - 1, page + 1))}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
