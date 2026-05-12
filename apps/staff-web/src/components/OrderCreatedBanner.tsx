import type { Order } from "@coffee-shop/shared/domain/types";

interface OrderCreatedBannerProps {
  order: Order;
  queueing: boolean;
  onQueue: () => void;
}

export function OrderCreatedBanner({ order, queueing, onQueue }: OrderCreatedBannerProps) {
  return (
    <section className="order-created-banner" aria-live="polite">
      <div>
        <p className="eyebrow">Order Created</p>
        <h3>#{order.dailyOrderNumber}</h3>
        <p>{order.pickupName ? `${order.pickupName} is ready for queueing.` : "Ready for queueing."}</p>
      </div>
      <button type="button" disabled={queueing || order.status !== "created"} onClick={onQueue}>
        {order.status === "queued" ? "Queued" : queueing ? "Sending to queue" : "Send to brew queue"}
      </button>
    </section>
  );
}
