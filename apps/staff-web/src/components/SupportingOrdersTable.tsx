import type { ReportOrderDetail } from "@coffee-shop/shared/contracts/api";

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

export function SupportingOrdersTable({ orders, sort, onSortChange }: SupportingOrdersTableProps) {
  const rows = sortSupportingOrderRows(
    orders.map((order) => ({
      ...order,
      id: order.orderId,
      itemNames: order.items.map((item) => item.name).join(", ")
    })),
    sort
  );

  return (
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
  );
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
