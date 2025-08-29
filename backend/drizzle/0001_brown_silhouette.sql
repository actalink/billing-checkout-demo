CREATE TABLE "checkout_session" (
	"id" text PRIMARY KEY NOT NULL,
	"billing_checkout_id" text,
	"billing_order_id" text,
	"status" varchar
);
