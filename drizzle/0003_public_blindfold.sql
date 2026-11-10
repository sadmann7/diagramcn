CREATE TABLE "diagramcn_rate_limits" (
	"key" varchar(128) PRIMARY KEY NOT NULL,
	"count" integer NOT NULL,
	"reset_at" timestamp NOT NULL
);
