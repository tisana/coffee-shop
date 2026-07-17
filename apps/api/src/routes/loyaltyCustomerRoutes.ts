import { Router } from "express";

import { requireStaff } from "../auth/requireStaff";
import {
  createLoyaltyCustomer,
  getLoyaltyPhoneRegion,
  getLoyaltyCustomer,
  searchLoyaltyCustomers,
  updateLoyaltyCustomer
} from "../domain/loyaltyCustomerService";
import { getActiveEarningRule, replaceActiveEarningRule } from "../domain/loyaltyConfigurationService";
import { getLoyaltyPoints } from "../domain/loyaltyLedgerService";
import {
  loyaltyCustomerInputSchema,
  loyaltyCustomerParamsSchema,
  loyaltyCustomerSearchQuerySchema,
  loyaltyCustomerUpdateSchema,
  loyaltyEarningRuleInputSchema
} from "./validators";

export function createLoyaltyCustomerRoutes(): Router {
  const router = Router();

  router.get("/loyalty/phone-region", requireStaff, (_request, response, next) => {
    try {
      response.json({ region: getLoyaltyPhoneRegion() });
    } catch (error) {
      next(error);
    }
  });

  router.get("/loyalty/customers", requireStaff, async (request, response, next) => {
    try {
      const { query, limit } = loyaltyCustomerSearchQuerySchema.parse(request.query);
      const customers = await searchLoyaltyCustomers(query, limit);
      response.json({ customers });
    } catch (error) {
      next(error);
    }
  });

  router.post("/loyalty/customers", requireStaff, async (request, response, next) => {
    try {
      const customer = await createLoyaltyCustomer(loyaltyCustomerInputSchema.parse(request.body));
      response.status(201).json(customer);
    } catch (error) {
      next(error);
    }
  });

  router.get("/loyalty/customers/:customerId", requireStaff, async (request, response, next) => {
    try {
      const { customerId } = loyaltyCustomerParamsSchema.parse(request.params);
      response.json(await getLoyaltyCustomer(customerId));
    } catch (error) {
      next(error);
    }
  });

  router.get("/loyalty/customers/:customerId/points", requireStaff, async (request, response, next) => {
    try {
      const { customerId } = loyaltyCustomerParamsSchema.parse(request.params);
      response.json(await getLoyaltyPoints(customerId));
    } catch (error) {
      next(error);
    }
  });

  router.get("/loyalty/config/earning-rule", requireStaff, async (_request, response, next) => {
    try {
      response.json({ rule: await getActiveEarningRule() });
    } catch (error) {
      next(error);
    }
  });

  router.put("/loyalty/config/earning-rule", requireStaff, async (request, response, next) => {
    try {
      const staff = request.staff;
      if (!staff) throw new Error("Staff middleware did not attach staff.");
      response.json(await replaceActiveEarningRule(staff.id, loyaltyEarningRuleInputSchema.parse(request.body)));
    } catch (error) {
      next(error);
    }
  });

  router.patch("/loyalty/customers/:customerId", requireStaff, async (request, response, next) => {
    try {
      const { customerId } = loyaltyCustomerParamsSchema.parse(request.params);
      const customer = await updateLoyaltyCustomer(customerId, loyaltyCustomerUpdateSchema.parse(request.body));
      response.json(customer);
    } catch (error) {
      next(error);
    }
  });

  return router;
}
