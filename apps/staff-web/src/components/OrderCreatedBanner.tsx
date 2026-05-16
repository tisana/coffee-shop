import type { Order } from "@coffee-shop/shared/domain/types";

interface OrderCreatedBannerProps {
  order: Order;
  queueing: boolean;
  onQueue: () => void;
}

export function OrderCreatedBanner({ order, queueing, onQueue }: OrderCreatedBannerProps) {
  const isQueued = order.status === "queued";

  return (
    <section className="order-created-banner" aria-live="polite">
      <div>
        <p className="eyebrow">{isQueued ? "Order queued" : "Order created"}</p>
        <h3>#{order.dailyOrderNumber}</h3>
        <p>
          {isQueued
            ? order.pickupName
              ? `${order.pickupName} is in the brew queue.`
              : "Order is in the brew queue."
            : order.pickupName
              ? `${order.pickupName} still needs to be sent to the brew queue.`
              : "Order still needs to be sent to the brew queue."}
        </p>
      </div>
      {isQueued ? (
        <span className="queued-status">Queued</span>
      ) : (
        <button type="button" disabled={queueing} onClick={onQueue}>
          {queueing ? "Sending to queue" : "Retry queue"}
        </button>
      )}
    </section>
  );
}
