import { useEffect, useState } from "react";

import type { LoyaltyEarningRuleInput } from "@coffee-shop/shared/contracts/api";
import type { LoyaltyEarningRule } from "@coffee-shop/shared/domain/types";

interface LoyaltyProgramSettingsProps {
  rule: LoyaltyEarningRule | null;
  onSave: (input: LoyaltyEarningRuleInput) => Promise<LoyaltyEarningRule>;
}

export function LoyaltyProgramSettings({ rule, onSave }: LoyaltyProgramSettingsProps) {
  const [earningType, setEarningType] = useState<LoyaltyEarningRule["earningType"]>(rule?.earningType ?? "purchase_amount");
  const [amountThreshold, setAmountThreshold] = useState(rule?.amountThreshold ?? "10.00");
  const [beverageCountThreshold, setBeverageCountThreshold] = useState(String(rule?.beverageCountThreshold ?? 1));
  const [pointsAwarded, setPointsAwarded] = useState(String(rule?.pointsAwarded ?? 1));
  const [activeRule, setActiveRule] = useState(rule);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setActiveRule(rule), [rule]);

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    try {
      const input: LoyaltyEarningRuleInput = earningType === "purchase_amount"
        ? { earningType, amountThreshold, pointsAwarded: Number(pointsAwarded) }
        : { earningType, beverageCountThreshold: Number(beverageCountThreshold), pointsAwarded: Number(pointsAwarded) };
      setActiveRule(await onSave(input));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to save earning rule.");
    }
  }

  return (
    <section className="loyalty-program-settings" aria-label="Earning rule settings">
      <div className="loyalty-section-heading"><div><h3>Earning rule</h3><p>Only the active version applies to newly completed orders.</p></div></div>
      <form className="loyalty-customer-form" onSubmit={save}>
        <fieldset>
          <legend>Earning basis</legend>
          <label><input type="radio" checked={earningType === "purchase_amount"} onChange={() => setEarningType("purchase_amount")} /> Purchase amount</label>
          <label><input type="radio" checked={earningType === "beverage_count"} onChange={() => setEarningType("beverage_count")} /> Beverage count</label>
        </fieldset>
        {earningType === "purchase_amount" ? <label>Purchase amount<input aria-label="Purchase amount" inputMode="decimal" value={amountThreshold} onChange={(event) => setAmountThreshold(event.target.value)} /></label> : <label>Beverage count<input aria-label="Beverage count" type="number" min="1" value={beverageCountThreshold} onChange={(event) => setBeverageCountThreshold(event.target.value)} /></label>}
        <label>Points awarded<input aria-label="Points awarded" type="number" min="1" value={pointsAwarded} onChange={(event) => setPointsAwarded(event.target.value)} /></label>
        <button type="submit">Save earning rule</button>
      </form>
      {activeRule ? <p className="loyalty-active-rule">Active: {activeRule.pointsAwarded} point{activeRule.pointsAwarded === 1 ? "" : "s"} per {activeRule.earningType === "purchase_amount" ? `$${activeRule.amountThreshold} purchase amount` : `${activeRule.beverageCountThreshold} beverage${activeRule.beverageCountThreshold === 1 ? "" : "s"}`}.</p> : <p className="empty-state">No earning rule is active.</p>}
      {error ? <p className="form-error">{error}</p> : null}
    </section>
  );
}
