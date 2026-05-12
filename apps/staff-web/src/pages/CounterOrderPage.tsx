import { useEffect, useMemo, useState } from "react";

import type {
  MenuCategory,
  MenuItem,
  Order,
  SelectedCustomization
} from "@coffee-shop/shared/domain/types";

import { CustomizationSelector } from "../components/CustomizationSelector";
import { type DraftBeverage, OrderSummary } from "../components/OrderSummary";
import { OrderCreatedBanner } from "../components/OrderCreatedBanner";
import { ApiClientError } from "../services/apiClient";
import { createCounterOrder, getOrderTakingMenu, submitOrderToQueue } from "../services/ordersApi";

export function CounterOrderPage() {
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [selectedItemId, setSelectedItemId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [selectedCustomizations, setSelectedCustomizations] = useState<SelectedCustomization[]>([]);
  const [specialInstructions, setSpecialInstructions] = useState("");
  const [pickupName, setPickupName] = useState("");
  const [beverages, setBeverages] = useState<DraftBeverage[]>([]);
  const [createdOrder, setCreatedOrder] = useState<Order | null>(null);
  const [loadingMenu, setLoadingMenu] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [queueing, setQueueing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    getOrderTakingMenu()
      .then((response) => {
        if (!active) {
          return;
        }

        setCategories(response.categories);
        const firstAvailableItem = response.categories
          .flatMap((category) => category.menuItems)
          .find((item) => item.available);
        setSelectedItemId(firstAvailableItem?.id ?? "");
      })
      .catch((caught) => {
        setError(caught instanceof ApiClientError ? caught.message : "Unable to load menu.");
      })
      .finally(() => {
        if (active) {
          setLoadingMenu(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const allMenuItems = useMemo(
    () => categories.flatMap((category) => category.menuItems),
    [categories]
  );
  const selectedItem = allMenuItems.find((item) => item.id === selectedItemId) ?? null;

  function selectItem(itemId: string) {
    setSelectedItemId(itemId);
    setSelectedCustomizations([]);
    setSpecialInstructions("");
    setQuantity(1);
  }

  function validateCurrentBeverage(item: MenuItem): string | null {
    for (const group of item.customizationGroups) {
      const count =
        selectedCustomizations.find((selection) => selection.customizationGroupId === group.id)
          ?.customizationChoiceIds.length ?? 0;

      if (group.required && count < group.minSelections) {
        return `${group.name} requires a selection.`;
      }

      if (count < group.minSelections || count > group.maxSelections) {
        return `${group.name} has an invalid number of selections.`;
      }
    }

    return null;
  }

  function addCurrentBeverage() {
    if (!selectedItem) {
      return;
    }

    const validationError = validateCurrentBeverage(selectedItem);

    if (validationError) {
      setError(validationError);
      return;
    }

    setBeverages((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        menuItem: selectedItem,
        quantity,
        selectedCustomizations,
        ...(specialInstructions.trim() ? { specialInstructions: specialInstructions.trim() } : {})
      }
    ]);
    setSelectedCustomizations([]);
    setSpecialInstructions("");
    setQuantity(1);
    setCreatedOrder(null);
    setError(null);
  }

  async function submitOrder() {
    setSubmitting(true);
    setError(null);

    try {
      const order = await createCounterOrder({
        ...(pickupName.trim() ? { pickupName: pickupName.trim() } : {}),
        beverages: beverages.map((beverage) => ({
          menuItemId: beverage.menuItem.id,
          quantity: beverage.quantity,
          selectedCustomizations: beverage.selectedCustomizations,
          ...(beverage.specialInstructions
            ? { specialInstructions: beverage.specialInstructions }
            : {})
        }))
      });
      setCreatedOrder(order);
      setBeverages([]);
    } catch (caught) {
      setError(caught instanceof ApiClientError ? caught.message : "Unable to create order.");
    } finally {
      setSubmitting(false);
    }
  }

  async function queueCreatedOrder() {
    if (!createdOrder) {
      return;
    }

    setQueueing(true);
    setError(null);

    try {
      setCreatedOrder(await submitOrderToQueue(createdOrder.id));
    } catch (caught) {
      setError(caught instanceof ApiClientError ? caught.message : "Unable to send order to queue.");
    } finally {
      setQueueing(false);
    }
  }

  return (
    <section className="counter-layout" aria-label="Counter order">
      <div className="order-entry">
        {createdOrder ? (
          <OrderCreatedBanner order={createdOrder} queueing={queueing} onQueue={queueCreatedOrder} />
        ) : null}

        {error ? <p className="form-error">{error}</p> : null}

        <label className="pickup-name">
          Pickup name
          <input
            placeholder="Optional"
            value={pickupName}
            onChange={(event) => setPickupName(event.target.value)}
          />
        </label>

        {loadingMenu ? (
          <p className="empty-state">Loading menu.</p>
        ) : (
          <div className="menu-board">
            {categories.map((category) => (
              <section key={category.id} className="menu-section">
                <h3>{category.name}</h3>
                <div className="menu-items">
                  {category.menuItems.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className={item.id === selectedItemId ? "selected-menu-item" : ""}
                      disabled={!item.available}
                      onClick={() => selectItem(item.id)}
                    >
                      <span>{item.name}</span>
                      <small>${item.price}</small>
                    </button>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}

        {selectedItem ? (
          <section className="beverage-editor">
            <div>
              <p className="eyebrow">Selected Beverage</p>
              <h3>{selectedItem.name}</h3>
            </div>

            <label>
              Quantity
              <input
                min={1}
                type="number"
                value={quantity}
                onChange={(event) => setQuantity(Math.max(1, Number(event.target.value)))}
              />
            </label>

            <CustomizationSelector
              groups={selectedItem.customizationGroups}
              selections={selectedCustomizations}
              onChange={setSelectedCustomizations}
            />

            <label>
              Special instructions
              <textarea
                rows={3}
                value={specialInstructions}
                onChange={(event) => setSpecialInstructions(event.target.value)}
              />
            </label>

            <button type="button" onClick={addCurrentBeverage}>
              Add beverage
            </button>
          </section>
        ) : null}
      </div>

      <OrderSummary
        beverages={beverages}
        submitting={submitting}
        onRemove={(id) => setBeverages((current) => current.filter((item) => item.id !== id))}
        onSubmit={submitOrder}
      />
    </section>
  );
}
