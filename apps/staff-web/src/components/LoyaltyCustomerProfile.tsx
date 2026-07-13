import { useEffect, useState } from "react";

import type { LoyaltyCustomerUpdate } from "@coffee-shop/shared/contracts/api";
import type { LoyaltyCustomer } from "@coffee-shop/shared/domain/types";

interface LoyaltyCustomerProfileProps {
  customer: LoyaltyCustomer;
  onSave: (customerId: string, input: LoyaltyCustomerUpdate) => Promise<LoyaltyCustomer>;
}

export function LoyaltyCustomerProfile({ customer, onSave }: LoyaltyCustomerProfileProps) {
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
          <label>
            Phone number
            <input value={phone} onChange={(event) => setPhone(event.target.value)} required />
          </label>
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
    </section>
  );
}
