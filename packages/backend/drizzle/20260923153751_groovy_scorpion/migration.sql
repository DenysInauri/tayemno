CREATE TABLE "workspace_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"workspace_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"encrypted_private_key" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "workspace_members_workspace_id_user_id_unique" UNIQUE("workspace_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "workspaces" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"name" varchar(255) NOT NULL,
	"public_key" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "folders" DROP CONSTRAINT "folders_owner_id_users_id_fkey";--> statement-breakpoint
ALTER TABLE "vaults" DROP CONSTRAINT "vaults_owner_id_users_id_fkey";--> statement-breakpoint
DROP TABLE "folder_key_shares";--> statement-breakpoint
DROP TABLE "vault_key_shares";--> statement-breakpoint
ALTER TABLE "folders" ADD COLUMN "workspace_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "folders" ADD COLUMN "encrypted_symmetric_key" text NOT NULL;--> statement-breakpoint
ALTER TABLE "pending_registrations" ADD COLUMN "workspace_name" varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE "pending_registrations" ADD COLUMN "workspace_public_key" text NOT NULL;--> statement-breakpoint
ALTER TABLE "pending_registrations" ADD COLUMN "encrypted_workspace_private_key" text NOT NULL;--> statement-breakpoint
ALTER TABLE "vaults" ADD COLUMN "workspace_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "folders" DROP COLUMN "owner_id";--> statement-breakpoint
ALTER TABLE "vaults" DROP COLUMN "owner_id";--> statement-breakpoint
ALTER TABLE "vaults" ALTER COLUMN "symmetric_key" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "folders" ADD CONSTRAINT "folders_workspace_id_workspaces_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "vaults" ADD CONSTRAINT "vaults_workspace_id_workspaces_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_workspace_id_workspaces_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;