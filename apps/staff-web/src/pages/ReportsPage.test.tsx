import "@testing-library/jest-dom/vitest";

import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  emptyReportSalesResponse,
  popularCombinationReport,
  popularItemReport,
  reportSalesResponse
} from "../test/reportTestData";
import { ApiClientError } from "../services/apiClient";
import { getReportFilterOptions, getReportSales } from "../services/reportsApi";
import { ReportsPage } from "./ReportsPage";

vi.mock("../services/reportsApi", () => ({
  getReportFilterOptions: vi.fn(),
  getReportSales: vi.fn()
}));

const categoryResponse = {
  categories: [
    {
      id: "category-coffee",
      name: "Coffee",
      displayOrder: 1,
      active: true,
      menuItems: [
        {
          id: "item-latte",
          categoryId: "category-coffee",
          name: "Latte",
          description: "Espresso with milk",
          imageUrl: null,
          price: "4.50",
          available: true,
          active: true,
          displayOrder: 1,
          customizationGroups: []
        }
      ]
    }
  ]
};

describe("ReportsPage", () => {
  beforeEach(() => {
    vi.mocked(getReportFilterOptions).mockResolvedValue(categoryResponse);
    vi.mocked(getReportSales).mockResolvedValue(
      reportSalesResponse({
        overall: {
          totalSales: "42.00",
          orderCount: 6,
          averageOrderValue: "7.00",
          topSellingItemName: "Latte",
          topSellingItemQuantity: 4
        },
        periods: [
          {
            key: "2026-06-25",
            label: "2026-06-25",
            startDate: "2026-06-25",
            endDate: "2026-06-25",
            partial: false,
            totalSales: "42.00",
            orderCount: 6,
            averageOrderValue: "7.00",
            topSellingItemName: "Latte",
            topSellingItemQuantity: 4
          }
        ],
        popularItems: [],
        popularCombinations: []
      })
    );
  });

  it("shows loading state before rendering sales summary metrics, chart, and table", async () => {
    render(<ReportsPage />);

    expect(screen.getByText("Loading sales report.")).toBeInTheDocument();
    expect(await screen.findAllByText("$42.00")).toHaveLength(2);
    expect(screen.getByText("6 orders")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Sales by period chart" })).toBeInTheDocument();
    expect(screen.getByRole("table", { name: "Sales summary table" })).toBeInTheDocument();
    expect(screen.getAllByText("Latte").length).toBeGreaterThanOrEqual(2);
  });

  it("shows an empty state while preserving zero-value period rows", async () => {
    vi.mocked(getReportSales).mockResolvedValue(
      emptyReportSalesResponse({
        startDate: "2026-06-25",
        endDate: "2026-06-25",
        period: "daily",
        statuses: ["completed", "picked_up"],
        menuCategoryId: null,
        menuItemId: null
      })
    );

    render(<ReportsPage />);

    expect(await screen.findByText("No sales match those filters.")).toBeInTheDocument();
    expect(screen.getAllByText("$0.00").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByRole("table", { name: "Sales summary table" })).toBeInTheDocument();
  });

  it("shows report load errors", async () => {
    vi.mocked(getReportSales).mockRejectedValue(
      new ApiClientError(500, "Unable to load report data.")
    );

    render(<ReportsPage />);

    expect(await screen.findByText("Unable to load report data.")).toBeInTheDocument();
  });

  it("reloads sales summary when the period filter changes", async () => {
    render(<ReportsPage />);

    await screen.findByRole("table", { name: "Sales summary table" });
    fireEvent.change(screen.getByLabelText("Period"), { target: { value: "weekly" } });

    await waitFor(() => {
      expect(getReportSales).toHaveBeenLastCalledWith(
        expect.objectContaining({ period: "weekly" })
      );
    });
  });

  it("sorts sales summary rows in the table without changing chart data", async () => {
    vi.mocked(getReportSales).mockResolvedValue(
      reportSalesResponse({
        periods: [
          {
            key: "2026-06-25",
            label: "Jun 25",
            startDate: "2026-06-25",
            endDate: "2026-06-25",
            partial: false,
            totalSales: "10.00",
            orderCount: 1,
            averageOrderValue: "10.00",
            topSellingItemName: "Latte",
            topSellingItemQuantity: 1
          },
          {
            key: "2026-06-26",
            label: "Jun 26",
            startDate: "2026-06-26",
            endDate: "2026-06-26",
            partial: false,
            totalSales: "30.00",
            orderCount: 3,
            averageOrderValue: "10.00",
            topSellingItemName: "Mocha",
            topSellingItemQuantity: 3
          }
        ],
        popularItems: [],
        popularCombinations: []
      })
    );

    render(<ReportsPage />);

    const table = await screen.findByRole("table", { name: "Sales summary table" });
    fireEvent.click(within(table).getByRole("button", { name: "Sort by Total sales" }));

    const rows = within(table).getAllByRole("row");
    expect(rows[1]).toHaveTextContent("Jun 25");
    expect(rows[2]).toHaveTextContent("Jun 26");

    fireEvent.click(within(table).getByRole("button", { name: "Sort by Total sales" }));

    const sortedRows = within(table).getAllByRole("row");
    expect(sortedRows[1]).toHaveTextContent("Jun 26");
    expect(sortedRows[2]).toHaveTextContent("Jun 25");
    expect(screen.getByRole("img", { name: "Sales by period chart" })).toHaveTextContent("Jun 25");
    expect(screen.getByRole("img", { name: "Sales by period chart" })).toHaveTextContent("Jun 26");
  });

  it("renders popular item and order combination charts with matching sortable tables", async () => {
    vi.mocked(getReportSales).mockResolvedValue(
      reportSalesResponse({
        popularItems: [
          popularItemReport({
            rank: 1,
            sourceMenuItemId: "item-latte",
            itemName: "Latte",
            categoryName: "Coffee",
            quantitySold: 6,
            orderCount: 3,
            salesAmount: "27.00"
          }),
          popularItemReport({
            rank: 2,
            sourceMenuItemId: "item-mocha",
            itemName: "Mocha",
            categoryName: "Coffee",
            quantitySold: 4,
            orderCount: 2,
            salesAmount: "24.00"
          })
        ],
        popularCombinations: [
          popularCombinationReport({
            rank: 1,
            combinationKey: "Latte x1|Mocha x1",
            combinationLabel: "Latte x1 + Mocha x1",
            orderFrequency: 3,
            itemCount: 2,
            salesAmount: "31.50"
          }),
          popularCombinationReport({
            rank: 2,
            combinationKey: "Cold Brew x2",
            combinationLabel: "Cold Brew x2",
            orderFrequency: 2,
            itemCount: 2,
            salesAmount: "20.00"
          })
        ]
      })
    );

    render(<ReportsPage />);

    expect(await screen.findByRole("img", { name: "Popular items chart" })).toHaveTextContent("Latte");
    expect(screen.getByRole("img", { name: "Popular combinations chart" })).toHaveTextContent(
      "Latte x1 + Mocha x1"
    );

    const itemTable = screen.getByRole("table", { name: "Popular items table" });
    expect(within(itemTable).getByRole("cell", { name: "Latte" })).toBeInTheDocument();
    expect(within(itemTable).getByRole("cell", { name: "6" })).toBeInTheDocument();

    const combinationTable = screen.getByRole("table", { name: "Popular combinations table" });
    expect(
      within(combinationTable).getByRole("cell", { name: "Latte x1 + Mocha x1" })
    ).toBeInTheDocument();
    expect(within(combinationTable).getByRole("cell", { name: "3" })).toBeInTheDocument();

    fireEvent.click(within(itemTable).getByRole("button", { name: "Sort by Sales amount" }));
    fireEvent.click(within(combinationTable).getByRole("button", { name: "Sort by Frequency" }));

    expect(within(itemTable).getAllByRole("row")[1]).toHaveTextContent("Mocha");
    expect(within(combinationTable).getAllByRole("row")[1]).toHaveTextContent("Cold Brew x2");
    expect(screen.getByRole("img", { name: "Popular items chart" })).toHaveTextContent("Latte");
    expect(screen.getByRole("img", { name: "Popular combinations chart" })).toHaveTextContent(
      "Latte x1 + Mocha x1"
    );
  });
});
