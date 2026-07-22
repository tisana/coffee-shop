import type { LoyaltyEarningRule } from "@coffee-shop/shared/domain/types";

interface LoyaltyEarningEligibilityProps {
  rule: LoyaltyEarningRule | null;
  eligibleAmount: number;
  eligibleBeverageCount: number;
}

export function LoyaltyEarningEligibility(_props: LoyaltyEarningEligibilityProps) {
  const { rule, eligibleAmount, eligibleBeverageCount } = _props;

  if (!rule?.active) {
    return (
      <p className="loyalty-earning-eligibility" aria-live="polite">
        This customer will not earn points because no earning rule is active.
      </p>
    );
  }

  const threshold =
    rule.earningType === "purchase_amount"
      ? Number(rule.amountThreshold)
      : (rule.beverageCountThreshold ?? 0);
  const eligibleValue =
    rule.earningType === "purchase_amount" ? eligibleAmount : eligibleBeverageCount;
  const earnedPoints =
    threshold > 0 ? Math.floor(eligibleValue / threshold) * rule.pointsAwarded : 0;

  if (earnedPoints > 0) {
    return (
      <p className="loyalty-earning-eligibility loyalty-earning-eligible" aria-live="polite">
        This order will earn {earnedPoints} point{earnedPoints === 1 ? "" : "s"} when completed.
      </p>
    );
  }

  const remaining = Math.max(0, threshold - eligibleValue);
  const pointsLabel = `${rule.pointsAwarded} point${rule.pointsAwarded === 1 ? "" : "s"}`;
  const message =
    rule.earningType === "purchase_amount"
      ? `Add $${remaining.toFixed(2)} more eligible purchase amount to earn ${pointsLabel}.`
      : `Add ${remaining} more eligible beverage${remaining === 1 ? "" : "s"} to earn ${pointsLabel}.`;

  return (
    <p className="loyalty-earning-eligibility" aria-live="polite">
      {message}
    </p>
  );
}
