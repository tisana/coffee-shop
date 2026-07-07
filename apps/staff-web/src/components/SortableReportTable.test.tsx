import "@testing-library/jest-dom/vitest";

import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { SortableReportTable } from "./SortableReportTable";

interface SalesRow {
  id: string;
  period: string;
  sales: string;
}

const columns = [
  { key: "period", header: "Period", sortable: true, render: (row: SalesRow) => row.period },
  { key: "sales", header: "Sales", sortable: true, render: (row: SalesRow) => row.sales },
  { key: "note", header: "Note", render: () => "Included" }
];

const rows: SalesRow[] = [{ id: "row-1", period: "2026-06-25", sales: "$18.25" }];

describe("SortableReportTable", () => {
  it("renders an empty state when there are no report rows", () => {
    render(<SortableReportTable ariaLabel="Sales summary" columns={columns} rows={[]} />);

    expect(screen.getByText("No report rows match those filters.")).toBeInTheDocument();
    expect(screen.queryByRole("table", { name: "Sales summary" })).not.toBeInTheDocument();
  });

  it("renders rows and exposes sortable headers as focusable buttons", () => {
    render(
      <SortableReportTable
        ariaLabel="Sales summary"
        columns={columns}
        rows={rows}
        sort={{ key: "period", direction: "asc" }}
      />
    );

    const table = screen.getByRole("table", { name: "Sales summary" });
    const periodSort = within(table).getByRole("button", { name: "Sort by Period" });

    periodSort.focus();

    expect(periodSort).toHaveFocus();
    expect(within(table).getByRole("columnheader", { name: "Sort by Period" })).toHaveAttribute(
      "aria-sort",
      "ascending"
    );
    expect(within(table).getByText("2026-06-25")).toBeInTheDocument();
    expect(within(table).getByText("$18.25")).toBeInTheDocument();
    expect(within(table).getByRole("columnheader", { name: "Note" })).toHaveAttribute(
      "aria-sort",
      "none"
    );
  });

  it("emits ascending sort for a new column and descending sort for the active column", () => {
    const onSortChange = vi.fn();

    const { rerender } = render(
      <SortableReportTable
        ariaLabel="Sales summary"
        columns={columns}
        rows={rows}
        sort={{ key: "period", direction: "asc" }}
        onSortChange={onSortChange}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Sort by Sales" }));
    expect(onSortChange).toHaveBeenCalledWith({ key: "sales", direction: "asc" });

    rerender(
      <SortableReportTable
        ariaLabel="Sales summary"
        columns={columns}
        rows={rows}
        sort={{ key: "sales", direction: "asc" }}
        onSortChange={onSortChange}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Sort by Sales" }));
    expect(onSortChange).toHaveBeenCalledWith({ key: "sales", direction: "desc" });
  });

  it("emits row selection and marks the selected report row", () => {
    const onRowSelect = vi.fn();

    render(
      <SortableReportTable
        ariaLabel="Sales summary"
        columns={columns}
        rows={rows}
        selectedRowId="row-1"
        onRowSelect={onRowSelect}
      />
    );

    const row = screen.getByRole("row", { name: "2026-06-25 $18.25 Included" });

    expect(row).toHaveAttribute("aria-selected", "true");
    fireEvent.click(row);
    expect(onRowSelect).toHaveBeenCalledWith(rows[0]);
  });
});
