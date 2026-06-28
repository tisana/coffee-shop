import "@testing-library/jest-dom/vitest";

import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { ReportFilter } from "@coffee-shop/shared/contracts/api";

import { ReportChart } from "./ReportChart";
import { ReportFilters } from "./ReportFilters";
import { ReportMetricGrid } from "./ReportMetricGrid";
import { SortableReportTable, type SortDirection } from "./SortableReportTable";

const filter: ReportFilter = {
  startDate: "2026-06-01",
  endDate: "2026-06-30",
  period: "daily",
  statuses: ["completed", "picked_up"],
  menuCategoryId: null,
  menuItemId: null
};

describe("report UI foundation components", () => {
  it("renders report filter controls and emits normalized values", () => {
    const onChange = vi.fn();

    render(
      <ReportFilters
        value={filter}
        categories={[
          {
            id: "category-1",
            name: "Coffee",
            items: [{ id: "item-1", name: "Latte" }]
          }
        ]}
        onChange={onChange}
      />
    );

    fireEvent.change(screen.getByLabelText("Period"), { target: { value: "weekly" } });
    fireEvent.change(screen.getByLabelText("Category"), { target: { value: "category-1" } });

    expect(onChange).toHaveBeenCalledWith({ ...filter, period: "weekly" });
    expect(onChange).toHaveBeenCalledWith({
      ...filter,
      menuCategoryId: "category-1",
      menuItemId: null
    });
  });

  it("renders sortable table headers as keyboard-accessible buttons", () => {
    const onSortChange = vi.fn();

    render(
      <SortableReportTable
        ariaLabel="Sales summary"
        columns={[
          { key: "period", header: "Period", sortable: true, render: (row) => row.period },
          { key: "sales", header: "Sales", sortable: true, render: (row) => row.sales }
        ]}
        rows={[{ id: "row-1", period: "Jun 25", sales: "$18.25" }]}
        sort={{ key: "period", direction: "asc" }}
        onSortChange={onSortChange}
      />
    );

    const table = screen.getByRole("table", { name: "Sales summary" });
    fireEvent.click(within(table).getByRole("button", { name: "Sort by Sales" }));

    expect(within(table).getByText("Jun 25")).toBeInTheDocument();
    expect(onSortChange).toHaveBeenCalledWith({ key: "sales", direction: "asc" satisfies SortDirection });
  });

  it("renders chart and metric primitives with accessible labels", () => {
    render(
      <>
        <ReportMetricGrid
          metrics={[
            { label: "Total sales", value: "$18.25" },
            { label: "Orders", value: "3" }
          ]}
        />
        <ReportChart
          ariaLabel="Daily sales chart"
          bars={[
            { label: "Mon", value: 10 },
            { label: "Tue", value: 20 }
          ]}
        />
      </>
    );

    expect(screen.getByText("Total sales")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Daily sales chart" })).toBeInTheDocument();
    expect(screen.getByText("Tue")).toBeInTheDocument();
  });
});
