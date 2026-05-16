CREATE TABLE "active_streams" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"stream_id" text NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_heartbeat" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "iptv_credentials" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"server_url" text NOT NULL,
	"username" text NOT NULL,
	"password_encrypted" "bytea" NOT NULL,
	"iv" "bytea" NOT NULL,
	"tag" "bytea" NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "team_channel_map" (
	"user_id" uuid NOT NULL,
	"team_key" text NOT NULL,
	"league" text NOT NULL,
	"channel_id" text NOT NULL,
	"confirmed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "team_channel_map_user_id_team_key_league_pk" PRIMARY KEY("user_id","team_key","league")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "active_streams" ADD CONSTRAINT "active_streams_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "iptv_credentials" ADD CONSTRAINT "iptv_credentials_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_channel_map" ADD CONSTRAINT "team_channel_map_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;