CREATE TABLE "folder_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"folder_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"encrypted_symmetric_key" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "folder_members_folder_id_user_id_unique" UNIQUE("folder_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "folder_members" ADD CONSTRAINT "folder_members_folder_id_folders_id_fkey" FOREIGN KEY ("folder_id") REFERENCES "folders"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "folder_members" ADD CONSTRAINT "folder_members_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;