import { Coffee, ReceiptText } from "lucide-react";

import type { Order } from "@coffee-shop/shared/domain/types";

interface OrderHistoryListProps {
  orders: Order[];
}

const statusLabels: Record<Order["status"], string> = {
  created: "Created",
  queued: "Waiting",
  in_progress: "In progress",
  completed: "Ready",
  picked_up: "Picked up",
  cancelled: "Cancelled"
};

function formatReceivedTime(value: string): string {
  const [date, time = ""] = value.split("T");
  return `${date} ${time.slice(0, 5)} UTC`;
}

export function OrderHistoryList({ orders }: OrderHistoryListProps) {
  if (orders.length === 0) {
    return <p className="empty-state">No current-day orders match those filters.</p>;
  }

  return (
    <div className="history-results" aria-label="Order history results">
      {orders.map((order) => (
        <article key={order.id} className="history-order">
          <div className="history-order-topline">
            <div>
              <span className="daily-number">#{order.dailyOrderNumber}</span>
              <h3>{order.pickupName ?? "Walk-up order"}</h3>
            </div>
            <span className={`queue-status queue-status-${order.status}`}>
              {statusLabels[order.status]}
            </span>
          </div>

          <div className="history-order-meta">
            <span>
              <ReceiptText size={18} aria-hidden="true" />
              Received {formatReceivedTime(order.createdAt)}
            </span>
            <strong>${order.total}</strong>
          </div>

          <ul className="queue-beverage-list">
            {order.beverages.map((beverage) => (
              <li key={beverage.id}>
                <Coffee size={18} aria-hidden="true" />
                <div>
                  <strong>
                    {beverage.quantity}x {beverage.nameSnapshot}
                  </strong>
                  {beverage.selectedCustomizationsSnapshot.length > 0 ? (
                    <span>
                      {beverage.selectedCustomizationsSnapshot
                        .map(
                          (group) =>
                            `${group.groupName}: ${group.choices
                              .map((choice) => choice.choiceName)
                              .join(", ")}`
                        )
                        .join(" · ")}
                    </span>
                  ) : null}
                  {beverage.specialInstructions ? (
                    <span>Note: {beverage.specialInstructions}</span>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </article>
      ))}
    </div>
  );
}
