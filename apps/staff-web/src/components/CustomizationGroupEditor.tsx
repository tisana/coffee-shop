import { Plus, Trash2 } from "lucide-react";

import type { CustomizationGroupInput } from "@coffee-shop/shared/contracts/api";

interface CustomizationGroupEditorProps {
  groups: CustomizationGroupInput[];
  onChange: (groups: CustomizationGroupInput[]) => void;
}

function updateGroup(
  groups: CustomizationGroupInput[],
  index: number,
  updates: Partial<CustomizationGroupInput>
): CustomizationGroupInput[] {
  return groups.map((group, candidateIndex) =>
    candidateIndex === index ? { ...group, ...updates } : group
  );
}

export function CustomizationGroupEditor({ groups, onChange }: CustomizationGroupEditorProps) {
  function updateChoice(
    groupIndex: number,
    choiceIndex: number,
    updates: NonNullable<CustomizationGroupInput["choices"]>[number]
  ) {
    const group = groups[groupIndex];
    if (!group) {
      return;
    }

    const choices = group.choices ?? [];

    onChange(
      updateGroup(groups, groupIndex, {
        choices: choices.map((choice, candidateIndex) =>
          candidateIndex === choiceIndex ? { ...choice, ...updates } : choice
        )
      })
    );
  }

  return (
    <div className="customization-editor">
      <div className="menu-editor-subheading">
        <h4>Customization groups</h4>
        <button
          type="button"
          onClick={() =>
            onChange([
              ...groups,
              {
                name: "New group",
                required: false,
                minSelections: 0,
                maxSelections: 1,
                displayOrder: groups.length + 1,
                active: true,
                choices: []
              }
            ])
          }
        >
          <Plus size={16} aria-hidden="true" />
          Add group
        </button>
      </div>

      {groups.map((group, groupIndex) => (
        <fieldset key={group.id ?? groupIndex} className="customization-editor-group">
          <legend>{group.name || "Customization group"}</legend>

          <div className="menu-editor-grid">
            <label>
              Group name
              <input
                value={group.name}
                onChange={(event) =>
                  onChange(updateGroup(groups, groupIndex, { name: event.target.value }))
                }
              />
            </label>
            <label>
              Min
              <input
                min={0}
                type="number"
                value={group.minSelections ?? 0}
                onChange={(event) =>
                  onChange(
                    updateGroup(groups, groupIndex, {
                      minSelections: Number(event.target.value)
                    })
                  )
                }
              />
            </label>
            <label>
              Max
              <input
                min={1}
                type="number"
                value={group.maxSelections ?? 1}
                onChange={(event) =>
                  onChange(
                    updateGroup(groups, groupIndex, {
                      maxSelections: Number(event.target.value)
                    })
                  )
                }
              />
            </label>
          </div>

          <div className="menu-editor-toggles">
            <label>
              <input
                checked={group.required ?? false}
                type="checkbox"
                onChange={(event) =>
                  onChange(updateGroup(groups, groupIndex, { required: event.target.checked }))
                }
              />
              Required
            </label>
            <label>
              <input
                checked={group.active ?? true}
                type="checkbox"
                onChange={(event) =>
                  onChange(updateGroup(groups, groupIndex, { active: event.target.checked }))
                }
              />
              Active
            </label>
          </div>

          <div className="choice-editor-list">
            {(group.choices ?? []).map((choice, choiceIndex) => (
              <div key={choice.id ?? choiceIndex} className="choice-editor-row">
                <label>
                  Choice name
                  <input
                    value={choice.name}
                    onChange={(event) =>
                      updateChoice(groupIndex, choiceIndex, {
                        ...choice,
                        name: event.target.value
                      })
                    }
                  />
                </label>
                <label>
                  Price
                  <input
                    value={choice.priceAdjustment ?? "0.00"}
                    onChange={(event) =>
                      updateChoice(groupIndex, choiceIndex, {
                        ...choice,
                        priceAdjustment: event.target.value
                      })
                    }
                  />
                </label>
                <label className="inline-checkbox">
                  <input
                    aria-label={`${choice.name} available`}
                    checked={choice.available ?? true}
                    type="checkbox"
                    onChange={(event) =>
                      updateChoice(groupIndex, choiceIndex, {
                        ...choice,
                        available: event.target.checked
                      })
                    }
                  />
                  Available
                </label>
                <button
                  type="button"
                  className="secondary-danger-button"
                  aria-label={`Remove ${choice.name}`}
                  onClick={() =>
                    onChange(
                      updateGroup(groups, groupIndex, {
                        choices: (group.choices ?? []).filter((_, index) => index !== choiceIndex)
                      })
                    )
                  }
                >
                  <Trash2 size={16} aria-hidden="true" />
                </button>
              </div>
            ))}
          </div>

          <button
            type="button"
            className="secondary-button"
            onClick={() =>
              onChange(
                updateGroup(groups, groupIndex, {
                  choices: [
                    ...(group.choices ?? []),
                    {
                      name: "New choice",
                      priceAdjustment: "0.00",
                      available: true,
                      displayOrder: (group.choices ?? []).length + 1,
                      active: true
                    }
                  ]
                })
              )
            }
          >
            <Plus size={16} aria-hidden="true" />
            Add choice
          </button>
        </fieldset>
      ))}
    </div>
  );
}
