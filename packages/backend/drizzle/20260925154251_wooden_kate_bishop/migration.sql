ALTER TABLE "pending_registrations" ADD COLUMN "workspace_admin_public_key" text NOT NULL;--> statement-breakpoint
ALTER TABLE "pending_registrations" ADD COLUMN "workspace_member_public_key" text NOT NULL;--> statement-breakpoint
ALTER TABLE "pending_registrations" ADD COLUMN "encrypted_workspace_admin_private_key" text NOT NULL;--> statement-breakpoint
ALTER TABLE "pending_registrations" ADD COLUMN "encrypted_workspace_member_private_key" text NOT NULL;--> statement-breakpoint
ALTER TABLE "vaults" ADD COLUMN "encrypted_symmetric_key" text NOT NULL;--> statement-breakpoint
ALTER TABLE "vaults" ADD COLUMN "symmetric_key_nonce" text;--> statement-breakpoint
ALTER TABLE "workspace_members" ADD COLUMN "role" varchar(32) NOT NULL;--> statement-breakpoint
ALTER TABLE "workspace_members" ADD COLUMN "encrypted_admin_private_key" text;--> statement-breakpoint
ALTER TABLE "workspace_members" ADD COLUMN "encrypted_member_private_key" text NOT NULL;--> statement-breakpoint
ALTER TABLE "workspaces" ADD COLUMN "admin_public_key" text NOT NULL;--> statement-breakpoint
ALTER TABLE "workspaces" ADD COLUMN "member_public_key" text NOT NULL;--> statement-breakpoint
ALTER TABLE "pending_registrations" DROP COLUMN "workspace_public_key";--> statement-breakpoint
ALTER TABLE "pending_registrations" DROP COLUMN "encrypted_workspace_private_key";--> statement-breakpoint
ALTER TABLE "vaults" DROP COLUMN "symmetric_key";--> statement-breakpoint
ALTER TABLE "workspace_members" DROP COLUMN "encrypted_private_key";--> statement-breakpoint
ALTER TABLE "workspaces" DROP COLUMN "public_key";