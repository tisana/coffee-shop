import { useState } from "react";

import type { LoyaltyRewardOptionInput } from "@coffee-shop/shared/contracts/api";
import type { LoyaltyRewardOption } from "@coffee-shop/shared/domain/types";

interface LoyaltyRewardSettingsProps {
  rewards: LoyaltyRewardOption[];
  onCreate: (input: LoyaltyRewardOptionInput) => Promise<LoyaltyRewardOption>;
  onRetire: (rewardId: string) => Promise<LoyaltyRewardOption>;
}

export function LoyaltyRewardSettings({ rewards, onCreate, onRetire }: LoyaltyRewardSettingsProps) {
  const [name, setName] = useState("");
  const [pointsCost, setPointsCost] = useState("10");
  const [benefitType, setBenefitType] = useState<"free_beverage" | "size_upgrade">("free_beverage");
  const [benefitDescription, setBenefitDescription] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(null);
    try { await onCreate({ name, pointsCost: Number(pointsCost), benefitType, benefitDescription }); setName(""); setBenefitDescription(""); setPointsCost("10"); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Unable to create reward."); }
  }

  return <section className="loyalty-program-settings" aria-label="Reward settings">
    <div className="loyalty-section-heading"><div><h3>Rewards</h3><p>Retired rewards remain in history but cannot be selected for a new order.</p></div></div>
    <form className="loyalty-customer-form" onSubmit={submit}>
      <label>Name<input value={name} onChange={(event) => setName(event.target.value)} required /></label>
      <label>Points cost<input type="number" min="1" value={pointsCost} onChange={(event) => setPointsCost(event.target.value)} required /></label>
      <label>Benefit<select value={benefitType} onChange={(event) => setBenefitType(event.target.value as typeof benefitType)}><option value="free_beverage">Free beverage</option><option value="size_upgrade">Size upgrade</option></select></label>
      <label>Description<input value={benefitDescription} onChange={(event) => setBenefitDescription(event.target.value)} required /></label>
      <button type="submit">Add reward</button>
    </form>
    <ul className="loyalty-reward-list">{rewards.map((reward) => <li key={reward.id}><div><strong>{reward.name}</strong><span>{reward.pointsCost} points, {reward.benefitType.replace("_", " ")}</span></div>{reward.active ? <button type="button" onClick={() => void onRetire(reward.id)}>Retire</button> : <span>Retired</span>}</li>)}</ul>
    {error ? <p className="form-error">{error}</p> : null}
  </section>;
}
