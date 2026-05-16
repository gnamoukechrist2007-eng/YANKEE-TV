import {
  pgTable,
  text,
  timestamp,
  uuid,
  customType,
  primaryKey,
} from "drizzle-orm/pg-core";

const bytea = customType<{ data: Buffer; default: false }>({
  dataType() {
    return "bytea";
  },
});

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const iptvCredentials = pgTable("iptv_credentials", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  serverUrl: text("server_url").notNull(),
  username: text("username").notNull(),
  passwordEncrypted: bytea("password_encrypted").notNull(),
  iv: bytea("iv").notNull(),
  tag: bytea("tag").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const activeStreams = pgTable("active_streams", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  streamId: text("stream_id").notNull(),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  lastHeartbeat: timestamp("last_heartbeat", { withTimezone: true }).notNull().defaultNow(),
});

export const teamChannelMap = pgTable(
  "team_channel_map",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    teamKey: text("team_key").notNull(),
    league: text("league").notNull(),
    channelId: text("channel_id").notNull(),
    confirmedAt: timestamp("confirmed_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.userId, t.teamKey, t.league] }),
  }),
);
