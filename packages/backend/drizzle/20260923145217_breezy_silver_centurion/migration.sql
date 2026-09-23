ALTER TABLE "pending_registrations" DROP CONSTRAINT "pending_registrations_username_key";--> statement-breakpoint
ALTER TABLE "users" DROP CONSTRAINT "users_username_key";--> statement-breakpoint
ALTER TABLE "pending_registrations" DROP COLUMN "username";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "username";--> statement-breakpoint
ALTER TABLE "vaults" DROP COLUMN "encrypted_name";