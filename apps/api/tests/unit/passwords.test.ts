import { describe, expect, it } from "vitest";

import { hashPassword, verifyPassword } from "../../src/auth/passwords";

describe("password helpers", () => {
  it("hashes plaintext passwords and verifies only matching credentials", async () => {
    const hash = await hashPassword("barista-pass");

    expect(hash).not.toBe("barista-pass");
    await expect(verifyPassword("barista-pass", hash)).resolves.toBe(true);
    await expect(verifyPassword("wrong-pass", hash)).resolves.toBe(false);
  });
});
