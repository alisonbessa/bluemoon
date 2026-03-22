ALTER TABLE "waitlist" RENAME COLUMN "twitterAccount" TO "instagramAccount";
ALTER TABLE "waitlist" ADD COLUMN "betaTester" boolean DEFAULT false;
