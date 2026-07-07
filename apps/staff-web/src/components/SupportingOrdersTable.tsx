import { useMemo, useState } from "react";

import type { ReportOrderDetail } from "@coffee-shop/shared/contracts/api";
import type { OrderStatus } from "@coffee-shop/shared/domain/types";

import { SortableReportTable, type SortState } from "./SortableReportTable";

interface SupportingOrderRow extends ReportOrderDetail {
  id: string;
  itemNames: string;
}

interface SupportingOrdersTableProps {
  orders: ReportOrderDetail[];
  sort: SortState;
  onSortChange: (sort: SortState) => void;
}

interface SupportingOrderFilters {
  businessDate: string;
  dailyOrderNumber: string;
  status: "" | OrderStatus;
  itemText: string;
  capturedOrderTotal: string;
  reportableTotal: string;
}

const emptyFilters: SupportingOrderFilters = {
  businessDate: "",
  dailyOrderNumber: "",
  status: "",
  itemText: "",
  capturedOrderTotal: "",
  reportableTotal: ""
};

const statusOptions: Array<{ value: OrderStatus; label: string }> = [
  { value: "completed", label: "Completed" },
  { value: "picked_up", label: "Picked up" },
  { value: "cancelled", label: "Cancelled" },
  { value: "created", label: "Created" },
  { value: "queued", label: "Queued" },
  { value: "in_progress", label: "In progress" }
];

export function SupportingOrdersTable({ orders, sort, onSortChange }: SupportingOrdersTableProps) {
  const [filters, setFilters] = useState<SupportingOrderFilters>(emptyFilters);
  const rows = useMemo(
    () =>
      sortSupportingOrderRows(
        filterSupportingOrderRows(
          orders.map((order) => ({
            ...order,
            id: order.orderId,
            itemNames: order.items.map((item) => item.name).join(", ")
          })),
          filters
        ),
        sort
      ),
    [filters, orders, sort]
  );

  return (
    <>
      <form className="supporting-order-filters" aria-label="Supporting order filters">
        <label>
          Filter business date
          <input
            type="date"
            value={filters.businessDate}
            onChange={(event) =>
              setFilters((current) => ({ ...current, businessDate: event.target.value }))
            }
          />
        </label>

        <label>
          Filter order number
          <input
            inputMode="numeric"
            value={filters.dailyOrderNumber}
            onChange={(event) =>
              setFilters((current) => ({ ...current, dailyOrderNumber: event.target.value }))
            }
          />
        </label>

        <label>
          Filter status
          <select
            value={filters.status}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                status: event.target.value as SupportingOrderFilters["status"]
              }))
            }
          >
            <option value="">All statuses</option>
            {statusOptions.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </select>
        </label>

        <label>
          Filter items
          <input
            type="search"
            value={filters.itemText}
            onChange={(event) =>
              setFilters((current) => ({ ...current, itemText: event.target.value }))
            }
          />
        </label>

        <label>
          Filter captured total
          <input
            inputMode="decimal"
            value={filters.capturedOrderTotal}
            onChange={(event) =>
              setFilters((current) => ({ ...current, capturedOrderTotal: event.target.value }))
            }
          />
        </label>

        <label>
          Filter reportable sales
          <input
            inputMode="decimal"
            value={filters.reportableTotal}
            onChange={(event) =>
              setFilters((current) => ({ ...current, reportableTotal: event.target.value }))
            }
          />
        </label>
      </form>

      <SortableReportTable
        ariaLabel="Supporting orders table"
        columns={[
          {
            key: "businessDate",
            header: "Business date",
            sortable: true,
            render: (row) => row.businessDate
          },
          {
            key: "dailyOrderNumber",
            header: "Order",
            sortable: true,
            render: (row) => `#${row.dailyOrderNumber}`
          },
          {
            key: "status",
            header: "Status",
            sortable: true,
            render: (row) => row.status.replace("_", " ")
          },
          {
            key: "itemNames",
            header: "Items",
            sortable: true,
            render: (row) => row.itemNames
          },
          {
            key: "capturedOrderTotal",
            header: "Captured total",
            sortable: true,
            render: (row) => `$${row.capturedOrderTotal}`
          },
          {
            key: "reportableTotal",
            header: "Reportable sales",
            sortable: true,
            render: (row) => `$${row.reportableTotal}`
          }
        ]}
        rows={rows}
        sort={sort}
        onSortChange={onSortChange}
      />
    </>
  );
}

function filterSupportingOrderRows(
  rows: SupportingOrderRow[],
  filters: SupportingOrderFilters
): SupportingOrderRow[] {
  const orderNumber = filters.dailyOrderNumber.trim();
  const itemText = filters.itemText.trim().toLowerCase();
  const capturedTotal = filters.capturedOrderTotal.trim();
  const reportableTotal = filters.reportableTotal.trim();

  return rows.filter((row) => {
    if (filters.businessDate && row.businessDate !== filters.businessDate) {
      return false;
    }

    if (orderNumber && !String(row.dailyOrderNumber).includes(orderNumber)) {
      return false;
    }

    if (filters.status && row.status !== filters.status) {
      return false;
    }

    if (itemText && !row.itemNames.toLowerCase().includes(itemText)) {
      return false;
    }

    if (capturedTotal && !row.capturedOrderTotal.includes(capturedTotal)) {
      return false;
    }

    if (reportableTotal && !row.reportableTotal.includes(reportableTotal)) {
      return false;
    }

    return true;
  });
}

function sortSupportingOrderRows(rows: SupportingOrderRow[], sort: SortState): SupportingOrderRow[] {
  return [...rows].sort((left, right) => {
    const direction = sort.direction === "asc" ? 1 : -1;

    return compareSupportingOrderValue(left, right, sort.key) * direction;
  });
}

function compareSupportingOrderValue(
  left: SupportingOrderRow,
  right: SupportingOrderRow,
  key: string
): number {
  if (key === "dailyOrderNumber") {
    return left.dailyOrderNumber - right.dailyOrderNumber;
  }

  if (key === "capturedOrderTotal" || key === "reportableTotal") {
    return Number(left[key]) - Number(right[key]);
  }

  if (key === "status") {
    return left.status.localeCompare(right.status);
  }

  if (key === "itemNames") {
    return left.itemNames.localeCompare(right.itemNames);
  }

  return left.businessDate.localeCompare(right.businessDate);
}
