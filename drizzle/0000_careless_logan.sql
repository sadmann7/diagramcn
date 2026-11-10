CREATE TABLE "diagramcn_blobs" (
	"hash" varchar(64) PRIMARY KEY NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "diagramcn_items" (
	"id" varchar(30) PRIMARY KEY NOT NULL,
	"specifier" varchar(512) NOT NULL,
	"namespace" varchar(128),
	"name" varchar(256) NOT NULL,
	"url" text,
	"latest_hash" varchar(64),
	"last_checked_at" timestamp,
	"last_changed_at" timestamp,
	"last_error" text,
	"failure_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT current_timestamp,
	CONSTRAINT "diagramcn_items_specifier_unique" UNIQUE("specifier")
);
--> statement-breakpoint
CREATE TABLE "diagramcn_snapshots" (
	"id" varchar(30) PRIMARY KEY NOT NULL,
	"item_id" varchar(30) NOT NULL,
	"hash" varchar(64) NOT NULL,
	"item" jsonb NOT NULL,
	"fetched_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "diagramcn_snapshots" ADD CONSTRAINT "diagramcn_snapshots_item_id_diagramcn_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."diagramcn_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "diagramcn_items_last_checked_at_idx" ON "diagramcn_items" USING btree ("last_checked_at");--> statement-breakpoint
CREATE INDEX "diagramcn_items_namespace_idx" ON "diagramcn_items" USING btree ("namespace");--> statement-breakpoint
CREATE INDEX "diagramcn_snapshots_item_id_fetched_at_idx" ON "diagramcn_snapshots" USING btree ("item_id","fetched_at");