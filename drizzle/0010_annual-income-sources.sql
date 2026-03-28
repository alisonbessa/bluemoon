-- Add monthOfYear field to income_sources for annual frequency support
ALTER TABLE "income_sources" ADD COLUMN "month_of_year" integer;
