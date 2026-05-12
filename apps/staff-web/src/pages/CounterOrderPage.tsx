import { useEffect, useMemo, useState } from "react";
import { Minus, Plus } from "lucide-react";

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

const menuImages: Record<string, string> = {
  Americano:
    "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=320&q=80",
  Cappuccino:
    "https://images.unsplash.com/photo-1534778101976-62847782c213?auto=format&fit=crop&w=320&q=80",
  "Caramel Macchiato":
    "https://images.unsplash.com/photo-1461023058943-07fcbe16d735?auto=format&fit=crop&w=320&q=80",
  "Cold Brew":
    "https://images.unsplash.com/photo-1517701604599-bb29b565090c?auto=format&fit=crop&w=320&q=80",
  "Drip Coffee":
    "https://images.unsplash.com/photo-1497935586351-b67a49e012bf?auto=format&fit=crop&w=320&q=80",
  Espresso:
    "https://images.unsplash.com/photo-1510591509098-f4fdc6d0ff04?auto=format&fit=crop&w=320&q=80",
  "Flat White":
    "https://images.unsplash.com/photo-1572442388796-11668a67e53d?auto=format&fit=crop&w=320&q=80",
  Latte:
    "https://images.unsplash.com/photo-1570968915860-54d5c301fa9f?auto=format&fit=crop&w=320&q=80",
  Mocha:
    "https://images.unsplash.com/photo-1578314675249-a6910f80cc4e?auto=format&fit=crop&w=320&q=80",
  "Matcha Latte":
    "https://images.unsplash.com/photo-1515823662972-da6a2e4d3002?auto=format&fit=crop&w=320&q=80",
  "Hot Chocolate":
    "https://images.unsplash.com/photo-1517578239113-b03992dcdd25?auto=format&fit=crop&w=320&q=80",
  Croissant:
    "https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=320&q=80",
  "Blueberry Muffin":
    "https://images.unsplash.com/photo-1607958996333-41aef7caefaa?auto=format&fit=crop&w=320&q=80"
};

function getMenuImage(item: MenuItem): string {
  return (
    menuImages[item.name] ??
    "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=320&q=80"
  );
}

function getDefaultSelections(item: MenuItem): SelectedCustomization[] {
  return item.customizationGroups
    .filter((group) => group.required && group.minSelections > 0)
    .map((group) => {
      const choiceIds = group.choices
        .filter((choice) => choice.available && choice.active)
        .slice(0, group.minSelections)
        .map((choice) => choice.id);

      return choiceIds.length > 0
        ? {
            customizationGroupId: group.id,
            customizationChoiceIds: choiceIds
          }
        : null;
    })
    .filter((selection): selection is SelectedCustomization => Boolean(selection));
}

export function CounterOrderPage() {
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [activeCategoryId, setActiveCategoryId] = useState("all");
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
        if (firstAvailableItem) {
          setSelectedItemId(firstAvailableItem.id);
          setSelectedCustomizations(getDefaultSelections(firstAvailableItem));
        }
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
  const popularItems = allMenuItems.filter((item) => item.available).slice(0, 6);
  const visibleCategories =
    activeCategoryId === "all"
      ? categories
      : categories.filter((category) => category.id === activeCategoryId);

  function selectItem(itemId: string) {
    const item = allMenuItems.find((candidate) => candidate.id === itemId);

    if (!item) {
      return;
    }

    setSelectedItemId(item.id);
    setSelectedCustomizations(getDefaultSelections(item));
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
        <header className="counter-header">
          <div>
            <h2>Counter order</h2>
            <p>Add items to the order</p>
          </div>
        </header>

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
          <>
            <section className="popular-section" aria-labelledby="popular-heading">
              <h3 id="popular-heading">Popular</h3>
              <div className="popular-grid">
                {popularItems.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={item.id === selectedItemId ? "popular-card selected-menu-item" : "popular-card"}
                    disabled={!item.available}
                    onClick={() => selectItem(item.id)}
                  >
                    <img src={getMenuImage(item)} alt="" loading="lazy" />
                    <span>
                      <strong>{item.name}</strong>
                      <small>${item.price}</small>
                    </span>
                  </button>
                ))}
              </div>
            </section>

            <section className="menu-board" aria-labelledby="categories-heading">
              <h3 id="categories-heading">All categories</h3>
              <div className="category-filter" aria-label="Menu categories">
                <button
                  type="button"
                  aria-pressed={activeCategoryId === "all"}
                  onClick={() => setActiveCategoryId("all")}
                >
                  All
                </button>
                {categories.map((category) => (
                  <button
                    key={category.id}
                    type="button"
                    aria-pressed={activeCategoryId === category.id}
                    onClick={() => setActiveCategoryId(category.id)}
                  >
                    {category.name}
                  </button>
                ))}
              </div>

              <div className="menu-list">
                {visibleCategories.flatMap((category) =>
                  category.menuItems.map((item) => (
                    <article
                      key={item.id}
                      className={item.id === selectedItemId ? "menu-row selected-menu-item" : "menu-row"}
                    >
                      <img src={getMenuImage(item)} alt="" loading="lazy" />
                      <div>
                        <strong>{item.name}</strong>
                        <span>${item.price}</span>
                      </div>
                      <button type="button" disabled={!item.available} onClick={() => selectItem(item.id)}>
                        Add
                      </button>
                    </article>
                  ))
                )}
              </div>
            </section>
          </>
        )}

        {selectedItem ? (
          <section className="beverage-editor">
            <div>
              <p className="eyebrow">Customize beverage</p>
              <h3>{selectedItem.name}</h3>
            </div>

            <div className="quantity-stepper" aria-label="Quantity">
              <span>Quantity</span>
              <div>
                <button
                  type="button"
                  aria-label="Decrease quantity"
                  onClick={() => setQuantity((current) => Math.max(1, current - 1))}
                >
                  <Minus size={16} />
                </button>
                <strong>{quantity}</strong>
                <button
                  type="button"
                  aria-label="Increase quantity"
                  onClick={() => setQuantity((current) => current + 1)}
                >
                  <Plus size={16} />
                </button>
              </div>
            </div>

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

            <button type="button" className="add-customized-button" onClick={addCurrentBeverage}>
              Customize & add
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
