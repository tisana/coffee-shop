import { useEffect, useState } from "react";

import type { LoyaltyEarningRuleInput, LoyaltyExpirationPolicyInput } from "@coffee-shop/shared/contracts/api";
import type { LoyaltyEarningRule, LoyaltyExpirationPolicy } from "@coffee-shop/shared/domain/types";

interface LoyaltyProgramSettingsProps {
  rule: LoyaltyEarningRule | null;
  onSave: (input: LoyaltyEarningRuleInput) => Promise<LoyaltyEarningRule>;
  expirationPolicy?: LoyaltyExpirationPolicy | null;
  onSaveExpiration?: (input: LoyaltyExpirationPolicyInput) => Promise<LoyaltyExpirationPolicy>;
}

export function LoyaltyProgramSettings({ rule, onSave, expirationPolicy = null, onSaveExpiration }: LoyaltyProgramSettingsProps) {
  const [earningType, setEarningType] = useState<LoyaltyEarningRule["earningType"]>(rule?.earningType ?? "purchase_amount");
  const [amountThreshold, setAmountThreshold] = useState(rule?.amountThreshold ?? "10.00");
  const [beverageCountThreshold, setBeverageCountThreshold] = useState(String(rule?.beverageCountThreshold ?? 1));
  const [pointsAwarded, setPointsAwarded] = useState(String(rule?.pointsAwarded ?? 1));
  const [activeRule, setActiveRule] = useState(rule);
  const [expirationEnabled, setExpirationEnabled] = useState(expirationPolicy?.enabled ?? false);
  const [expirationMonths, setExpirationMonths] = useState(String(expirationPolicy?.expirationMonths ?? 3));
  const [activeExpirationPolicy, setActiveExpirationPolicy] = useState(expirationPolicy);
  const [error, setError] = useState<string | null>(null);
  const [expirationError, setExpirationError] = useState<string | null>(null);

  useEffect(() => setActiveRule(rule), [rule]);
  useEffect(() => {
    setActiveExpirationPolicy(expirationPolicy);
    setExpirationEnabled(expirationPolicy?.enabled ?? false);
    setExpirationMonths(String(expirationPolicy?.expirationMonths ?? 3));
  }, [expirationPolicy]);

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

  async function saveExpiration(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setExpirationError(null);
    if (!onSaveExpiration) return;
    try {
      const input: LoyaltyExpirationPolicyInput = expirationEnabled
        ? { enabled: true, expirationMonths: Number(expirationMonths) }
        : { enabled: false };
      setActiveExpirationPolicy(await onSaveExpiration(input));
    } catch (caught) {
      setExpirationError(caught instanceof Error ? caught.message : "Unable to save expiration policy.");
    }
  }

  return <>
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
    <section className="loyalty-program-settings" aria-label="Expiration policy settings">
      <div className="loyalty-section-heading"><div><h3>Point expiration</h3><p>Expiration uses the shop business date and applies after the final day of the cutoff month.</p></div></div>
      <form className="loyalty-customer-form" onSubmit={saveExpiration}>
        <fieldset>
          <legend>Expiration</legend>
          <label><input type="radio" name="expiration" checked={!expirationEnabled} onChange={() => setExpirationEnabled(false)} /> No expiration</label>
          <label><input type="radio" name="expiration" checked={expirationEnabled} onChange={() => setExpirationEnabled(true)} /> Expire points</label>
        </fieldset>
        {expirationEnabled ? <label>Expiration months<input aria-label="Expiration months" type="number" min="1" value={expirationMonths} onChange={(event) => setExpirationMonths(event.target.value)} /></label> : null}
        <button type="submit" disabled={!onSaveExpiration}>Save expiration policy</button>
      </form>
      {activeExpirationPolicy?.enabled && activeExpirationPolicy.expirationMonths ? <p className="loyalty-active-rule">{expirationCutoffExplanation(activeExpirationPolicy)}</p> : <p className="empty-state">Points do not expire.</p>}
      {expirationError ? <p className="form-error">{expirationError}</p> : null}
    </section>
  </>;
}

function expirationCutoffExplanation(policy: LoyaltyExpirationPolicy): string {
  const earned = new Date(`${policy.effectiveAt.slice(0, 10)}T00:00:00Z`);
  const earnedYear = earned.getUTCFullYear();
  const earnedMonth = earned.getUTCMonth();
  const cutoff = new Date(Date.UTC(earnedYear, earnedMonth + (policy.expirationMonths ?? 0) + 1, 0));
  const month = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: "UTC" }).format(earned);
  const cutoffLabel = new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" }).format(cutoff);
  return `Points earned in ${month} remain valid through ${cutoffLabel}.`;
}
