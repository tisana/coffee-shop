import { useEffect, useState } from "react";

import type { LoyaltyCustomerUpdate } from "@coffee-shop/shared/contracts/api";
import type { LoyaltyCustomer } from "@coffee-shop/shared/domain/types";

interface LoyaltyCustomerProfileProps {
  customer: LoyaltyCustomer;
  onSave: (customerId: string, input: LoyaltyCustomerUpdate) => Promise<LoyaltyCustomer>;
  phoneRegion?: string | null;
  points?: import("@coffee-shop/shared/contracts/api").LoyaltyPointsResponse | null;
}

function pointHistoryDescription(
  entry: import("@coffee-shop/shared/contracts/api").LoyaltyPointHistoryEntry
): string {
  const details = [entry.rewardName, entry.orderLabel, entry.reason].filter(
    (detail, index, all): detail is string => Boolean(detail) && all.indexOf(detail) === index
  );
  return `${details.join(" | ")}${
    entry.expirationBusinessDate ? ` | Expires: ${entry.expirationBusinessDate}` : ""
  }`;
}

export function LoyaltyCustomerProfile({ customer, onSave, phoneRegion, points }: LoyaltyCustomerProfileProps) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(customer.name);
  const [phone, setPhone] = useState(customer.phone);
  const [email, setEmail] = useState(customer.email ?? "");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setName(customer.name);
    setPhone(customer.phone);
    setEmail(customer.email ?? "");
  }, [customer]);

  async function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    try {
      await onSave(customer.id, { name, phone, email: email.trim() || null });
      setEditing(false);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to update customer.");
    }
  }

  return (
    <section className="loyalty-customer-profile" aria-label="Customer profile">
      <div className="loyalty-section-heading">
        <div>
          <h3>{customer.name}</h3>
          <p>Enrolled {new Date(customer.enrolledAt).toLocaleDateString()}</p>
        </div>
        <button type="button" className="secondary-button" onClick={() => setEditing(true)}>
          Edit customer
        </button>
      </div>

      {editing ? (
        <form className="loyalty-customer-form" onSubmit={handleSave}>
          <label>
            Customer name
            <input value={name} onChange={(event) => setName(event.target.value)} required />
          </label>
          <div className="loyalty-field">
            <label htmlFor="loyalty-edit-phone">Phone number</label>
            <input
              id="loyalty-edit-phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              aria-describedby={phoneRegion ? "loyalty-edit-phone-hint" : undefined}
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="081 234 5678"
              required
            />
            {phoneRegion ? <small id="loyalty-edit-phone-hint">Phone region: {phoneRegion}</small> : null}
          </div>
          <label>
            Email address
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
          </label>
          <button type="submit">Save changes</button>
        </form>
      ) : (
        <dl className="loyalty-customer-details">
          <div><dt>Phone</dt><dd>{customer.phone}</dd></div>
          <div><dt>Email</dt><dd>{customer.email ?? "Not provided"}</dd></div>
        </dl>
      )}

      {error ? <p className="form-error">{error}</p> : null}
      {points ? <section className="loyalty-point-history" aria-label="Point history">
        <h3>Points</h3>
        <dl className="loyalty-point-summary"><div><dt>Available points</dt><dd>{points.summary.available}</dd></div><div><dt>Lifetime earned</dt><dd>{points.summary.lifetimeEarned}</dd></div><div><dt>Redeemed</dt><dd>{points.summary.redeemed}</dd></div><div><dt>Returned</dt><dd>{points.summary.returned}</dd></div><div><dt>Expired</dt><dd>{points.summary.expired}</dd></div><div><dt>Adjusted</dt><dd>{points.summary.adjusted}</dd></div></dl>
        {points.history.length === 0 ? <p className="empty-state">No point history yet.</p> : <ul>{points.history.map((entry) => <li key={entry.id} className={entry.eventType === "expired" ? "loyalty-point-history-expired" : undefined}><strong>{entry.pointsDelta > 0 ? "+" : ""}{entry.pointsDelta} points</strong><span>{pointHistoryDescription(entry)}</span></li>)}</ul>}
      </section> : null}
    </section>
  );
}
