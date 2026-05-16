import { CircleCheck, Coffee, UserRound } from "lucide-react";

import type { QueueOrder } from "@coffee-shop/shared/contracts/api";
import type { StaffUser } from "@coffee-shop/shared/domain/types";

interface QueueOrderCardProps {
  order: QueueOrder;
  currentStaff: StaffUser;
  claiming: boolean;
  onClaim: (orderId: string) => void;
}

function statusLabel(order: QueueOrder): string {
  if (order.status === "queued") {
    return "Waiting";
  }

  if (order.status === "in_progress") {
    return "In progress";
  }

  return "Ready for pickup";
}

function assignedLabel(order: QueueOrder, currentStaff: StaffUser): string {
  if (!order.assignedBaristaId) {
    return "Unassigned";
  }

  if (order.assignedBaristaDisplayName) {
    return `Assigned to ${order.assignedBaristaDisplayName}`;
  }

  if (order.assignedBaristaId === currentStaff.id) {
    return `Assigned to ${currentStaff.displayName}`;
  }

  return `Assigned staff ${order.assignedBaristaId.slice(0, 8)}`;
}

export function QueueOrderCard({ order, currentStaff, claiming, onClaim }: QueueOrderCardProps) {
  const claimLabel = `Claim order #${order.dailyOrderNumber}`;

  return (
    <article className="queue-order-card">
      <div className="queue-order-topline">
        <div>
          <span className="daily-number">#{order.dailyOrderNumber}</span>
          <h3>{order.pickupName ?? "Walk-up order"}</h3>
        </div>
        <span className={`queue-status queue-status-${order.status}`}>{statusLabel(order)}</span>
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
              {beverage.specialInstructions ? <span>Note: {beverage.specialInstructions}</span> : null}
            </div>
          </li>
        ))}
      </ul>

      <div className="queue-card-actions">
        <span>
          {order.assignedBaristaId ? (
            <CircleCheck size={18} aria-hidden="true" />
          ) : (
            <UserRound size={18} aria-hidden="true" />
          )}
          {assignedLabel(order, currentStaff)}
        </span>
        {order.status === "queued" ? (
          <button type="button" disabled={claiming} onClick={() => onClaim(order.id)}>
            {claiming ? "Claiming" : claimLabel}
          </button>
        ) : null}
      </div>
    </article>
  );
}
