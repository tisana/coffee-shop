import { Ban, Check } from "lucide-react";

import type { OrderBeverage } from "@coffee-shop/shared/domain/types";

interface BeverageStatusControlsProps {
  beverage: OrderBeverage;
  disabled: boolean;
  onCancel: () => void;
  onComplete: () => void;
}

function beverageStatusLabel(beverage: OrderBeverage): string {
  if (beverage.status === "completed") {
    return "Completed";
  }

  if (beverage.status === "cancelled") {
    return "Cancelled";
  }

  return "Pending";
}

export function BeverageStatusControls({
  beverage,
  disabled,
  onCancel,
  onComplete
}: BeverageStatusControlsProps) {
  const completeLabel = `Complete ${beverage.nameSnapshot}`;
  const cancelLabel = `Cancel ${beverage.nameSnapshot}`;
  const isPending = beverage.status === "pending";

  return (
    <div className="beverage-status-controls">
      <span className={`beverage-status beverage-status-${beverage.status}`}>
        {beverageStatusLabel(beverage)}
      </span>
      {isPending ? (
        <div>
          <button type="button" disabled={disabled} onClick={onComplete}>
            <Check size={17} aria-hidden="true" />
            {completeLabel}
          </button>
          <button type="button" className="secondary-danger-button" disabled={disabled} onClick={onCancel}>
            <Ban size={17} aria-hidden="true" />
            {cancelLabel}
          </button>
        </div>
      ) : null}
    </div>
  );
}
