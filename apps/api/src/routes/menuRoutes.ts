import { Router } from "express";

import { requireStaff } from "../auth/requireStaff";
import { listMenuCategoriesForOrderTaking } from "../domain/menuService";
import { notImplementedHandler } from "./errors";

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

  router.post("/menu/items", requireStaff, notImplementedHandler);
  router.patch("/menu/items/:itemId", requireStaff, notImplementedHandler);

  return router;
}
