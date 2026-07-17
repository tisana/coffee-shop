import { useCallback, useEffect, useState } from "react";

import type { LoyaltyCustomerInput, LoyaltyCustomerUpdate, LoyaltyPointsResponse } from "@coffee-shop/shared/contracts/api";
import type { LoyaltyCustomer, LoyaltyEarningRule } from "@coffee-shop/shared/domain/types";

import { LoyaltyCustomerPicker } from "../components/LoyaltyCustomerPicker";
import { LoyaltyCustomerProfile } from "../components/LoyaltyCustomerProfile";
import { LoyaltyProgramSettings } from "../components/LoyaltyProgramSettings";
import {
  createLoyaltyCustomer,
  getLoyaltyPhoneRegion,
  getLoyaltyEarningRule,
  getLoyaltyPoints,
  replaceLoyaltyEarningRule,
  searchLoyaltyCustomers,
  updateLoyaltyCustomer
} from "../services/loyaltyApi";

export function LoyaltyPage() {
  const [selectedCustomer, setSelectedCustomer] = useState<LoyaltyCustomer | null>(null);
  const [phoneRegion, setPhoneRegion] = useState<string | null>(null);
  const [rule, setRule] = useState<LoyaltyEarningRule | null>(null);
  const [points, setPoints] = useState<LoyaltyPointsResponse | null>(null);

  useEffect(() => {
    getLoyaltyPhoneRegion()
      .then((response) => setPhoneRegion(response.region))
      .catch(() => setPhoneRegion(null));
  }, []);

  useEffect(() => { getLoyaltyEarningRule().then(setRule).catch(() => setRule(null)); }, []);
  useEffect(() => { if (!selectedCustomer) { setPoints(null); return; } getLoyaltyPoints(selectedCustomer.id).then(setPoints).catch(() => setPoints(null)); }, [selectedCustomer]);

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
          phoneRegion={phoneRegion}
        />
        {selectedCustomer ? <LoyaltyCustomerProfile customer={selectedCustomer} onSave={handleSave} phoneRegion={phoneRegion} points={points} /> : <p className="empty-state">Select a customer to view the profile.</p>}
      </div>
      <LoyaltyProgramSettings rule={rule} onSave={async (input) => { const saved = await replaceLoyaltyEarningRule(input); setRule(saved); return saved; }} />
    </section>
  );
}
