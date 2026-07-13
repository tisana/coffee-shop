CREATE TYPE "public"."loyalty_earning_type" AS ENUM('purchase_amount', 'beverage_count');--> statement-breakpoint
CREATE TYPE "public"."loyalty_point_event_type" AS ENUM('earned', 'redeemed', 'returned', 'expired', 'adjusted');--> statement-breakpoint
CREATE TYPE "public"."loyalty_redemption_status" AS ENUM('active', 'returned');--> statement-breakpoint
CREATE TYPE "public"."loyalty_reward_benefit_type" AS ENUM('free_beverage', 'size_upgrade');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "loyalty_customers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(120) NOT NULL,
	"phone_display" varchar(40) NOT NULL,
	"phone_normalized" varchar(16) NOT NULL,
	"email" varchar(254),
	"enrolled_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "loyalty_customers_phone_normalized_e164" CHECK ("loyalty_customers"."phone_normalized" ~ '^\+[1-9][0-9]{1,14}$')
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "loyalty_earning_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"earning_type" "loyalty_earning_type" NOT NULL,
	"amount_threshold" numeric(10, 2),
	"beverage_count_threshold" integer,
	"points_awarded" integer NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"effective_at" timestamp with time zone DEFAULT now() NOT NULL,
	"retired_at" timestamp with time zone,
	"created_by_staff_id" uuid NOT NULL,
	CONSTRAINT "loyalty_earning_rules_positive_points" CHECK ("loyalty_earning_rules"."points_awarded" > 0),
	CONSTRAINT "loyalty_earning_rules_threshold_matches_type" CHECK ((
      "loyalty_earning_rules"."earning_type" = 'purchase_amount'
      AND "loyalty_earning_rules"."amount_threshold" IS NOT NULL
      AND "loyalty_earning_rules"."amount_threshold" > 0
      AND "loyalty_earning_rules"."beverage_count_threshold" IS NULL
    ) OR (
      "loyalty_earning_rules"."earning_type" = 'beverage_count'
      AND "loyalty_earning_rules"."amount_threshold" IS NULL
      AND "loyalty_earning_rules"."beverage_count_threshold" IS NOT NULL
      AND "loyalty_earning_rules"."beverage_count_threshold" > 0
    )),
	CONSTRAINT "loyalty_earning_rules_active_not_retired" CHECK (NOT "loyalty_earning_rules"."active" OR "loyalty_earning_rules"."retired_at" IS NULL)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "loyalty_expiration_policies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"enabled" boolean NOT NULL,
	"expiration_months" integer,
	"active" boolean DEFAULT true NOT NULL,
	"effective_at" timestamp with time zone DEFAULT now() NOT NULL,
	"retired_at" timestamp with time zone,
	"created_by_staff_id" uuid NOT NULL,
	CONSTRAINT "loyalty_expiration_policies_enabled_months" CHECK (("loyalty_expiration_policies"."enabled" AND "loyalty_expiration_policies"."expiration_months" IS NOT NULL AND "loyalty_expiration_policies"."expiration_months" > 0)
      OR (NOT "loyalty_expiration_policies"."enabled" AND "loyalty_expiration_policies"."expiration_months" IS NULL)),
	CONSTRAINT "loyalty_expiration_policies_active_not_retired" CHECK (NOT "loyalty_expiration_policies"."active" OR "loyalty_expiration_policies"."retired_at" IS NULL)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "loyalty_order_associations" (
	"order_id" uuid PRIMARY KEY NOT NULL,
	"customer_id" uuid NOT NULL,
	"associated_by_staff_id" uuid NOT NULL,
	"associated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "loyalty_point_allocations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_id" uuid NOT NULL,
	"credit_entry_id" uuid NOT NULL,
	"debit_entry_id" uuid NOT NULL,
	"points" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "loyalty_point_allocations_positive_points" CHECK ("loyalty_point_allocations"."points" > 0),
	CONSTRAINT "loyalty_point_allocations_distinct_entries" CHECK ("loyalty_point_allocations"."credit_entry_id" <> "loyalty_point_allocations"."debit_entry_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "loyalty_point_ledger_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_id" uuid NOT NULL,
	"event_type" "loyalty_point_event_type" NOT NULL,
	"points_delta" integer NOT NULL,
	"order_id" uuid,
	"reward_redemption_id" uuid,
	"earning_rule_id" uuid,
	"expiration_policy_id" uuid,
	"earned_business_date" date,
	"expiration_business_date" date,
	"reason" varchar(500) NOT NULL,
	"created_by_staff_id" uuid,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "loyalty_point_ledger_entries_non_zero_delta" CHECK ("loyalty_point_ledger_entries"."points_delta" <> 0),
	CONSTRAINT "loyalty_point_ledger_entries_event_sign" CHECK ((
      "loyalty_point_ledger_entries"."event_type" IN ('earned', 'returned')
      AND "loyalty_point_ledger_entries"."points_delta" > 0
    ) OR (
      "loyalty_point_ledger_entries"."event_type" IN ('redeemed', 'expired')
      AND "loyalty_point_ledger_entries"."points_delta" < 0
    ) OR "loyalty_point_ledger_entries"."event_type" = 'adjusted'),
	CONSTRAINT "loyalty_point_ledger_entries_positive_credit_business_date" CHECK ("loyalty_point_ledger_entries"."event_type" NOT IN ('earned', 'returned') OR "loyalty_point_ledger_entries"."earned_business_date" IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "loyalty_reward_options" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(120) NOT NULL,
	"points_cost" integer NOT NULL,
	"benefit_type" "loyalty_reward_benefit_type" NOT NULL,
	"benefit_description" varchar(500) NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"effective_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by_staff_id" uuid NOT NULL,
	"updated_by_staff_id" uuid NOT NULL,
	CONSTRAINT "loyalty_reward_options_positive_points_cost" CHECK ("loyalty_reward_options"."points_cost" > 0),
	CONSTRAINT "loyalty_reward_options_non_blank_name" CHECK (length(trim("loyalty_reward_options"."name")) > 0),
	CONSTRAINT "loyalty_reward_options_non_blank_description" CHECK (length(trim("loyalty_reward_options"."benefit_description")) > 0)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "loyalty_reward_redemptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"customer_id" uuid NOT NULL,
	"reward_option_id" uuid NOT NULL,
	"target_order_beverage_id" uuid NOT NULL,
	"target_customization_choice_id" uuid,
	"reward_name_snapshot" varchar(120) NOT NULL,
	"points_cost_snapshot" integer NOT NULL,
	"benefit_type_snapshot" "loyalty_reward_benefit_type" NOT NULL,
	"benefit_description_snapshot" varchar(500) NOT NULL,
	"target_description_snapshot" varchar(500) NOT NULL,
	"covered_amount_snapshot" numeric(10, 2) DEFAULT '0.00' NOT NULL,
	"covered_beverage_quantity" integer DEFAULT 0 NOT NULL,
	"status" "loyalty_redemption_status" DEFAULT 'active' NOT NULL,
	"redeemed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"returned_at" timestamp with time zone,
	"returned_reason" text,
	"redeemed_by_staff_id" uuid NOT NULL,
	"returned_by_staff_id" uuid,
	CONSTRAINT "loyalty_reward_redemptions_positive_points_cost" CHECK ("loyalty_reward_redemptions"."points_cost_snapshot" > 0),
	CONSTRAINT "loyalty_reward_redemptions_non_negative_coverage" CHECK ("loyalty_reward_redemptions"."covered_amount_snapshot" >= 0),
	CONSTRAINT "loyalty_reward_redemptions_benefit_target_consistency" CHECK ((
      "loyalty_reward_redemptions"."benefit_type_snapshot" = 'free_beverage'
      AND "loyalty_reward_redemptions"."target_customization_choice_id" IS NULL
      AND "loyalty_reward_redemptions"."covered_beverage_quantity" = 1
    ) OR (
      "loyalty_reward_redemptions"."benefit_type_snapshot" = 'size_upgrade'
      AND "loyalty_reward_redemptions"."target_customization_choice_id" IS NOT NULL
      AND "loyalty_reward_redemptions"."covered_beverage_quantity" = 0
    )),
	CONSTRAINT "loyalty_reward_redemptions_returned_status_consistency" CHECK ((
      "loyalty_reward_redemptions"."status" = 'active'
      AND "loyalty_reward_redemptions"."returned_at" IS NULL
      AND "loyalty_reward_redemptions"."returned_by_staff_id" IS NULL
    ) OR (
      "loyalty_reward_redemptions"."status" = 'returned'
      AND "loyalty_reward_redemptions"."returned_at" IS NOT NULL
      AND "loyalty_reward_redemptions"."returned_by_staff_id" IS NOT NULL
    ))
);
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "loyalty_reward_discount_total" numeric(10, 2);--> statement-breakpoint
UPDATE "orders"
SET "loyalty_reward_discount_total" = '0.00'
WHERE "loyalty_reward_discount_total" IS NULL;--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "loyalty_reward_discount_total" SET DEFAULT '0.00';--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "loyalty_reward_discount_total" SET NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "loyalty_point_ledger_entries_id_customer_unique" ON "loyalty_point_ledger_entries" USING btree ("id","customer_id");--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "loyalty_earning_rules" ADD CONSTRAINT "loyalty_earning_rules_created_by_staff_id_staff_users_id_fk" FOREIGN KEY ("created_by_staff_id") REFERENCES "public"."staff_users"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "loyalty_expiration_policies" ADD CONSTRAINT "loyalty_expiration_policies_created_by_staff_id_staff_users_id_fk" FOREIGN KEY ("created_by_staff_id") REFERENCES "public"."staff_users"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "loyalty_order_associations" ADD CONSTRAINT "loyalty_order_associations_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "loyalty_order_associations" ADD CONSTRAINT "loyalty_order_associations_customer_id_loyalty_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."loyalty_customers"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "loyalty_order_associations" ADD CONSTRAINT "loyalty_order_associations_associated_by_staff_id_staff_users_id_fk" FOREIGN KEY ("associated_by_staff_id") REFERENCES "public"."staff_users"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "loyalty_point_allocations" ADD CONSTRAINT "loyalty_point_allocations_credit_entry_customer_fk" FOREIGN KEY ("credit_entry_id","customer_id") REFERENCES "public"."loyalty_point_ledger_entries"("id","customer_id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "loyalty_point_allocations" ADD CONSTRAINT "loyalty_point_allocations_debit_entry_customer_fk" FOREIGN KEY ("debit_entry_id","customer_id") REFERENCES "public"."loyalty_point_ledger_entries"("id","customer_id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "loyalty_point_ledger_entries" ADD CONSTRAINT "loyalty_point_ledger_entries_customer_id_loyalty_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."loyalty_customers"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "loyalty_point_ledger_entries" ADD CONSTRAINT "loyalty_point_ledger_entries_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "loyalty_point_ledger_entries" ADD CONSTRAINT "loyalty_point_ledger_entries_reward_redemption_id_loyalty_reward_redemptions_id_fk" FOREIGN KEY ("reward_redemption_id") REFERENCES "public"."loyalty_reward_redemptions"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "loyalty_point_ledger_entries" ADD CONSTRAINT "loyalty_point_ledger_entries_earning_rule_id_loyalty_earning_rules_id_fk" FOREIGN KEY ("earning_rule_id") REFERENCES "public"."loyalty_earning_rules"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "loyalty_point_ledger_entries" ADD CONSTRAINT "loyalty_point_ledger_entries_expiration_policy_id_loyalty_expiration_policies_id_fk" FOREIGN KEY ("expiration_policy_id") REFERENCES "public"."loyalty_expiration_policies"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "loyalty_point_ledger_entries" ADD CONSTRAINT "loyalty_point_ledger_entries_created_by_staff_id_staff_users_id_fk" FOREIGN KEY ("created_by_staff_id") REFERENCES "public"."staff_users"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "loyalty_reward_options" ADD CONSTRAINT "loyalty_reward_options_created_by_staff_id_staff_users_id_fk" FOREIGN KEY ("created_by_staff_id") REFERENCES "public"."staff_users"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "loyalty_reward_options" ADD CONSTRAINT "loyalty_reward_options_updated_by_staff_id_staff_users_id_fk" FOREIGN KEY ("updated_by_staff_id") REFERENCES "public"."staff_users"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "loyalty_reward_redemptions" ADD CONSTRAINT "loyalty_reward_redemptions_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "loyalty_reward_redemptions" ADD CONSTRAINT "loyalty_reward_redemptions_customer_id_loyalty_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."loyalty_customers"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "loyalty_reward_redemptions" ADD CONSTRAINT "loyalty_reward_redemptions_reward_option_id_loyalty_reward_options_id_fk" FOREIGN KEY ("reward_option_id") REFERENCES "public"."loyalty_reward_options"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "loyalty_reward_redemptions" ADD CONSTRAINT "loyalty_reward_redemptions_target_order_beverage_id_order_beverages_id_fk" FOREIGN KEY ("target_order_beverage_id") REFERENCES "public"."order_beverages"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "loyalty_reward_redemptions" ADD CONSTRAINT "loyalty_reward_redemptions_target_customization_choice_id_customization_choices_id_fk" FOREIGN KEY ("target_customization_choice_id") REFERENCES "public"."customization_choices"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "loyalty_reward_redemptions" ADD CONSTRAINT "loyalty_reward_redemptions_redeemed_by_staff_id_staff_users_id_fk" FOREIGN KEY ("redeemed_by_staff_id") REFERENCES "public"."staff_users"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "loyalty_reward_redemptions" ADD CONSTRAINT "loyalty_reward_redemptions_returned_by_staff_id_staff_users_id_fk" FOREIGN KEY ("returned_by_staff_id") REFERENCES "public"."staff_users"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "loyalty_customers_phone_normalized_unique" ON "loyalty_customers" USING btree ("phone_normalized");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "loyalty_customers_name_idx" ON "loyalty_customers" USING btree ("name");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "loyalty_earning_rules_one_active_unique" ON "loyalty_earning_rules" USING btree ("active") WHERE "loyalty_earning_rules"."active" = true;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "loyalty_earning_rules_active_idx" ON "loyalty_earning_rules" USING btree ("active");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "loyalty_expiration_policies_one_active_unique" ON "loyalty_expiration_policies" USING btree ("active") WHERE "loyalty_expiration_policies"."active" = true;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "loyalty_expiration_policies_active_idx" ON "loyalty_expiration_policies" USING btree ("active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "loyalty_order_associations_customer_id_idx" ON "loyalty_order_associations" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "loyalty_point_allocations_customer_id_idx" ON "loyalty_point_allocations" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "loyalty_point_allocations_credit_entry_id_idx" ON "loyalty_point_allocations" USING btree ("credit_entry_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "loyalty_point_allocations_debit_entry_id_idx" ON "loyalty_point_allocations" USING btree ("debit_entry_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "loyalty_point_allocations_debit_credit_unique" ON "loyalty_point_allocations" USING btree ("debit_entry_id","credit_entry_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "loyalty_point_ledger_entries_customer_occurred_at_idx" ON "loyalty_point_ledger_entries" USING btree ("customer_id","occurred_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "loyalty_point_ledger_entries_expiration_business_date_idx" ON "loyalty_point_ledger_entries" USING btree ("customer_id","expiration_business_date");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "loyalty_point_ledger_entries_earned_order_unique" ON "loyalty_point_ledger_entries" USING btree ("order_id") WHERE "loyalty_point_ledger_entries"."event_type" = 'earned';--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "loyalty_point_ledger_entries_adjusted_order_unique" ON "loyalty_point_ledger_entries" USING btree ("order_id") WHERE "loyalty_point_ledger_entries"."event_type" = 'adjusted' AND "loyalty_point_ledger_entries"."order_id" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "loyalty_point_ledger_entries_redeemed_reward_unique" ON "loyalty_point_ledger_entries" USING btree ("reward_redemption_id") WHERE "loyalty_point_ledger_entries"."event_type" = 'redeemed' AND "loyalty_point_ledger_entries"."reward_redemption_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "loyalty_reward_options_active_idx" ON "loyalty_reward_options" USING btree ("active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "loyalty_reward_redemptions_order_id_idx" ON "loyalty_reward_redemptions" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "loyalty_reward_redemptions_customer_id_idx" ON "loyalty_reward_redemptions" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "loyalty_reward_redemptions_active_target_idx" ON "loyalty_reward_redemptions" USING btree ("target_order_beverage_id") WHERE "loyalty_reward_redemptions"."status" = 'active';--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_loyalty_reward_discount_bounds" CHECK ("orders"."loyalty_reward_discount_total" >= 0 AND "orders"."loyalty_reward_discount_total" <= "orders"."total");
