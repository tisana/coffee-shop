import "@testing-library/jest-dom/vitest";

import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { ReportFilter } from "@coffee-shop/shared/contracts/api";

import { ReportFilters, type ReportFilterCategoryOption } from "./ReportFilters";

const baseFilter: ReportFilter = {
  startDate: "2026-06-01",
  endDate: "2026-06-30",
  period: "daily",
  statuses: ["completed", "picked_up"],
  menuCategoryId: null,
  menuItemId: null
};

const categories: ReportFilterCategoryOption[] = [
  {
    id: "category-coffee",
    name: "Coffee",
    items: [
      { id: "item-latte", name: "Latte" },
      { id: "item-mocha", name: "Mocha" }
    ]
  },
  {
    id: "category-tea",
    name: "Tea",
    items: [{ id: "item-matcha", name: "Matcha" }]
  }
];

describe("ReportFilters", () => {
  it("renders accessible controls for the base report filters", () => {
    render(<ReportFilters value={baseFilter} categories={categories} onChange={vi.fn()} />);

    expect(screen.getByRole("form", { name: "Report filters" })).toBeInTheDocument();
    expect(screen.getByLabelText("Period")).toHaveValue("daily");
    expect(screen.getByLabelText("Start date")).toHaveValue("2026-06-01");
    expect(screen.getByLabelText("End date")).toHaveValue("2026-06-30");
    expect(screen.getByLabelText("Status")).toHaveDisplayValue(["Completed", "Picked up"]);
    expect(screen.getByLabelText("Category")).toHaveDisplayValue("All categories");
    expect(screen.getByLabelText("Item")).toHaveDisplayValue("All items");
  });

  it("emits period, date, and status changes without dropping existing filters", () => {
    const onChange = vi.fn();

    render(<ReportFilters value={baseFilter} categories={categories} onChange={onChange} />);

    fireEvent.change(screen.getByLabelText("Period"), { target: { value: "monthly" } });
    fireEvent.change(screen.getByLabelText("Start date"), { target: { value: "2026-06-10" } });
    fireEvent.change(screen.getByLabelText("End date"), { target: { value: "2026-06-20" } });

    const statusSelect = screen.getByLabelText("Status") as HTMLSelectElement;
    for (const option of Array.from(statusSelect.options)) {
      option.selected = option.value === "cancelled";
    }
    fireEvent.change(statusSelect);

    expect(onChange).toHaveBeenCalledWith({ ...baseFilter, period: "monthly" });
    expect(onChange).toHaveBeenCalledWith({ ...baseFilter, startDate: "2026-06-10" });
    expect(onChange).toHaveBeenCalledWith({ ...baseFilter, endDate: "2026-06-20" });
    expect(onChange).toHaveBeenCalledWith({ ...baseFilter, statuses: ["cancelled"] });
  });

  it("resets the selected item when the category changes", () => {
    const onChange = vi.fn();

    render(
      <ReportFilters
        value={{ ...baseFilter, menuCategoryId: "category-coffee", menuItemId: "item-latte" }}
        categories={categories}
        onChange={onChange}
      />
    );

    fireEvent.change(screen.getByLabelText("Category"), { target: { value: "category-tea" } });

    expect(onChange).toHaveBeenCalledWith({
      ...baseFilter,
      menuCategoryId: "category-tea",
      menuItemId: null
    });
  });

  it("narrows item options to the selected category and emits item changes", () => {
    const onChange = vi.fn();

    render(
      <ReportFilters
        value={{ ...baseFilter, menuCategoryId: "category-tea" }}
        categories={categories}
        onChange={onChange}
      />
    );

    const itemSelect = screen.getByLabelText("Item");

    expect(within(itemSelect).getByRole("option", { name: "Matcha" })).toBeInTheDocument();
    expect(within(itemSelect).queryByRole("option", { name: "Latte" })).not.toBeInTheDocument();

    fireEvent.change(itemSelect, { target: { value: "item-matcha" } });

    expect(onChange).toHaveBeenCalledWith({
      ...baseFilter,
      menuCategoryId: "category-tea",
      menuItemId: "item-matcha"
    });
  });
});
