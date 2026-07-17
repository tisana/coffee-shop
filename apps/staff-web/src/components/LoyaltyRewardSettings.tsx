import { useState } from "react";

import type { LoyaltyRewardOptionInput, LoyaltyRewardOptionUpdate } from "@coffee-shop/shared/contracts/api";
import type { LoyaltyRewardOption } from "@coffee-shop/shared/domain/types";

interface LoyaltyRewardSettingsProps {
  rewards: LoyaltyRewardOption[];
  onCreate: (input: LoyaltyRewardOptionInput) => Promise<LoyaltyRewardOption>;
  onRetire: (rewardId: string) => Promise<LoyaltyRewardOption>;
  onUpdate: (rewardId: string, input: LoyaltyRewardOptionUpdate) => Promise<LoyaltyRewardOption>;
}

export function LoyaltyRewardSettings({ rewards, onCreate, onRetire, onUpdate }: LoyaltyRewardSettingsProps) {
  const [name, setName] = useState("");
  const [pointsCost, setPointsCost] = useState("10");
  const [benefitType, setBenefitType] = useState<"free_beverage" | "size_upgrade">("free_beverage");
  const [benefitDescription, setBenefitDescription] = useState("");
  const [editingRewardId, setEditingRewardId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editPointsCost, setEditPointsCost] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(null);
    try { await onCreate({ name, pointsCost: Number(pointsCost), benefitType, benefitDescription }); setName(""); setBenefitDescription(""); setPointsCost("10"); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Unable to create reward."); }
  }

  function beginEdit(reward: LoyaltyRewardOption) {
    setEditingRewardId(reward.id);
    setEditName(reward.name);
    setEditPointsCost(String(reward.pointsCost));
    setEditDescription(reward.benefitDescription);
  }

  async function submitEdit(event: React.FormEvent<HTMLFormElement>, rewardId: string) {
    event.preventDefault(); setError(null);
    try {
      await onUpdate(rewardId, { name: editName, pointsCost: Number(editPointsCost), benefitDescription: editDescription });
      setEditingRewardId(null);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Unable to update reward."); }
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
    <ul className="loyalty-reward-list">{rewards.map((reward) => <li key={reward.id}>
      {editingRewardId === reward.id ? <form className="loyalty-customer-form" onSubmit={(event) => void submitEdit(event, reward.id)}>
        <label>Edit name<input value={editName} onChange={(event) => setEditName(event.target.value)} required /></label>
        <label>Edit points cost<input type="number" min="1" value={editPointsCost} onChange={(event) => setEditPointsCost(event.target.value)} required /></label>
        <label>Edit description<input value={editDescription} onChange={(event) => setEditDescription(event.target.value)} required /></label>
        <span>{reward.benefitType.replace("_", " ")}</span>
        <button type="submit">Save changes</button>
        <button type="button" onClick={() => setEditingRewardId(null)}>Cancel edit</button>
      </form> : <><div><strong>{reward.name}</strong><span>{reward.pointsCost} points, {reward.benefitType.replace("_", " ")}</span></div>{reward.active ? <div className="loyalty-reward-actions"><button type="button" onClick={() => beginEdit(reward)} aria-label={`Edit ${reward.name}`}>Edit</button><button type="button" onClick={() => void onRetire(reward.id)}>Retire</button></div> : <span>Retired</span>}</>}
    </li>)}</ul>
    {error ? <p className="form-error">{error}</p> : null}
  </section>;
}
