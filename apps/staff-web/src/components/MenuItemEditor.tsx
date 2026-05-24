import { Save, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

import type { CustomizationGroupInput, MenuItemInput } from "@coffee-shop/shared/contracts/api";
import type { MenuCategory, MenuItem } from "@coffee-shop/shared/domain/types";

import { CustomizationGroupEditor } from "./CustomizationGroupEditor";

export interface CustomizationTemplate {
  id: string;
  label: string;
  groups: CustomizationGroupInput[];
}

interface MenuItemEditorProps {
  item: MenuItem;
  categories: MenuCategory[];
  customizationTemplates: CustomizationTemplate[];
  isNew?: boolean;
  saving: boolean;
  deleting?: boolean;
  onSave: (itemId: string, input: MenuItemInput) => void;
  onDelete?: (itemId: string) => void;
  onCategoryChange?: (categoryId: string) => void;
}

function toEditableGroups(item: MenuItem): CustomizationGroupInput[] {
  return item.customizationGroups.map((group) => ({
    id: group.id,
    name: group.name,
    required: group.required,
    minSelections: group.minSelections,
    maxSelections: group.maxSelections,
    displayOrder: group.displayOrder,
    active: group.active,
    choices: group.choices.map((choice) => ({
      id: choice.id,
      name: choice.name,
      priceAdjustment: choice.priceAdjustment,
      available: choice.available,
      displayOrder: choice.displayOrder,
      active: choice.active
    }))
  }));
}

function copyGroupsForTemplate(groups: CustomizationGroupInput[]): CustomizationGroupInput[] {
  return groups.map((group) => ({
    name: group.name,
    required: group.required,
    minSelections: group.minSelections,
    maxSelections: group.maxSelections,
    displayOrder: group.displayOrder,
    active: group.active,
    choices: group.choices?.map((choice) => ({
      name: choice.name,
      priceAdjustment: choice.priceAdjustment,
      available: choice.available,
      displayOrder: choice.displayOrder,
      active: choice.active
    }))
  }));
}

export function MenuItemEditor({
  item,
  categories,
  customizationTemplates,
  isNew = false,
  saving,
  deleting = false,
  onSave,
  onDelete,
  onCategoryChange
}: MenuItemEditorProps) {
  const [deleteConfirmationOpen, setDeleteConfirmationOpen] = useState(false);
  const [categoryId, setCategoryId] = useState(item.categoryId);
  const [name, setName] = useState(item.name);
  const [description, setDescription] = useState(item.description ?? "");
  const [imageUrl, setImageUrl] = useState(item.imageUrl ?? "");
  const [price, setPrice] = useState(item.price);
  const [available, setAvailable] = useState(item.available);
  const [active, setActive] = useState(item.active);
  const [groups, setGroups] = useState<CustomizationGroupInput[]>(() => toEditableGroups(item));

  useEffect(() => {
    setCategoryId(item.categoryId);
    setName(item.name);
    setDescription(item.description ?? "");
    setImageUrl(item.imageUrl ?? "");
    setPrice(item.price);
    setAvailable(item.available);
    setActive(item.active);
    setGroups(toEditableGroups(item));
    setDeleteConfirmationOpen(false);
  }, [item]);

  const canDeleteSavedItem = !isNew && !item.available && !item.active;
  const deleteBlockedReason =
    !isNew && !canDeleteSavedItem
      ? "Turn off order availability and staff-menu visibility, then save before deleting."
      : null;

  function saveItem() {
    onSave(item.id, {
      categoryId,
      name,
      description: description.trim() || null,
      imageUrl: imageUrl.trim() || null,
      price,
      available,
      active,
      customizationGroups: groups
    });
  }

  function changeCategory(nextCategoryId: string) {
    setCategoryId(nextCategoryId);
    onCategoryChange?.(nextCategoryId);
  }

  function applyTemplate(templateId: string) {
    const template = customizationTemplates.find((candidate) => candidate.id === templateId);

    if (!template) {
      return;
    }

    setGroups(copyGroupsForTemplate(template.groups));
  }

  return (
    <section className="menu-item-editor" aria-label={`${item.name || "New menu item"} editor`}>
      <div className="menu-editor-title">
        <div>
          <p className="eyebrow">Selected item</p>
          <h3>{item.name || "New menu item"}</h3>
        </div>
        <span className={available && active ? "menu-state menu-state-active" : "menu-state"}>
          {available && active ? "Available" : "Unavailable"}
        </span>
      </div>

      <div className="menu-editor-grid">
        <label>
          Category
          <select value={categoryId} onChange={(event) => changeCategory(event.target.value)}>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Item name
          <input value={name} onChange={(event) => setName(event.target.value)} />
        </label>
        <label>
          Price
          <input value={price} onChange={(event) => setPrice(event.target.value)} />
        </label>
      </div>

      <label>
        Description
        <textarea
          rows={3}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
        />
      </label>

      <div className="menu-editor-grid">
        <label>
          Image URL
          <input
            type="url"
            value={imageUrl}
            onChange={(event) => setImageUrl(event.target.value)}
          />
        </label>
        {imageUrl.trim() ? (
          <div className="menu-image-preview" aria-label="Menu image preview">
            <img src={imageUrl.trim()} alt="" />
          </div>
        ) : null}
      </div>

      <div className="menu-editor-toggles">
        <label>
          <input
            checked={available}
            type="checkbox"
            onChange={(event) => setAvailable(event.target.checked)}
          />
          Available for new orders
        </label>
        <label>
          <input checked={active} type="checkbox" onChange={(event) => setActive(event.target.checked)} />
          Active on staff menu
        </label>
      </div>

      {customizationTemplates.length > 0 ? (
        <label>
          Customization template
          <select defaultValue="" onChange={(event) => applyTemplate(event.target.value)}>
            <option value="">Choose a template</option>
            {customizationTemplates.map((template) => (
              <option key={template.id} value={template.id}>
                {template.label}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      <CustomizationGroupEditor groups={groups} onChange={setGroups} />

      <div className="menu-editor-actions">
        <button type="button" disabled={saving || deleting} onClick={saveItem}>
          <Save size={17} aria-hidden="true" />
          {saving ? "Saving" : isNew ? "Create menu item" : "Save menu item"}
        </button>
        {!isNew ? (
          <div className="menu-delete-control">
            <button
              type="button"
              className="secondary-danger-button"
              disabled={saving || deleting || !canDeleteSavedItem}
              title={deleteBlockedReason ?? undefined}
              onClick={() => setDeleteConfirmationOpen(true)}
            >
              <Trash2 size={17} aria-hidden="true" />
              {deleting ? "Deleting" : "Delete menu item"}
            </button>
            {deleteBlockedReason ? <small>{deleteBlockedReason}</small> : null}
          </div>
        ) : null}
      </div>

      {deleteConfirmationOpen ? (
        <div className="modal-backdrop">
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`Delete ${item.name}`}
            className="confirmation-dialog"
          >
            <div>
              <p className="eyebrow">Confirm delete</p>
              <h3>Delete {item.name}?</h3>
              <p>
                This removes the item from future menus. Existing order snapshots stay unchanged.
              </p>
            </div>
            <div className="confirmation-actions">
              <button
                type="button"
                className="secondary-button"
                disabled={deleting}
                onClick={() => setDeleteConfirmationOpen(false)}
              >
                Cancel delete
              </button>
              <button
                type="button"
                className="secondary-danger-button"
                disabled={deleting}
                onClick={() => {
                  setDeleteConfirmationOpen(false);
                  onDelete?.(item.id);
                }}
              >
                <Trash2 size={17} aria-hidden="true" />
                Confirm delete
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
