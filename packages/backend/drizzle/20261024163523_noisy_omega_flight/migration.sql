ALTER TABLE "folder_acls" ADD COLUMN "can_view" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "folder_acls" ADD COLUMN "can_download" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "folder_acls" ADD COLUMN "can_add" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "folder_acls" ADD COLUMN "can_edit" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "folder_acls" ADD COLUMN "can_delete" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "folder_acls" ADD COLUMN "can_manage_members" boolean DEFAULT false NOT NULL;