import { randomBytes } from "node:crypto";

import type { Request, Response } from "express";
import { and, eq, gt } from "drizzle-orm";

import type { StaffUser } from "@coffee-shop/shared/domain/types";

import { db } from "../storage/db";
import { staffSessions, staffUsers } from "../storage/schema";

export const STAFF_SESSION_COOKIE = "staff_session";
export const SESSION_TTL_MS = 1000 * 60 * 60 * 12;

export interface StaffSession {
  id: string;
  staff: StaffUser;
  expiresAt: Date;
}

export function createSessionToken(): string {
  return randomBytes(32).toString("base64url");
}

export function getSessionCookie(request: Request): string | undefined {
  const cookies = request.cookies as Record<string, string | undefined> | undefined;
  return cookies?.[STAFF_SESSION_COOKIE];
}

export async function createStaffSession(staffId: string): Promise<{ token: string; expiresAt: Date }> {
  const token = createSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  await db.insert(staffSessions).values({
    id: token,
    staffId,
    expiresAt
  });

  return { token, expiresAt };
}

export function setSessionCookie(response: Response, token: string, expiresAt: Date): void {
  response.cookie(STAFF_SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    expires: expiresAt,
    path: "/"
  });
}

export function clearSessionCookie(response: Response): void {
  response.clearCookie(STAFF_SESSION_COOKIE, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/"
  });
}

export async function lookupStaffSession(token: string): Promise<StaffSession | null> {
  const now = new Date();
  const [row] = await db
    .select({
      sessionId: staffSessions.id,
      expiresAt: staffSessions.expiresAt,
      staffId: staffUsers.id,
      username: staffUsers.username,
      displayName: staffUsers.displayName,
      authorizationStatus: staffUsers.authorizationStatus
    })
    .from(staffSessions)
    .innerJoin(staffUsers, eq(staffSessions.staffId, staffUsers.id))
    .where(
      and(
        eq(staffSessions.id, token),
        gt(staffSessions.expiresAt, now),
        eq(staffUsers.authorizationStatus, "authorized")
      )
    )
    .limit(1);

  if (!row) {
    return null;
  }

  return {
    id: row.sessionId,
    expiresAt: row.expiresAt,
    staff: {
      id: row.staffId,
      username: row.username,
      displayName: row.displayName,
      authorizationStatus: row.authorizationStatus
    }
  };
}

export async function deleteStaffSession(token: string): Promise<void> {
  await db.delete(staffSessions).where(eq(staffSessions.id, token));
}
