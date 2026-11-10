ALTER TABLE "diagramcn_items" ADD COLUMN "backfilled_at" timestamp;--> statement-breakpoint
ALTER TABLE "diagramcn_snapshots" ADD COLUMN "origin" varchar(16) DEFAULT 'crawl' NOT NULL;--> statement-breakpoint
ALTER TABLE "diagramcn_snapshots" ADD COLUMN "commit_sha" varchar(40);