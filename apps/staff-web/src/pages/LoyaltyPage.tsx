import { useCallback, useState } from "react";

import type { LoyaltyCustomerInput, LoyaltyCustomerUpdate } from "@coffee-shop/shared/contracts/api";
import type { LoyaltyCustomer } from "@coffee-shop/shared/domain/types";

import { LoyaltyCustomerPicker } from "../components/LoyaltyCustomerPicker";
import { LoyaltyCustomerProfile } from "../components/LoyaltyCustomerProfile";
import {
  createLoyaltyCustomer,
  searchLoyaltyCustomers,
  updateLoyaltyCustomer
} from "../services/loyaltyApi";

export function LoyaltyPage() {
  const [selectedCustomer, setSelectedCustomer] = useState<LoyaltyCustomer | null>(null);

  const handleRegister = useCallback(async (input: LoyaltyCustomerInput) => {
    const customer = await createLoyaltyCustomer(input);
    setSelectedCustomer(customer);
    return customer;
  }, []);

  const handleSave = useCallback(async (customerId: string, input: LoyaltyCustomerUpdate) => {
    const customer = await updateLoyaltyCustomer(customerId, input);
    setSelectedCustomer(customer);
    return customer;
  }, []);

  return (
    <section className="loyalty-page" aria-label="Loyalty">
      <header className="counter-header">
        <div>
          <h2>Loyalty</h2>
          <p>Register customers and maintain the phone identity used for future rewards.</p>
        </div>
      </header>

      <div className="loyalty-page-grid">
        <LoyaltyCustomerPicker
          selectedCustomer={selectedCustomer}
          searchCustomers={searchLoyaltyCustomers}
          onSelect={setSelectedCustomer}
          onClear={() => setSelectedCustomer(null)}
          onRegister={handleRegister}
        />
        {selectedCustomer ? <LoyaltyCustomerProfile customer={selectedCustomer} onSave={handleSave} /> : <p className="empty-state">Select a customer to view the profile.</p>}
      </div>
    </section>
  );
}
