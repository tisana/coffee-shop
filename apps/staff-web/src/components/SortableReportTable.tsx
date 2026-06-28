import type { ReactNode } from "react";

export type SortDirection = "asc" | "desc";

export interface SortState {
  key: string;
  direction: SortDirection;
}

export interface SortableReportColumn<TRow> {
  key: string;
  header: string;
  sortable?: boolean;
  render: (row: TRow) => ReactNode;
}

interface SortableReportTableProps<TRow extends { id: string }> {
  ariaLabel: string;
  columns: Array<SortableReportColumn<TRow>>;
  rows: TRow[];
  sort?: SortState;
  onSortChange?: (sort: SortState) => void;
}

export function SortableReportTable<TRow extends { id: string }>({
  ariaLabel,
  columns,
  rows,
  sort,
  onSortChange
}: SortableReportTableProps<TRow>) {
  function nextSort(column: SortableReportColumn<TRow>): SortState {
    if (sort?.key === column.key) {
      return {
        key: column.key,
        direction: sort.direction === "asc" ? "desc" : "asc"
      };
    }

    return { key: column.key, direction: "asc" };
  }

  if (rows.length === 0) {
    return <p className="empty-state">No report rows match those filters.</p>;
  }

  return (
    <div className="report-table-scroll">
      <table className="report-table" aria-label={ariaLabel}>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key} scope="col" aria-sort={ariaSort(column.key, sort)}>
                {column.sortable ? (
                  <button
                    type="button"
                    className="report-sort-button"
                    onClick={() => onSortChange?.(nextSort(column))}
                  >
                    Sort by {column.header}
                  </button>
                ) : (
                  column.header
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              {columns.map((column) => (
                <td key={column.key}>{column.render(row)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ariaSort(columnKey: string, sort: SortState | undefined): "ascending" | "descending" | "none" {
  if (sort?.key !== columnKey) {
    return "none";
  }

  return sort.direction === "asc" ? "ascending" : "descending";
}
