import { Pencil, Plus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import type { MenuCategory, MenuItem } from "@coffee-shop/shared/domain/types";
import type { MenuItemInput, MenuItemResponse } from "@coffee-shop/shared/contracts/api";

import { type CustomizationTemplate, MenuItemEditor } from "../components/MenuItemEditor";
import { ApiClientError } from "../services/apiClient";
import {
  createMenuItem,
  deleteMenuItem,
  getMenuMaintenanceCatalog,
  updateMenuItem
} from "../services/menuApi";

const NEW_ITEM_ID = "__new_menu_item__";

function replaceMenuItem(categories: MenuCategory[], updatedItem: MenuItemResponse): MenuCategory[] {
  return categories.map((category) => ({
    ...category,
    menuItems:
      category.id === updatedItem.categoryId
        ? [
            ...category.menuItems.filter((item) => item.id !== updatedItem.id),
            updatedItem
          ].sort((left, right) => left.displayOrder - right.displayOrder || left.name.localeCompare(right.name))
        : category.menuItems.filter((item) => item.id !== updatedItem.id)
  }));
}

function addMenuItemToCategory(
  categories: MenuCategory[],
  categoryId: string,
  item: MenuItemResponse
): MenuCategory[] {
  return categories.map((category) =>
    category.id === categoryId
      ? { ...category, menuItems: [...category.menuItems, item] }
      : category
  );
}

function removeMenuItem(categories: MenuCategory[], itemId: string): MenuCategory[] {
  return categories.map((category) => ({
    ...category,
    menuItems: category.menuItems.filter((item) => item.id !== itemId)
  }));
}

function createDraftItem(categories: MenuCategory[]): MenuItem | null {
  const firstCategory = categories[0];

  if (!firstCategory) {
    return null;
  }

  return {
    id: NEW_ITEM_ID,
    categoryId: firstCategory.id,
    name: "",
    description: "",
    imageUrl: null,
    price: "0.00",
    available: true,
    active: true,
    displayOrder: firstCategory.menuItems.length + 1,
    customizationGroups: []
  };
}

function buildCustomizationTemplates(items: MenuItem[]): CustomizationTemplate[] {
  const templates: CustomizationTemplate[] = [];
  const signatures = new Set<string>();

  for (const item of items) {
    if (item.customizationGroups.length === 0) {
      continue;
    }

    const groups = item.customizationGroups.map((group) => ({
      name: group.name,
      required: group.required,
      minSelections: group.minSelections,
      maxSelections: group.maxSelections,
      displayOrder: group.displayOrder,
      active: group.active,
      choices: group.choices.map((choice) => ({
        name: choice.name,
        priceAdjustment: choice.priceAdjustment,
        available: choice.available,
        displayOrder: choice.displayOrder,
        active: choice.active
      }))
    }));
    const signature = JSON.stringify(groups);

    if (signatures.has(signature)) {
      continue;
    }

    signatures.add(signature);
    templates.push({
      id: `template:${item.id}`,
      label: `${item.name} customizations`,
      groups
    });
  }

  return templates;
}

export function MenuMaintenancePage() {
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [selectedItemId, setSelectedItemId] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingItemId, setSavingItemId] = useState<string | null>(null);
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null);
  const [draftItem, setDraftItem] = useState<MenuItem | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    getMenuMaintenanceCatalog()
      .then((response) => {
        if (!active) {
          return;
        }

        setCategories(response.categories);
        setSelectedItemId(response.categories.flatMap((category) => category.menuItems)[0]?.id ?? "");
      })
      .catch((caught) => {
        setError(caught instanceof ApiClientError ? caught.message : "Unable to load menu.");
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const allItems = useMemo(
    () => categories.flatMap((category) => category.menuItems),
    [categories]
  );
  const selectedItem = allItems.find((item) => item.id === selectedItemId) ?? null;
  const editableItem = selectedItemId === NEW_ITEM_ID ? draftItem : selectedItem;
  const customizationTemplates = useMemo(
    () => buildCustomizationTemplates(allItems),
    [allItems]
  );

  async function saveItem(itemId: string, input: MenuItemInput) {
    setSavingItemId(itemId);
    setError(null);
    setSuccessMessage(null);

    try {
      if (itemId === NEW_ITEM_ID) {
        const createdItem = await createMenuItem(input);
        setCategories((current) => addMenuItemToCategory(current, createdItem.categoryId, createdItem));
        setDraftItem(null);
        setSelectedItemId(createdItem.id);
        setSuccessMessage(`${createdItem.name} added to the menu.`);
      } else {
        const updatedItem = await updateMenuItem(itemId, input);
        setCategories((current) => replaceMenuItem(current, updatedItem));
        setSelectedItemId(updatedItem.id);
        setSuccessMessage(`${updatedItem.name} saved. Future counter orders will use the updated menu.`);
      }
    } catch (caught) {
      setError(caught instanceof ApiClientError ? caught.message : "Unable to save menu item.");
    } finally {
      setSavingItemId(null);
    }
  }

  async function deleteItem(itemId: string) {
    setDeletingItemId(itemId);
    setError(null);
    setSuccessMessage(null);

    try {
      const retiredItem = await deleteMenuItem(itemId);
      const nextCategories = removeMenuItem(categories, itemId);
      setCategories(nextCategories);
      setSelectedItemId(nextCategories.flatMap((category) => category.menuItems)[0]?.id ?? "");
      setSuccessMessage(`${retiredItem.name} removed from future menus.`);
    } catch (caught) {
      setError(caught instanceof ApiClientError ? caught.message : "Unable to delete menu item.");
    } finally {
      setDeletingItemId(null);
    }
  }

  function addDraftItem() {
    const nextDraftItem = createDraftItem(categories);

    if (!nextDraftItem) {
      setError("Create a menu category before adding menu items.");
      return;
    }

    setDraftItem(nextDraftItem);
    setSelectedItemId(NEW_ITEM_ID);
    setSuccessMessage(null);
    setError(null);
  }

  function updateDraftCategory(categoryId: string) {
    setDraftItem((current) => {
      if (!current) {
        return current;
      }

      const category = categories.find((candidate) => candidate.id === categoryId);

      return {
        ...current,
        categoryId,
        displayOrder: (category?.menuItems.length ?? 0) + 1
      };
    });
  }

  return (
    <section className="menu-maintenance-layout" aria-label="Menu maintenance">
      <header className="counter-header">
        <div>
          <h2>Menu maintenance</h2>
          <p>Manage item availability and scoped customization choices</p>
        </div>
      </header>

      {error ? <p className="form-error">{error}</p> : null}
      {successMessage ? <p className="pickup-success">{successMessage}</p> : null}

      {loading ? (
        <p className="empty-state">Loading menu.</p>
      ) : (
        <div className="menu-maintenance-workspace">
          <section className="menu-maintenance-list" aria-label="Menu items">
            <button type="button" className="add-menu-item-button" onClick={addDraftItem}>
              <Plus size={17} aria-hidden="true" />
              Add menu item
            </button>
            {categories.map((category) => (
              <div key={category.id} className="menu-maintenance-category">
                <h3>{category.name}</h3>
                <div>
                  {category.menuItems.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className={selectedItemId === item.id ? "menu-maintenance-row selected" : "menu-maintenance-row"}
                      onClick={() => {
                        setSelectedItemId(item.id);
                        setSuccessMessage(null);
                      }}
                    >
                      <Pencil size={16} aria-hidden="true" />
                      <span>Edit {item.name}</span>
                      <small>{item.available && item.active ? "Available" : "Unavailable"}</small>
                    </button>
                  ))}
                  {draftItem?.categoryId === category.id ? (
                    <button
                      type="button"
                      className={selectedItemId === NEW_ITEM_ID ? "menu-maintenance-row selected" : "menu-maintenance-row"}
                      onClick={() => setSelectedItemId(NEW_ITEM_ID)}
                    >
                      <Pencil size={16} aria-hidden="true" />
                      <span>Edit New menu item</span>
                      <small>Draft</small>
                    </button>
                  ) : null}
                </div>
              </div>
            ))}
          </section>

          {editableItem ? (
            <MenuItemEditor
              item={editableItem as MenuItem}
              categories={categories}
              customizationTemplates={customizationTemplates}
              isNew={editableItem.id === NEW_ITEM_ID}
              saving={savingItemId === editableItem.id}
              deleting={deletingItemId === editableItem.id}
              onSave={saveItem}
              onDelete={deleteItem}
              {...(editableItem.id === NEW_ITEM_ID
                ? { onCategoryChange: updateDraftCategory }
                : {})}
            />
          ) : (
            <p className="empty-state">No menu items found.</p>
          )}
        </div>
      )}
    </section>
  );
}
