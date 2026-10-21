"use client";

type Props = {
  page: number;
  pageSize: number;
  total: number;
  onChange: (page: number) => void;
  label?: string;
};

export function Pagination({
  page,
  pageSize,
  total,
  onChange,
  label = "items",
}: Props) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (total <= pageSize) return null;

  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div className="pagination" role="navigation" aria-label="Pagination">
      <span className="pagination__meta muted">
        {from}–{to} of {total} {label}
      </span>
      <div className="pagination__controls">
        <button
          type="button"
          className="btn btn--ghost btn--compact"
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
        >
          Prev
        </button>
        <span className="pagination__page">
          {page} / {totalPages}
        </span>
        <button
          type="button"
          className="btn btn--ghost btn--compact"
          disabled={page >= totalPages}
          onClick={() => onChange(page + 1)}
        >
          Next
        </button>
      </div>
    </div>
  );
}
