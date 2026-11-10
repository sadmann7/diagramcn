-- Stacks saved before styles were stored used the old default, new-york-v4.
-- The default is now base-nova, so record theirs explicitly.
UPDATE "diagramcn_stacks" SET "style" = 'new-york-v4' WHERE "style" IS NULL;
