import { Router } from "express";

import { requireStaff } from "../auth/requireStaff";
import { createMenuItem, retireMenuItem, updateMenuItem } from "../domain/menuMaintenanceService";
import { listMenuCategoriesForOrderTaking } from "../domain/menuService";
import { menuItemInputSchema, menuItemParamsSchema, menuItemUpdateInputSchema } from "./validators";

export function createMenuRoutes(): Router {
  const router = Router();

  router.get("/menu/categories", requireStaff, async (_request, response, next) => {
    try {
      const categories = await listMenuCategoriesForOrderTaking();
      response.json({ categories });
    } catch (error) {
      next(error);
    }
  });

  router.post("/menu/items", requireStaff, async (request, response, next) => {
    try {
      const body = menuItemInputSchema.parse(request.body);
      const item = await createMenuItem(body);
      response.status(201).json(item);
    } catch (error) {
      next(error);
    }
  });

  router.patch("/menu/items/:itemId", requireStaff, async (request, response, next) => {
    try {
      const { itemId } = menuItemParamsSchema.parse(request.params);
      const body = menuItemUpdateInputSchema.parse(request.body);
      const item = await updateMenuItem(itemId, body);
      response.json(item);
    } catch (error) {
      next(error);
    }
  });

  router.delete("/menu/items/:itemId", requireStaff, async (request, response, next) => {
    try {
      const { itemId } = menuItemParamsSchema.parse(request.params);
      const item = await retireMenuItem(itemId);
      response.json(item);
    } catch (error) {
      next(error);
    }
  });

  return router;
}
