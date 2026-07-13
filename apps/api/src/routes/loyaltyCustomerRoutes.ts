import { Router } from "express";

import { requireStaff } from "../auth/requireStaff";
import {
  createLoyaltyCustomer,
  getLoyaltyCustomer,
  searchLoyaltyCustomers,
  updateLoyaltyCustomer
} from "../domain/loyaltyCustomerService";
import {
  loyaltyCustomerInputSchema,
  loyaltyCustomerParamsSchema,
  loyaltyCustomerSearchQuerySchema,
  loyaltyCustomerUpdateSchema
} from "./validators";

export function createLoyaltyCustomerRoutes(): Router {
  const router = Router();

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
