ALTER TABLE "diagramcn_items" DROP CONSTRAINT "diagramcn_items_specifier_unique";--> statement-breakpoint
ALTER TABLE "diagramcn_items" ADD COLUMN "style" varchar(32) DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "diagramcn_stacks" ADD COLUMN "style" varchar(32);--> statement-breakpoint
-- Everything tracked so far in @shadcn was the default style.
UPDATE "diagramcn_items" SET "style" = 'new-york-v4' WHERE "namespace" = '@shadcn';--> statement-breakpoint
CREATE UNIQUE INDEX "diagramcn_items_specifier_style_idx" ON "diagramcn_items" USING btree ("specifier","style");