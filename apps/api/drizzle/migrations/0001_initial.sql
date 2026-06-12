CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TYPE staff_authorization_status AS ENUM ('authorized', 'inactive');
CREATE TYPE order_status AS ENUM ('created', 'queued', 'in_progress', 'completed', 'picked_up', 'cancelled');
CREATE TYPE beverage_status AS ENUM ('pending', 'completed', 'cancelled');

CREATE TABLE staff_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username varchar(80) NOT NULL,
  password_hash text NOT NULL,
  display_name varchar(120) NOT NULL,
  authorization_status staff_authorization_status NOT NULL DEFAULT 'authorized',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX staff_users_username_unique ON staff_users (username);

CREATE TABLE staff_sessions (
  id text PRIMARY KEY,
  staff_id uuid NOT NULL REFERENCES staff_users (id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX staff_sessions_staff_id_idx ON staff_sessions (staff_id);
CREATE INDEX staff_sessions_expires_at_idx ON staff_sessions (expires_at);

CREATE TABLE menu_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(120) NOT NULL,
  display_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE menu_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES menu_categories (id) ON DELETE RESTRICT,
  name varchar(160) NOT NULL,
  description text,
  price numeric(10, 2) NOT NULL,
  available boolean NOT NULL DEFAULT true,
  active boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX menu_items_category_id_idx ON menu_items (category_id);

CREATE TABLE customization_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_item_id uuid NOT NULL REFERENCES menu_items (id) ON DELETE CASCADE,
  name varchar(120) NOT NULL,
  required boolean NOT NULL DEFAULT false,
  min_selections integer NOT NULL DEFAULT 0,
  max_selections integer NOT NULL DEFAULT 1,
  display_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT customization_groups_selection_bounds CHECK (
    min_selections >= 0 AND max_selections >= min_selections AND (required OR min_selections = 0)
  )
);

CREATE INDEX customization_groups_menu_item_id_idx ON customization_groups (menu_item_id);

CREATE TABLE customization_choices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customization_group_id uuid NOT NULL REFERENCES customization_groups (id) ON DELETE CASCADE,
  name varchar(120) NOT NULL,
  price_adjustment numeric(10, 2) NOT NULL DEFAULT 0.00,
  available boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX customization_choices_group_id_idx ON customization_choices (customization_group_id);

CREATE TABLE orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_date date NOT NULL,
  daily_order_number integer NOT NULL,
  pickup_name varchar(120),
  status order_status NOT NULL DEFAULT 'created',
  created_by_staff_id uuid NOT NULL REFERENCES staff_users (id) ON DELETE RESTRICT,
  assigned_barista_id uuid REFERENCES staff_users (id) ON DELETE SET NULL,
  total numeric(10, 2) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  queued_at timestamptz,
  in_progress_at timestamptz,
  completed_at timestamptz,
  picked_up_at timestamptz,
  cancelled_at timestamptz
);

CREATE UNIQUE INDEX orders_business_date_daily_number_unique ON orders (business_date, daily_order_number);
CREATE INDEX orders_status_idx ON orders (status);
CREATE INDEX orders_business_date_idx ON orders (business_date);

CREATE TABLE order_beverages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
  source_menu_item_id uuid NOT NULL REFERENCES menu_items (id) ON DELETE RESTRICT,
  name_snapshot varchar(160) NOT NULL,
  quantity integer NOT NULL,
  price_snapshot numeric(10, 2) NOT NULL,
  selected_customizations_snapshot jsonb NOT NULL DEFAULT '[]'::jsonb,
  special_instructions text,
  status beverage_status NOT NULL DEFAULT 'pending',
  completed_at timestamptz,
  cancelled_at timestamptz,
  cancellation_reason text,
  CONSTRAINT order_beverages_quantity_positive CHECK (quantity > 0)
);

CREATE INDEX order_beverages_order_id_idx ON order_beverages (order_id);

CREATE TABLE daily_order_sequences (
  business_date date PRIMARY KEY,
  last_issued_number integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);
