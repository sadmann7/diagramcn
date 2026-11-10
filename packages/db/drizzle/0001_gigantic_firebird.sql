CREATE TABLE "diagramcn_stacks" (
	"id" varchar(30) PRIMARY KEY NOT NULL,
	"hash" varchar(64) NOT NULL,
	"specifiers" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "diagramcn_stacks_hash_unique" UNIQUE("hash")
);
