ALTER TABLE "audit_logs" ADD COLUMN "user_id" uuid;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD COLUMN "action_type" varchar(50);--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL;