import { Megaphone } from "lucide-react";

import type { QueueOrder } from "@coffee-shop/shared/contracts/api";

import { PickupConfirmationButton } from "./PickupConfirmationButton";

interface PickupCalloutPanelProps {
  order: QueueOrder;
  confirming: boolean;
  onConfirmPickup: (orderId: string) => void;
}

export function PickupCalloutPanel({
  order,
  confirming,
  onConfirmPickup
}: PickupCalloutPanelProps) {
  const pickupName = order.pickupName ?? "Walk-up order";

  return (
    <article className="pickup-callout-panel">
      <div>
        <Megaphone size={22} aria-hidden="true" />
        <span>Call #{order.dailyOrderNumber} for pickup</span>
      </div>
      <p>{pickupName} is ready</p>
      <PickupConfirmationButton order={order} confirming={confirming} onConfirmPickup={onConfirmPickup} />
    </article>
  );
}
