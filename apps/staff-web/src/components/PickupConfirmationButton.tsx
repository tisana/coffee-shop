import { Handshake } from "lucide-react";

import type { QueueOrder } from "@coffee-shop/shared/contracts/api";

interface PickupConfirmationButtonProps {
  order: QueueOrder;
  confirming: boolean;
  onConfirmPickup: (orderId: string) => void;
}

export function PickupConfirmationButton({
  order,
  confirming,
  onConfirmPickup
}: PickupConfirmationButtonProps) {
  return (
    <button type="button" disabled={confirming} onClick={() => onConfirmPickup(order.id)}>
      <Handshake size={18} aria-hidden="true" />
      {confirming ? "Confirming pickup" : `Confirm pickup for order #${order.dailyOrderNumber}`}
    </button>
  );
}
