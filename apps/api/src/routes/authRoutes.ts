import { Router } from "express";
import rateLimit from "express-rate-limit";
import { eq } from "drizzle-orm";

import { requireStaff } from "../auth/requireStaff";
import {
  clearSessionCookie,
  createStaffSession,
  deleteStaffSession,
  setSessionCookie
} from "../auth/sessions";
import { verifyPassword } from "../auth/passwords";
import { db } from "../storage/db";
import { staffUsers } from "../storage/schema";
import { sendApiError, tooManyRequests, unauthorized } from "./errors";
import { loginRequestSchema } from "./validators";

const loginRateLimit = rateLimit({
  windowMs: 60_000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_request, response) => {
    sendApiError(response, tooManyRequests("Too many login attempts. Try again later."));
  }
});

export function createAuthRoutes(): Router {
  const router = Router();

  router.get("/auth/csrf-token", (request, response) => {
    response.json({ csrfToken: request.csrfToken() });
  });

  router.post("/auth/login", loginRateLimit, async (request, response, next) => {
    try {
      const body = loginRequestSchema.parse(request.body);
      const [staff] = await db
        .select()
        .from(staffUsers)
        .where(eq(staffUsers.username, body.username))
        .limit(1);

      if (
        !staff ||
        staff.authorizationStatus !== "authorized" ||
        !(await verifyPassword(body.password, staff.passwordHash))
      ) {
        throw unauthorized("Invalid username or password.");
      }

      const session = await createStaffSession(staff.id);
      setSessionCookie(response, session.token, session.expiresAt);
      response.sendStatus(204);
    } catch (error) {
      next(error);
    }
  });

  router.post("/auth/logout", requireStaff, async (request, response, next) => {
    try {
      if (request.sessionId) {
        await deleteStaffSession(request.sessionId);
      }

      clearSessionCookie(response);
      response.sendStatus(204);
    } catch (error) {
      next(error);
    }
  });

  router.get("/staff/session", requireStaff, (request, response) => {
    response.json(request.staff);
  });

  return router;
}
