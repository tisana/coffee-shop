import "dotenv/config";
import { migrate } from "drizzle-orm/node-postgres/migrator";

import { closeDatabase, db } from "./db";

async function runMigrations(): Promise<void> {
  await migrate(db, { migrationsFolder: "drizzle/migrations" });
}

runMigrations()
  .then(async () => {
    await closeDatabase();
    console.warn("Database migrations completed.");
  })
  .catch(async (error: unknown) => {
    await closeDatabase();
    console.error("Database migration failed.", error);
    process.exitCode = 1;
  });
