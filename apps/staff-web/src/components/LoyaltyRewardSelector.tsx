import type { LoyaltyRewardSelection } from "@coffee-shop/shared/contracts/api";
import type { LoyaltyRewardOption } from "@coffee-shop/shared/domain/types";

import type { DraftBeverage } from "./OrderSummary";

interface LoyaltyRewardSelectorProps {
  beverages: DraftBeverage[];
  rewards: LoyaltyRewardOption[];
  availablePoints: number;
  selections: LoyaltyRewardSelection[];
  onChange: (selections: LoyaltyRewardSelection[]) => void;
}

export function LoyaltyRewardSelector({ beverages, rewards, availablePoints, selections, onChange }: LoyaltyRewardSelectorProps) {
  const activeRewards = rewards.filter((reward) => reward.active);

  function selectionsForBeverage(targetBeverageIndex: number) {
    return selections.filter((selection) => selection.targetBeverageIndex === targetBeverageIndex);
  }

  function selectionIndex(targetBeverageIndex: number, unitIndex: number) {
    let unit = 0;
    return selections.findIndex((selection) => {
      if (selection.targetBeverageIndex !== targetBeverageIndex) return false;
      const matches = unit === unitIndex;
      unit += 1;
      return matches;
    });
  }

  function changeSelection(targetBeverageIndex: number, unitIndex: number, rewardOptionId: string) {
    const index = selectionIndex(targetBeverageIndex, unitIndex);
    if (!rewardOptionId) return onChange(index < 0 ? selections : selections.filter((_, candidateIndex) => candidateIndex !== index));
    const reward = activeRewards.find((candidate) => candidate.id === rewardOptionId);
    const beverage = beverages[targetBeverageIndex];
    if (!reward || !beverage) return;
    const replacement: LoyaltyRewardSelection = {
      rewardOptionId: reward.id,
      targetBeverageIndex
    };
    if (index < 0) return onChange([...selections, replacement]);
    onChange(selections.map((selection, candidateIndex) => candidateIndex === index ? replacement : selection));
  }

  function selectedPositiveChoices(beverage: DraftBeverage) {
    const selectedIds = new Set(beverage.selectedCustomizations.flatMap((selection) => selection.customizationChoiceIds));
    return beverage.menuItem.customizationGroups.flatMap((group) => group.choices)
      .filter((choice) => selectedIds.has(choice.id) && Number(choice.priceAdjustment) > 0);
  }

  function changeSizeChoice(targetBeverageIndex: number, unitIndex: number, choiceId: string) {
    const index = selectionIndex(targetBeverageIndex, unitIndex);
    if (index < 0) return;
    onChange(selections.map((selection, candidateIndex) => candidateIndex === index
      ? { ...selection, targetCustomizationChoiceId: choiceId }
      : selection));
  }

  if (beverages.length === 0) return null;
  return (
    <section className="loyalty-reward-selector" aria-label="Loyalty rewards">
      <div className="loyalty-section-heading"><div><h3>Apply reward</h3><p>{availablePoints} available points</p></div></div>
      {beverages.map((beverage, index) => {
        const sizeChoices = selectedPositiveChoices(beverage);
        return Array.from({ length: beverage.quantity }, (_, unitIndex) => {
          const selected = selectionsForBeverage(index)[unitIndex];
          const reward = activeRewards.find((candidate) => candidate.id === selected?.rewardOptionId);
          const committedPoints = selections.reduce((total, selection, selectionPosition) => selectionPosition === selectionIndex(index, unitIndex) ? total : total + (activeRewards.find((candidate) => candidate.id === selection.rewardOptionId)?.pointsCost ?? 0), 0);
          const label = beverage.quantity === 1 ? `${beverage.quantity}x ${beverage.menuItem.name}` : `${beverage.quantity}x ${beverage.menuItem.name} (unit ${unitIndex + 1})`;
          const sizeLabel = beverage.quantity === 1 ? `Size adjustment for ${beverage.menuItem.name}` : `Size adjustment for ${beverage.menuItem.name} (unit ${unitIndex + 1})`;
          return <div key={`${beverage.id}-${unitIndex}`} className="loyalty-reward-target">
            <label>
              {label}
              <select value={selected?.rewardOptionId ?? ""} onChange={(event) => changeSelection(index, unitIndex, event.target.value)}>
                <option value="">No reward</option>
                {activeRewards.map((candidate) => <option key={candidate.id} value={candidate.id} disabled={candidate.id !== selected?.rewardOptionId && (candidate.pointsCost > availablePoints - committedPoints || (candidate.benefitType === "size_upgrade" && sizeChoices.length === 0))}>{candidate.name} ({candidate.pointsCost} pts)</option>)}
              </select>
            </label>
            {reward?.benefitType === "size_upgrade" ? <label>
              {sizeLabel}
              <select value={selected?.targetCustomizationChoiceId ?? ""} onChange={(event) => changeSizeChoice(index, unitIndex, event.target.value)}>
                <option value="">Choose adjustment</option>
                {sizeChoices.map((choice) => <option key={choice.id} value={choice.id}>{choice.name} (+${choice.priceAdjustment})</option>)}
              </select>
            </label> : null}
          </div>;
        });
      })}
      {rewards.length > 0 && activeRewards.every((reward) => reward.pointsCost > availablePoints) ? <p className="empty-state">No rewards are available for this balance.</p> : null}
    </section>
  );
}
