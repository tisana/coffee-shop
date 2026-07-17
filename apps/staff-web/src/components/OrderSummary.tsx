import { ShoppingBag, Trash2 } from "lucide-react";

import type { MenuItem, SelectedCustomization } from "@coffee-shop/shared/domain/types";

export interface DraftBeverage {
  id: string;
  menuItem: MenuItem;
  quantity: number;
  selectedCustomizations: SelectedCustomization[];
  specialInstructions?: string;
}

interface OrderSummaryProps {
  beverages: DraftBeverage[];
  submitting: boolean;
  rewardPointsCost?: number;
  rewardCoverage?: string;
  onRemove: (id: string) => void;
  onSubmit: () => void;
}

function getBeverageUnitPrice(beverage: DraftBeverage): number {
  const choiceIds = new Set(
    beverage.selectedCustomizations.flatMap((selection) => selection.customizationChoiceIds)
  );
  const adjustments = beverage.menuItem.customizationGroups
    .flatMap((group) => group.choices)
    .filter((choice) => choiceIds.has(choice.id))
    .reduce((sum, choice) => sum + Number(choice.priceAdjustment), 0);

  return Number(beverage.menuItem.price) + adjustments;
}

function getCustomizationReviewLines(beverage: DraftBeverage): string[] {
  return beverage.selectedCustomizations
    .map((selection) => {
      const group = beverage.menuItem.customizationGroups.find(
        (candidate) => candidate.id === selection.customizationGroupId
      );

      if (!group) {
        return null;
      }

      const choiceNames = group.choices
        .filter((choice) => selection.customizationChoiceIds.includes(choice.id))
        .map((choice) => choice.name);

      if (choiceNames.length === 0) {
        return null;
      }

      return `${group.name}: ${choiceNames.join(", ")}`;
    })
    .filter((line): line is string => Boolean(line));
}

export function getDraftOrderTotal(beverages: DraftBeverage[]): string {
  return beverages
    .reduce((sum, beverage) => sum + getBeverageUnitPrice(beverage) * beverage.quantity, 0)
    .toFixed(2);
}

export function OrderSummary({ beverages, submitting, rewardPointsCost = 0, rewardCoverage = "0.00", onRemove, onSubmit }: OrderSummaryProps) {
  return (
    <aside className="summary-panel" aria-label="Order summary">
      <div className="summary-heading">
        <h3>Current Order</h3>
        <ShoppingBag size={22} strokeWidth={1.7} aria-hidden="true" />
      </div>

      {beverages.length === 0 ? (
        <p className="empty-state">Add beverages from the menu.</p>
      ) : (
        <ul className="summary-list">
          {beverages.map((beverage) => {
            const reviewLines = getCustomizationReviewLines(beverage);

            return (
              <li key={beverage.id}>
                <div>
                  <strong>
                    {beverage.quantity}x {beverage.menuItem.name}
                  </strong>
                  <span>${(getBeverageUnitPrice(beverage) * beverage.quantity).toFixed(2)}</span>
                </div>
                {reviewLines.length > 0 || beverage.specialInstructions ? (
                  <div className="summary-item-details">
                    {reviewLines.map((line) => (
                      <span key={line}>{line}</span>
                    ))}
                    {beverage.specialInstructions ? (
                      <span>Note: {beverage.specialInstructions}</span>
                    ) : null}
                  </div>
                ) : null}
                <button type="button" onClick={() => onRemove(beverage.id)}>
                  <Trash2 size={16} aria-hidden="true" />
                  Remove
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <div className="summary-total">
        <span>Gross total</span>
        <strong>${getDraftOrderTotal(beverages)}</strong>
      </div>
      {Number(rewardCoverage) > 0 ? <div className="summary-total loyalty-order-summary"><span>Reward coverage ({rewardPointsCost} pts)</span><strong>-${rewardCoverage}</strong><span>Payable</span><strong>${Math.max(0, Number(getDraftOrderTotal(beverages)) - Number(rewardCoverage)).toFixed(2)}</strong></div> : null}

      <button type="button" disabled={submitting || beverages.length === 0} onClick={onSubmit}>
        {submitting ? "Creating and queueing" : "Create and queue order"}
      </button>
    </aside>
  );
}
