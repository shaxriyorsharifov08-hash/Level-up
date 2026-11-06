CREATE TYPE "campus"."order_status" AS ENUM('active', 'used', 'cancelled');--> statement-breakpoint
CREATE TYPE "campus"."shop_item_kind" AS ENUM('merch', 'partner_voucher', 'ticket_voucher');--> statement-breakpoint
CREATE TYPE "campus"."token_reason" AS ENUM('event_attendance', 'task_completed', 'award', 'purchase', 'refund');--> statement-breakpoint
CREATE TABLE "campus"."shop_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"image_url" text,
	"kind" "campus"."shop_item_kind" DEFAULT 'merch' NOT NULL,
	"price_tokens" integer NOT NULL,
	"stock" integer,
	"discount_percent" integer,
	"partner_name" text,
	"active" boolean DEFAULT true NOT NULL,
	"created_by_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "campus"."shop_items" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "campus"."shop_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"item_id" uuid NOT NULL,
	"item_name" text NOT NULL,
	"kind" "campus"."shop_item_kind" NOT NULL,
	"price_tokens" integer NOT NULL,
	"discount_percent" integer,
	"partner_name" text,
	"code" text NOT NULL,
	"status" "campus"."order_status" DEFAULT 'active' NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "shop_orders_code_unique" UNIQUE("code")
);
--> statement-breakpoint
ALTER TABLE "campus"."shop_orders" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "campus"."token_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"amount" integer NOT NULL,
	"reason" "campus"."token_reason" NOT NULL,
	"description" text NOT NULL,
	"ref_id" uuid,
	"created_by_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "campus"."token_transactions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "campus"."event_registrations" ADD COLUMN "voucher_order_id" uuid;--> statement-breakpoint
ALTER TABLE "campus"."events" ADD COLUMN "ticket_price" integer;--> statement-breakpoint
ALTER TABLE "campus"."events" ADD COLUMN "token_reward" integer DEFAULT 10 NOT NULL;--> statement-breakpoint
ALTER TABLE "campus"."shop_items" ADD CONSTRAINT "shop_items_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "campus"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campus"."shop_orders" ADD CONSTRAINT "shop_orders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "campus"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campus"."shop_orders" ADD CONSTRAINT "shop_orders_item_id_shop_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "campus"."shop_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campus"."token_transactions" ADD CONSTRAINT "token_transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "campus"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campus"."token_transactions" ADD CONSTRAINT "token_transactions_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "campus"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "shop_orders_user_idx" ON "campus"."shop_orders" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "token_transactions_user_idx" ON "campus"."token_transactions" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "token_transactions_reason_ref_uq" ON "campus"."token_transactions" USING btree ("reason","ref_id");--> statement-breakpoint
ALTER TABLE "campus"."event_registrations" ADD CONSTRAINT "event_registrations_voucher_order_id_shop_orders_id_fk" FOREIGN KEY ("voucher_order_id") REFERENCES "campus"."shop_orders"("id") ON DELETE set null ON UPDATE no action;