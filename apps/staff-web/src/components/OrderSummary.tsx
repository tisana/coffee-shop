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

export function getDraftOrderTotal(beverages: DraftBeverage[]): string {
  return beverages
    .reduce((sum, beverage) => sum + getBeverageUnitPrice(beverage) * beverage.quantity, 0)
    .toFixed(2);
}

export function OrderSummary({ beverages, submitting, onRemove, onSubmit }: OrderSummaryProps) {
  return (
    <aside className="summary-panel" aria-label="Order summary">
      <div>
        <p className="eyebrow">Current Order</p>
        <h3>{beverages.length} beverage{beverages.length === 1 ? "" : "s"}</h3>
      </div>

      {beverages.length === 0 ? (
        <p className="empty-state">Add beverages from the menu.</p>
      ) : (
        <ul className="summary-list">
          {beverages.map((beverage) => (
            <li key={beverage.id}>
              <div>
                <strong>
                  {beverage.quantity}x {beverage.menuItem.name}
                </strong>
                <span>${(getBeverageUnitPrice(beverage) * beverage.quantity).toFixed(2)}</span>
              </div>
              {beverage.specialInstructions ? <p>{beverage.specialInstructions}</p> : null}
              <button type="button" onClick={() => onRemove(beverage.id)}>
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="summary-total">
        <span>Total</span>
        <strong>${getDraftOrderTotal(beverages)}</strong>
      </div>

      <button type="button" disabled={submitting || beverages.length === 0} onClick={onSubmit}>
        {submitting ? "Creating order" : "Create counter order"}
      </button>
    </aside>
  );
}
