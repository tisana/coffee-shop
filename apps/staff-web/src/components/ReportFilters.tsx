import type { ReportFilter, ReportPeriodType } from "@coffee-shop/shared/contracts/api";
import type { OrderStatus } from "@coffee-shop/shared/domain/types";

export interface ReportFilterCategoryOption {
  id: string;
  name: string;
  items: Array<{
    id: string;
    name: string;
  }>;
}

interface ReportFiltersProps {
  value: ReportFilter;
  categories: ReportFilterCategoryOption[];
  onChange: (value: ReportFilter) => void;
}

const statusOptions: Array<{ value: OrderStatus; label: string }> = [
  { value: "completed", label: "Completed" },
  { value: "picked_up", label: "Picked up" },
  { value: "cancelled", label: "Cancelled" },
  { value: "created", label: "Created" },
  { value: "queued", label: "Queued" },
  { value: "in_progress", label: "In progress" }
];

export function ReportFilters({ value, categories, onChange }: ReportFiltersProps) {
  const selectedCategory = categories.find((category) => category.id === value.menuCategoryId);
  const itemOptions = selectedCategory?.items ?? categories.flatMap((category) => category.items);

  return (
    <form className="report-filters" aria-label="Report filters">
      <label>
        Period
        <select
          value={value.period}
          onChange={(event) =>
            onChange({ ...value, period: event.target.value as ReportPeriodType })
          }
        >
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
          <option value="monthly">Monthly</option>
        </select>
      </label>

      <label>
        Start date
        <input
          type="date"
          value={value.startDate}
          onChange={(event) => onChange({ ...value, startDate: event.target.value })}
        />
      </label>

      <label>
        End date
        <input
          type="date"
          value={value.endDate}
          onChange={(event) => onChange({ ...value, endDate: event.target.value })}
        />
      </label>

      <label>
        Status
        <select
          multiple
          value={value.statuses}
          onChange={(event) =>
            onChange({
              ...value,
              statuses: Array.from(event.target.selectedOptions, (option) => option.value as OrderStatus)
            })
          }
        >
          {statusOptions.map((status) => (
            <option key={status.value} value={status.value}>
              {status.label}
            </option>
          ))}
        </select>
      </label>

      <label>
        Category
        <select
          value={value.menuCategoryId ?? ""}
          onChange={(event) =>
            onChange({
              ...value,
              menuCategoryId: event.target.value || null,
              menuItemId: null
            })
          }
        >
          <option value="">All categories</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </label>

      <label>
        Item
        <select
          value={value.menuItemId ?? ""}
          onChange={(event) =>
            onChange({
              ...value,
              menuItemId: event.target.value || null
            })
          }
        >
          <option value="">All items</option>
          {itemOptions.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </label>
    </form>
  );
}
