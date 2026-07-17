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
  const activeRewards = rewards.filter((reward) => reward.active && reward.pointsCost <= availablePoints);

  function changeSelection(targetBeverageIndex: number, rewardOptionId: string) {
    const remaining = selections.filter((selection) => selection.targetBeverageIndex !== targetBeverageIndex);
    if (!rewardOptionId) return onChange(remaining);
    const reward = activeRewards.find((candidate) => candidate.id === rewardOptionId);
    const beverage = beverages[targetBeverageIndex];
    if (!reward || !beverage) return;
    const selectedChoice = beverage.selectedCustomizations.flatMap((selection) => selection.customizationChoiceIds)[0];
    onChange([...remaining, {
      rewardOptionId: reward.id,
      targetBeverageIndex,
      ...(reward.benefitType === "size_upgrade" && selectedChoice ? { targetCustomizationChoiceId: selectedChoice } : {})
    }]);
  }

  if (beverages.length === 0) return null;
  return (
    <section className="loyalty-reward-selector" aria-label="Loyalty rewards">
      <div className="loyalty-section-heading"><div><h3>Apply reward</h3><p>{availablePoints} available points</p></div></div>
      {beverages.map((beverage, index) => {
        const selected = selections.find((selection) => selection.targetBeverageIndex === index);
        return <label key={beverage.id}>
          {beverage.quantity}x {beverage.menuItem.name}
          <select value={selected?.rewardOptionId ?? ""} onChange={(event) => changeSelection(index, event.target.value)}>
            <option value="">No reward</option>
            {activeRewards.map((reward) => <option key={reward.id} value={reward.id}>{reward.name} ({reward.pointsCost} pts)</option>)}
          </select>
        </label>;
      })}
      {rewards.length > 0 && activeRewards.length === 0 ? <p className="empty-state">No rewards are available for this balance.</p> : null}
    </section>
  );
}
