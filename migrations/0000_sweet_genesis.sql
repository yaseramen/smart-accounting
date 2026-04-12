CREATE TABLE "accounts" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer,
	"code" varchar(20) NOT NULL,
	"name" text NOT NULL,
	"type" varchar(30) NOT NULL,
	"parent_id" integer,
	"level" integer DEFAULT 1 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"balance" numeric(15, 2) DEFAULT '0' NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer,
	"user_id" integer,
	"user_name" text NOT NULL,
	"action" varchar(20) NOT NULL,
	"table_name" varchar(50) NOT NULL,
	"record_id" integer,
	"details" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "branches" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"name" text NOT NULL,
	"code" varchar(20) NOT NULL,
	"address" text,
	"phone" varchar(20),
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "companies" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" varchar(50) NOT NULL,
	"tax_number" varchar(30),
	"commercial_registration" varchar(50),
	"address" text,
	"phone" varchar(20),
	"email" varchar(100),
	"wallet_balance" numeric(15, 2) DEFAULT '0' NOT NULL,
	"low_balance_threshold" numeric(15, 2) DEFAULT '20' NOT NULL,
	"custom_service_fee_rate" numeric(5, 4),
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "companies_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "customers" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer,
	"code" varchar(20) NOT NULL,
	"name" text NOT NULL,
	"phone" varchar(20),
	"email" varchar(100),
	"address" text,
	"tax_number" varchar(30),
	"balance" numeric(15, 2) DEFAULT '0' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "expenses" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"date" date NOT NULL,
	"amount" numeric(15, 2) NOT NULL,
	"description" text NOT NULL,
	"category" varchar(50) DEFAULT 'أخرى' NOT NULL,
	"account_id" integer,
	"treasury_account_id" integer,
	"journal_entry_id" integer,
	"created_by" integer,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "invoice_lines" (
	"id" serial PRIMARY KEY NOT NULL,
	"invoice_id" integer NOT NULL,
	"line_type" varchar(20) DEFAULT 'product' NOT NULL,
	"product_id" integer,
	"warehouse_id" integer,
	"quantity" numeric(15, 4) NOT NULL,
	"unit_id" integer,
	"unit_price" numeric(15, 2) NOT NULL,
	"description" text,
	"length" numeric(15, 4),
	"width" numeric(15, 4),
	"area" numeric(15, 4),
	"effective_quantity" numeric(15, 4) NOT NULL,
	"discount" numeric(15, 2) DEFAULT '0' NOT NULL,
	"tax_amount" numeric(15, 2) DEFAULT '0' NOT NULL,
	"total" numeric(15, 2) DEFAULT '0' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"branch_id" integer,
	"created_by" integer,
	"invoice_number" varchar(30) NOT NULL,
	"invoice_date" date NOT NULL,
	"type" varchar(20) NOT NULL,
	"customer_id" integer,
	"supplier_id" integer,
	"subtotal" numeric(15, 2) DEFAULT '0' NOT NULL,
	"discount_amount" numeric(15, 2) DEFAULT '0' NOT NULL,
	"discount_percent" numeric(5, 2) DEFAULT '0' NOT NULL,
	"tax_amount" numeric(15, 2) DEFAULT '0' NOT NULL,
	"tax_percent" numeric(5, 2) DEFAULT '0' NOT NULL,
	"service_fee" numeric(15, 2) DEFAULT '0' NOT NULL,
	"extra_costs" numeric(15, 2) DEFAULT '0' NOT NULL,
	"extra_costs_description" text,
	"total" numeric(15, 2) DEFAULT '0' NOT NULL,
	"paid_amount" numeric(15, 2) DEFAULT '0' NOT NULL,
	"payment_type" varchar(20) DEFAULT 'paid' NOT NULL,
	"payment_method" varchar(30) DEFAULT 'cash' NOT NULL,
	"status" varchar(20) DEFAULT 'draft' NOT NULL,
	"notes" text,
	"reference" varchar(50),
	"qr_data" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "journal_entries" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer,
	"branch_id" integer,
	"created_by" integer,
	"entry_number" varchar(20) NOT NULL,
	"entry_date" date NOT NULL,
	"description" text NOT NULL,
	"reference" varchar(50),
	"status" varchar(20) DEFAULT 'draft' NOT NULL,
	"total_debit" numeric(15, 2) DEFAULT '0' NOT NULL,
	"total_credit" numeric(15, 2) DEFAULT '0' NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "journal_entry_lines" (
	"id" serial PRIMARY KEY NOT NULL,
	"journal_entry_id" integer NOT NULL,
	"account_id" integer NOT NULL,
	"debit" numeric(15, 2) DEFAULT '0' NOT NULL,
	"credit" numeric(15, 2) DEFAULT '0' NOT NULL,
	"description" text
);
--> statement-breakpoint
CREATE TABLE "login_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"user_name" text NOT NULL,
	"company_id" integer,
	"action" varchar(20) NOT NULL,
	"ip_address" varchar(45),
	"user_agent" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"company_id" integer,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"type" varchar(20) DEFAULT 'info' NOT NULL,
	"is_read" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"invoice_id" integer NOT NULL,
	"amount" numeric(15, 2) NOT NULL,
	"payment_method" varchar(30) DEFAULT 'cash' NOT NULL,
	"payment_date" date NOT NULL,
	"notes" text,
	"created_by" integer,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "permissions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"page" varchar(50) NOT NULL,
	"can_view" boolean DEFAULT false NOT NULL,
	"can_create" boolean DEFAULT false NOT NULL,
	"can_edit" boolean DEFAULT false NOT NULL,
	"can_delete" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_components" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_id" integer NOT NULL,
	"component_product_id" integer NOT NULL,
	"quantity" numeric(15, 4) DEFAULT '1' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"name" text NOT NULL,
	"code" varchar(50) NOT NULL,
	"barcode" varchar(50),
	"category" varchar(100),
	"primary_unit_id" integer NOT NULL,
	"secondary_unit_id" integer,
	"conversion_factor" numeric(15, 4) DEFAULT '1',
	"has_dimensions" boolean DEFAULT false NOT NULL,
	"dimension_unit" varchar(10),
	"is_composite" boolean DEFAULT false NOT NULL,
	"current_stock" numeric(15, 4) DEFAULT '0' NOT NULL,
	"reorder_level" numeric(15, 4) DEFAULT '0' NOT NULL,
	"cost_price" numeric(15, 2) DEFAULT '0' NOT NULL,
	"sell_price" numeric(15, 2) DEFAULT '0' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "revenues" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"date" date NOT NULL,
	"amount" numeric(15, 2) NOT NULL,
	"description" text NOT NULL,
	"category" varchar(50) DEFAULT 'أخرى' NOT NULL,
	"account_id" integer,
	"treasury_account_id" integer,
	"journal_entry_id" integer,
	"created_by" integer,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "stock_transfer_lines" (
	"id" serial PRIMARY KEY NOT NULL,
	"transfer_id" integer NOT NULL,
	"product_id" integer NOT NULL,
	"quantity" numeric(15, 4) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stock_transfers" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"from_warehouse_id" integer NOT NULL,
	"to_warehouse_id" integer NOT NULL,
	"status" varchar(20) DEFAULT 'draft' NOT NULL,
	"notes" text,
	"created_by" integer,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "suppliers" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer,
	"code" varchar(20) NOT NULL,
	"name" text NOT NULL,
	"phone" varchar(20),
	"email" varchar(100),
	"address" text,
	"tax_number" varchar(30),
	"balance" numeric(15, 2) DEFAULT '0' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "support_tickets" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer,
	"user_id" integer NOT NULL,
	"user_name" text NOT NULL,
	"company_name" text,
	"subject" text NOT NULL,
	"message" text NOT NULL,
	"category" varchar(30) DEFAULT 'bug' NOT NULL,
	"status" varchar(20) DEFAULT 'open' NOT NULL,
	"admin_reply" text,
	"replied_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "system_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"service_fee_rate" numeric(5, 4) DEFAULT '0.0005' NOT NULL,
	"support_phone1" varchar(20) DEFAULT '01009376052' NOT NULL,
	"support_phone2" varchar(20) DEFAULT '01556660502' NOT NULL,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "units" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"name" text NOT NULL,
	"symbol" varchar(20) NOT NULL,
	"category" varchar(30)
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" varchar(50) NOT NULL,
	"password" text NOT NULL,
	"email" varchar(100),
	"full_name" text NOT NULL,
	"company_id" integer,
	"branch_id" integer,
	"role" varchar(20) DEFAULT 'user' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE "wallet_transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"amount" numeric(15, 2) NOT NULL,
	"type" varchar(20) NOT NULL,
	"description" text NOT NULL,
	"balance_before" numeric(15, 2) NOT NULL,
	"balance_after" numeric(15, 2) NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "warehouse_stock" (
	"id" serial PRIMARY KEY NOT NULL,
	"warehouse_id" integer NOT NULL,
	"product_id" integer NOT NULL,
	"quantity" numeric(15, 4) DEFAULT '0' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "warehouses" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"branch_id" integer,
	"name" text NOT NULL,
	"code" varchar(20) NOT NULL,
	"address" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE UNIQUE INDEX "account_company_code_idx" ON "accounts" USING btree ("company_id","code");--> statement-breakpoint
CREATE UNIQUE INDEX "branch_company_code_idx" ON "branches" USING btree ("company_id","code");--> statement-breakpoint
CREATE UNIQUE INDEX "customer_company_code_idx" ON "customers" USING btree ("company_id","code");--> statement-breakpoint
CREATE UNIQUE INDEX "customer_company_phone_idx" ON "customers" USING btree ("company_id","phone");--> statement-breakpoint
CREATE UNIQUE INDEX "invoice_company_number_idx" ON "invoices" USING btree ("company_id","invoice_number");--> statement-breakpoint
CREATE UNIQUE INDEX "entry_company_number_idx" ON "journal_entries" USING btree ("company_id","entry_number");--> statement-breakpoint
CREATE UNIQUE INDEX "permission_user_page_idx" ON "permissions" USING btree ("user_id","page");--> statement-breakpoint
CREATE UNIQUE INDEX "product_company_code_idx" ON "products" USING btree ("company_id","code");--> statement-breakpoint
CREATE UNIQUE INDEX "supplier_company_code_idx" ON "suppliers" USING btree ("company_id","code");--> statement-breakpoint
CREATE UNIQUE INDEX "supplier_company_phone_idx" ON "suppliers" USING btree ("company_id","phone");--> statement-breakpoint
CREATE UNIQUE INDEX "unit_company_name_idx" ON "units" USING btree ("company_id","name");--> statement-breakpoint
CREATE UNIQUE INDEX "warehouse_stock_idx" ON "warehouse_stock" USING btree ("warehouse_id","product_id");--> statement-breakpoint
CREATE UNIQUE INDEX "warehouse_company_code_idx" ON "warehouses" USING btree ("company_id","code");