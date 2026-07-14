DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM loyalty_customers
    WHERE NULLIF(btrim(email), '') IS NOT NULL
    GROUP BY lower(NULLIF(btrim(email), ''))
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'Cannot create loyalty email identity index: duplicate case-insensitive email values exist.';
  END IF;
END $$;
--> statement-breakpoint
UPDATE loyalty_customers
SET email = NULLIF(btrim(email), '')
WHERE email IS NOT NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "loyalty_customers_email_ci_unique"
  ON "loyalty_customers" USING btree (lower("email"))
  WHERE "email" IS NOT NULL;
