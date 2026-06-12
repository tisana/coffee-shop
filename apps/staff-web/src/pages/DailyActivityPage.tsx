import { useEffect, useState, type FormEvent } from "react";
import { Search } from "lucide-react";

import type { OrderHistoryQuery } from "@coffee-shop/shared/contracts/api";
import type { Order, OrderStatus } from "@coffee-shop/shared/domain/types";

import { OrderHistoryList } from "../components/OrderHistoryList";
import { ApiClientError } from "../services/apiClient";
import { getOrderHistory } from "../services/historyApi";

const statusOptions: Array<{ value: OrderStatus; label: string }> = [
  { value: "created", label: "Created" },
  { value: "queued", label: "Waiting" },
  { value: "in_progress", label: "In progress" },
  { value: "completed", label: "Ready" },
  { value: "picked_up", label: "Picked up" },
  { value: "cancelled", label: "Cancelled" }
];

export function DailyActivityPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [dailyOrderNumber, setDailyOrderNumber] = useState("");
  const [status, setStatus] = useState("");
  const [pickupName, setPickupName] = useState("");
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void loadHistory({});
  }, []);

  async function loadHistory(query: OrderHistoryQuery) {
    setError(null);
    setSearching(true);

    try {
      const response = await getOrderHistory(query);
      setOrders(response.orders);
    } catch (caught) {
      setError(caught instanceof ApiClientError ? caught.message : "Unable to load daily activity.");
    } finally {
      setLoading(false);
      setSearching(false);
    }
  }

  function buildQuery(): OrderHistoryQuery {
    return {
      ...(dailyOrderNumber.trim()
        ? { dailyOrderNumber: Number(dailyOrderNumber.trim()) }
        : {}),
      ...(status ? { status: status as OrderStatus } : {}),
      ...(pickupName.trim() ? { pickupName: pickupName.trim() } : {})
    };
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void loadHistory(buildQuery());
  }

  return (
    <section className="daily-activity-layout" aria-label="Daily activity">
      <header className="counter-header">
        <div>
          <h2>Daily activity</h2>
          <p>Find current-day orders by number, status, or pickup name</p>
        </div>
      </header>

      <form className="history-filters" onSubmit={handleSubmit}>
        <label>
          Daily order number
          <input
            inputMode="numeric"
            min="1"
            type="number"
            value={dailyOrderNumber}
            onChange={(event) => setDailyOrderNumber(event.target.value)}
          />
        </label>
        <label>
          Status
          <select value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="">Any status</option>
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Pickup name
          <input value={pickupName} onChange={(event) => setPickupName(event.target.value)} />
        </label>
        <button type="submit" disabled={searching}>
          <Search size={18} aria-hidden="true" />
          {searching ? "Searching" : "Search history"}
        </button>
      </form>

      {error ? <p className="form-error">{error}</p> : null}
      {loading ? <p className="empty-state">Loading daily activity.</p> : <OrderHistoryList orders={orders} />}
    </section>
  );
}
