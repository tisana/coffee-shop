import { useEffect, useState } from "react";

import type { LoyaltyCustomerInput } from "@coffee-shop/shared/contracts/api";
import type { LoyaltyCustomer } from "@coffee-shop/shared/domain/types";

interface LoyaltyCustomerPickerProps {
  selectedCustomer: LoyaltyCustomer | null;
  searchCustomers: (query: string) => Promise<LoyaltyCustomer[]>;
  onSelect: (customer: LoyaltyCustomer) => void;
  onClear: () => void;
  onRegister: (input: LoyaltyCustomerInput) => Promise<LoyaltyCustomer>;
  phoneRegion: string | null;
}

export function LoyaltyCustomerPicker({
  selectedCustomer,
  searchCustomers,
  onSelect,
  onClear,
  onRegister,
  phoneRegion
}: LoyaltyCustomerPickerProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<LoyaltyCustomer[]>([]);
  const [showRegistration, setShowRegistration] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    let active = true;
    const trimmedQuery = query.trim();

    if (!trimmedQuery) {
      setResults([]);
      return () => {
        active = false;
      };
    }

    const timeout = window.setTimeout(() => {
      setSearching(true);
      searchCustomers(trimmedQuery)
      .then((customers) => {
        if (active) {
          setResults(customers);
          setError(null);
        }
      })
      .catch((caught: unknown) => {
        if (active) {
          setError(caught instanceof Error ? caught.message : "Unable to search customers.");
        }
      })
      .finally(() => {
        if (active) {
          setSearching(false);
        }
      });
    }, 200);

    return () => {
      active = false;
      window.clearTimeout(timeout);
    };
  }, [query, searchCustomers]);

  async function handleRegister(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    try {
      const customer = await onRegister({
        name,
        phone,
        email: email.trim() || null
      });
      onSelect(customer);
      setShowRegistration(false);
      setName("");
      setPhone("");
      setEmail("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to register customer.");
    }
  }

  return (
    <section className="loyalty-customer-picker" aria-label="Customer lookup">
      <div className="loyalty-section-heading">
        <div>
          <h3>Customer lookup</h3>
          <p>Find by phone or name, then open the customer profile.</p>
        </div>
        <button type="button" className="secondary-button" onClick={() => setShowRegistration((visible) => !visible)}>
          Register customer
        </button>
      </div>

      <label>
        Search customers
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Phone or name" />
      </label>

      {results.length > 0 ? (
        <ul className="loyalty-search-results">
          {results.map((customer) => (
            <li key={customer.id}>
              <div>
                <strong>{customer.name}</strong>
                <span>{customer.phone}</span>
              </div>
              <button type="button" onClick={() => onSelect(customer)}>
                Select {customer.name}
              </button>
            </li>
          ))}
        </ul>
      ) : query.trim() ? (
        <p className="empty-state">No customers match that lookup.</p>
      ) : null}

      {searching ? <p className="empty-state">Searching customers.</p> : null}
      {selectedCustomer ? (
        <div className="loyalty-selection-actions">
          <p className="loyalty-selected-customer">Selected: {selectedCustomer.name}</p>
          <button type="button" className="secondary-button" onClick={onClear}>Clear selection</button>
        </div>
      ) : null}

      {showRegistration ? (
        <form className="loyalty-customer-form" onSubmit={handleRegister}>
          <label>
            Customer name
            <input value={name} onChange={(event) => setName(event.target.value)} required />
          </label>
          <div className="loyalty-field">
            <label htmlFor="loyalty-register-phone">Phone number</label>
            <input
              id="loyalty-register-phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              aria-describedby="loyalty-register-phone-hint"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="081 234 5678"
              required
            />
            <small id="loyalty-register-phone-hint">
              {phoneRegion
                ? phoneInputHint(phoneRegion)
                : "Enter a local or international number. Spaces and dashes are allowed."}
            </small>
          </div>
          <label>
            Email address
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
          </label>
          <button type="submit">Save customer</button>
        </form>
      ) : null}

      {error ? <p className="form-error">{error}</p> : null}
    </section>
  );
}

function phoneInputHint(region: string): string {
  const countryName = new Intl.DisplayNames(["en"], { type: "region" }).of(region) ?? region;
  return `${countryName} (${region}): enter a local number such as 081 234 5678.`;
}
