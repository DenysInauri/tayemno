CREATE TABLE "folder_acls" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"folder_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"encrypted_folder_key" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "folder_acls_folder_id_user_id_unique" UNIQUE("folder_id","user_id")
);
--> statement-breakpoint
DROP TABLE "folder_members";--> statement-breakpoint
ALTER TABLE "folders" ADD COLUMN "wrapped_key" text;--> statement-breakpoint
ALTER TABLE "folders" ADD COLUMN "wrapped_key_nonce" text;--> statement-breakpoint
ALTER TABLE "vaults" ADD COLUMN "admin_encrypted_symmetric_key" text;--> statement-breakpoint
ALTER TABLE "folder_acls" ADD CONSTRAINT "folder_acls_folder_id_folders_id_fkey" FOREIGN KEY ("folder_id") REFERENCES "folders"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "folder_acls" ADD CONSTRAINT "folder_acls_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;