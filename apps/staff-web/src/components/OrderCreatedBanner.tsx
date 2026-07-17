import type { OrderWithLoyalty } from "@coffee-shop/shared/domain/types";

interface OrderCreatedBannerProps {
  order: OrderWithLoyalty;
  queueing: boolean;
  onQueue: () => void;
  onCancelReward: (rewardId: string) => void;
}

export function OrderCreatedBanner({ order, queueing, onQueue, onCancelReward }: OrderCreatedBannerProps) {
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
      {order.loyalty?.rewards.length ? <div className="loyalty-order-totals"><span>{order.loyalty.rewards.map((reward) => reward.name).join(", ")}</span><strong>${order.payableTotal}</strong>{order.loyalty.rewards.filter((reward) => reward.status === "active").map((reward) => <button key={reward.id} type="button" onClick={() => onCancelReward(reward.id)}>Cancel {reward.name}</button>)}</div> : null}
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
