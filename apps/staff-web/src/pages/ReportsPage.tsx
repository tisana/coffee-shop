import { useEffect, useMemo, useState } from "react";

import type {
  MenuCategoriesResponse,
  PopularCombinationReport,
  PopularItemReport,
  ReportFilter,
  ReportPeriodSummary
} from "@coffee-shop/shared/contracts/api";

import { ReportChart } from "../components/ReportChart";
import { ReportFilters, type ReportFilterCategoryOption } from "../components/ReportFilters";
import { ReportMetricGrid } from "../components/ReportMetricGrid";
import {
  SortableReportTable,
  type SortState
} from "../components/SortableReportTable";
import { ApiClientError } from "../services/apiClient";
import { getReportFilterOptions, getReportSales } from "../services/reportsApi";

interface SalesSummaryRow extends ReportPeriodSummary {
  id: string;
}

interface PopularItemRow extends PopularItemReport {
  id: string;
}

interface PopularCombinationRow extends PopularCombinationReport {
  id: string;
}

const defaultStatuses: ReportFilter["statuses"] = ["completed", "picked_up"];

export function ReportsPage() {
  const [filter, setFilter] = useState<ReportFilter>(() => {
    const today = currentDate();

    return {
      startDate: today,
      endDate: today,
      period: "daily",
      statuses: defaultStatuses,
      menuCategoryId: null,
      menuItemId: null
    };
  });
  const [categories, setCategories] = useState<ReportFilterCategoryOption[]>([]);
  const [salesReport, setSalesReport] = useState<Awaited<ReturnType<typeof getReportSales>> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sort, setSort] = useState<SortState>({ key: "period", direction: "asc" });
  const [popularItemSort, setPopularItemSort] = useState<SortState>({
    key: "rank",
    direction: "asc"
  });
  const [popularCombinationSort, setPopularCombinationSort] = useState<SortState>({
    key: "rank",
    direction: "asc"
  });

  useEffect(() => {
    let active = true;

    getReportFilterOptions()
      .then((response) => {
        if (active) {
          setCategories(toReportFilterOptions(response));
        }
      })
      .catch((caught) => {
        if (active) {
          setError(caught instanceof ApiClientError ? caught.message : "Unable to load report filters.");
        }
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    setLoading(true);
    setError(null);

    getReportSales(toReportSalesQuery(filter))
      .then((response) => {
        if (active) {
          setSalesReport(response);
        }
      })
      .catch((caught) => {
        if (active) {
          setSalesReport(null);
          setError(caught instanceof ApiClientError ? caught.message : "Unable to load sales report.");
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [filter]);

  const rows = useMemo<SalesSummaryRow[]>(() => {
    const reportRows =
      salesReport?.periods.map((period) => ({
        ...period,
        id: period.key
      })) ?? [];

    return sortRows(reportRows, sort);
  }, [salesReport, sort]);

  const popularItemRows = useMemo<PopularItemRow[]>(() => {
    const reportRows =
      salesReport?.popularItems.map((item) => ({
        ...item,
        id: `${item.rank}-${item.sourceMenuItemId}-${item.itemName}`
      })) ?? [];

    return sortPopularItemRows(reportRows, popularItemSort);
  }, [popularItemSort, salesReport]);

  const popularCombinationRows = useMemo<PopularCombinationRow[]>(() => {
    const reportRows =
      salesReport?.popularCombinations.map((combination) => ({
        ...combination,
        id: `${combination.rank}-${combination.combinationKey}`
      })) ?? [];

    return sortPopularCombinationRows(reportRows, popularCombinationSort);
  }, [popularCombinationSort, salesReport]);

  return (
    <section className="report-dashboard-layout" aria-label="Reports">
      <header className="counter-header">
        <div>
          <h2>Reports</h2>
          <p>Review daily, weekly, and monthly sales from completed and picked-up orders</p>
        </div>
      </header>

      <ReportFilters value={filter} categories={categories} onChange={setFilter} />

      {error ? <p className="form-error">{error}</p> : null}
      {loading ? <p className="empty-state">Loading sales report.</p> : null}

      {salesReport ? (
        <>
          {salesReport.overall.orderCount === 0 ? (
            <p className="empty-state">No sales match those filters.</p>
          ) : null}

          <ReportMetricGrid
            metrics={[
              { label: "Total sales", value: `$${salesReport.overall.totalSales}` },
              { label: "Order count", value: `${salesReport.overall.orderCount} orders` },
              { label: "Average order value", value: `$${salesReport.overall.averageOrderValue}` },
              {
                label: "Top item",
                value: salesReport.overall.topSellingItemName ?? "None",
                hint:
                  salesReport.overall.topSellingItemQuantity === null
                    ? undefined
                    : `${salesReport.overall.topSellingItemQuantity} sold`
              }
            ]}
          />

          <section className="report-section" aria-label="Sales summary">
            <div>
              <h3>Sales summary</h3>
              <p>
                {salesReport.filters.startDate} to {salesReport.filters.endDate}, grouped by{" "}
                {salesReport.filters.period}
              </p>
            </div>

            <ReportChart
              ariaLabel="Sales by period chart"
              bars={salesReport.periods.map((period) => ({
                label: period.label,
                value: Number(period.totalSales)
              }))}
            />

            <SortableReportTable
              ariaLabel="Sales summary table"
              columns={[
                {
                  key: "period",
                  header: "Period",
                  sortable: true,
                  render: (row) => (
                    <>
                      {row.label}
                      {row.partial ? <small className="report-cell-hint"> Partial</small> : null}
                    </>
                  )
                },
                {
                  key: "totalSales",
                  header: "Total sales",
                  sortable: true,
                  render: (row) => `$${row.totalSales}`
                },
                {
                  key: "orderCount",
                  header: "Orders",
                  sortable: true,
                  render: (row) => row.orderCount
                },
                {
                  key: "averageOrderValue",
                  header: "Average order value",
                  sortable: true,
                  render: (row) => `$${row.averageOrderValue}`
                },
                {
                  key: "topSellingItemName",
                  header: "Top item",
                  sortable: true,
                  render: (row) => row.topSellingItemName ?? "None"
                }
              ]}
              rows={rows}
              sort={sort}
              onSortChange={setSort}
            />
          </section>

          <section className="report-section" aria-label="Popular items">
            <div>
              <h3>Popular items</h3>
              <p>Top menu items ranked by quantity sold for the active filters</p>
            </div>

            <ReportChart
              ariaLabel="Popular items chart"
              bars={salesReport.popularItems.map((item) => ({
                label: item.itemName,
                value: item.quantitySold
              }))}
            />

            <SortableReportTable
              ariaLabel="Popular items table"
              columns={[
                {
                  key: "rank",
                  header: "Rank",
                  sortable: true,
                  render: (row) => <span className="report-rank">#{row.rank}</span>
                },
                {
                  key: "itemName",
                  header: "Item",
                  sortable: true,
                  render: (row) => row.itemName
                },
                {
                  key: "categoryName",
                  header: "Category",
                  sortable: true,
                  render: (row) => row.categoryName ?? "Uncategorized"
                },
                {
                  key: "quantitySold",
                  header: "Quantity sold",
                  sortable: true,
                  render: (row) => row.quantitySold
                },
                {
                  key: "orderCount",
                  header: "Orders",
                  sortable: true,
                  render: (row) => row.orderCount
                },
                {
                  key: "salesAmount",
                  header: "Sales amount",
                  sortable: true,
                  render: (row) => `$${row.salesAmount}`
                }
              ]}
              rows={popularItemRows}
              sort={popularItemSort}
              onSortChange={setPopularItemSort}
            />
          </section>

          <section className="report-section" aria-label="Popular combinations">
            <div>
              <h3>Popular combinations</h3>
              <p>Repeated order combinations ranked by frequency for the active filters</p>
            </div>

            <ReportChart
              ariaLabel="Popular combinations chart"
              bars={salesReport.popularCombinations.map((combination) => ({
                label: combination.combinationLabel,
                value: combination.orderFrequency
              }))}
            />

            <SortableReportTable
              ariaLabel="Popular combinations table"
              columns={[
                {
                  key: "rank",
                  header: "Rank",
                  sortable: true,
                  render: (row) => <span className="report-rank">#{row.rank}</span>
                },
                {
                  key: "combinationLabel",
                  header: "Combination",
                  sortable: true,
                  render: (row) => row.combinationLabel
                },
                {
                  key: "orderFrequency",
                  header: "Frequency",
                  sortable: true,
                  render: (row) => row.orderFrequency
                },
                {
                  key: "itemCount",
                  header: "Items",
                  sortable: true,
                  render: (row) => row.itemCount
                },
                {
                  key: "salesAmount",
                  header: "Sales amount",
                  sortable: true,
                  render: (row) => `$${row.salesAmount}`
                }
              ]}
              rows={popularCombinationRows}
              sort={popularCombinationSort}
              onSortChange={setPopularCombinationSort}
            />
          </section>
        </>
      ) : null}
    </section>
  );
}

function toReportFilterOptions(response: MenuCategoriesResponse): ReportFilterCategoryOption[] {
  return response.categories.map((category) => ({
    id: category.id,
    name: category.name,
    items: category.menuItems.map((item) => ({
      id: item.id,
      name: item.name
    }))
  }));
}

function toReportSalesQuery(filter: ReportFilter) {
  return {
    startDate: filter.startDate,
    endDate: filter.endDate,
    period: filter.period,
    statuses: filter.statuses,
    ...(filter.menuCategoryId ? { menuCategoryId: filter.menuCategoryId } : {}),
    ...(filter.menuItemId ? { menuItemId: filter.menuItemId } : {})
  };
}

function sortRows(rows: SalesSummaryRow[], sort: SortState): SalesSummaryRow[] {
  const sortedRows = [...rows].sort((left, right) => {
    const direction = sort.direction === "asc" ? 1 : -1;

    return compareRowValue(left, right, sort.key) * direction;
  });

  return sortedRows;
}

function compareRowValue(left: SalesSummaryRow, right: SalesSummaryRow, key: string): number {
  if (key === "totalSales" || key === "averageOrderValue") {
    return Number(left[key]) - Number(right[key]);
  }

  if (key === "orderCount") {
    return left.orderCount - right.orderCount;
  }

  if (key === "topSellingItemName") {
    return (left.topSellingItemName ?? "").localeCompare(right.topSellingItemName ?? "");
  }

  return left.key.localeCompare(right.key);
}

function sortPopularItemRows(rows: PopularItemRow[], sort: SortState): PopularItemRow[] {
  return [...rows].sort((left, right) => {
    const direction = sort.direction === "asc" ? 1 : -1;

    return comparePopularItemValue(left, right, sort.key) * direction;
  });
}

function comparePopularItemValue(left: PopularItemRow, right: PopularItemRow, key: string): number {
  if (key === "rank" || key === "quantitySold" || key === "orderCount") {
    return Number(left[key]) - Number(right[key]);
  }

  if (key === "salesAmount") {
    return Number(left.salesAmount) - Number(right.salesAmount);
  }

  if (key === "categoryName") {
    return (left.categoryName ?? "").localeCompare(right.categoryName ?? "");
  }

  return left.itemName.localeCompare(right.itemName);
}

function sortPopularCombinationRows(
  rows: PopularCombinationRow[],
  sort: SortState
): PopularCombinationRow[] {
  return [...rows].sort((left, right) => {
    const direction = sort.direction === "asc" ? 1 : -1;

    return comparePopularCombinationValue(left, right, sort.key) * direction;
  });
}

function comparePopularCombinationValue(
  left: PopularCombinationRow,
  right: PopularCombinationRow,
  key: string
): number {
  if (key === "rank" || key === "orderFrequency" || key === "itemCount") {
    return Number(left[key]) - Number(right[key]);
  }

  if (key === "salesAmount") {
    return Number(left.salesAmount) - Number(right.salesAmount);
  }

  return left.combinationLabel.localeCompare(right.combinationLabel);
}

function currentDate(): string {
  return new Date().toISOString().slice(0, 10);
}
