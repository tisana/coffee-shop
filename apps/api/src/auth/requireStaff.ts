import type { NextFunction, Request, Response } from "express";

import type { StaffUser } from "@coffee-shop/shared/domain/types";

import { unauthorized } from "../routes/errors";
import { getSessionCookie, lookupStaffSession } from "./sessions";

declare module "express-serve-static-core" {
  interface Request {
    staff?: StaffUser;
    sessionId?: string;
  }
}

export async function requireStaff(
  request: Request,
  _response: Response,
  next: NextFunction
): Promise<void> {
  try {
    const token = getSessionCookie(request);

    if (!token) {
      throw unauthorized();
    }

    const session = await lookupStaffSession(token);

    if (!session) {
      throw unauthorized();
    }

    request.staff = session.staff;
    request.sessionId = session.id;
    next();
  } catch (error) {
    next(error);
  }
}
