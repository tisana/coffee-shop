import type { CustomizationGroup, SelectedCustomization } from "@coffee-shop/shared/domain/types";

interface CustomizationSelectorProps {
  groups: CustomizationGroup[];
  selections: SelectedCustomization[];
  onChange: (selections: SelectedCustomization[]) => void;
}

function getSelection(selections: SelectedCustomization[], groupId: string): string[] {
  return (
    selections.find((selection) => selection.customizationGroupId === groupId)
      ?.customizationChoiceIds ?? []
  );
}

export function CustomizationSelector({
  groups,
  selections,
  onChange
}: CustomizationSelectorProps) {
  function updateGroup(group: CustomizationGroup, choiceId: string, checked: boolean) {
    const currentChoiceIds = getSelection(selections, group.id);
    const nextChoiceIds =
      group.maxSelections === 1
        ? checked
          ? [choiceId]
          : []
        : checked
          ? [...currentChoiceIds, choiceId].slice(0, group.maxSelections)
          : currentChoiceIds.filter((id) => id !== choiceId);

    const nextSelections = selections.filter(
      (selection) => selection.customizationGroupId !== group.id
    );

    if (nextChoiceIds.length > 0) {
      nextSelections.push({
        customizationGroupId: group.id,
        customizationChoiceIds: nextChoiceIds
      });
    }

    onChange(nextSelections);
  }

  if (groups.length === 0) {
    return null;
  }

  return (
    <div className="customization-list">
      {groups.map((group) => {
        const selectedChoiceIds = getSelection(selections, group.id);
        const inputType = group.maxSelections === 1 ? "radio" : "checkbox";

        return (
          <fieldset key={group.id}>
            <legend>
              {group.name}
              {group.required ? <span>Required</span> : null}
            </legend>
            <div className="choice-grid">
              {group.choices.map((choice) => {
                const checked = selectedChoiceIds.includes(choice.id);

                return (
                  <label key={choice.id} className={choice.available ? "" : "disabled-choice"}>
                    <input
                      checked={checked}
                      disabled={!choice.available}
                      name={group.id}
                      type={inputType}
                      onChange={(event) => updateGroup(group, choice.id, event.target.checked)}
                    />
                    <span>{choice.name}</span>
                    {choice.priceAdjustment !== "0.00" ? (
                      <small>+${choice.priceAdjustment}</small>
                    ) : null}
                  </label>
                );
              })}
            </div>
          </fieldset>
        );
      })}
    </div>
  );
}
