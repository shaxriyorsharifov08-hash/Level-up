/**
 * Database schema (PostgreSQL via Drizzle ORM).
 *
 * Column names are written in camelCase here and mapped to snake_case in the
 * database automatically (`casing: "snake_case"` in drizzle.config.ts and src/db/index.ts).
 *
 * Everything lives in its own PostgreSQL schema, `campus`, instead of the shared `public`
 * schema, so this app's tables, types and migration history never mix with other apps that use
 * the same database (for example several projects in one Supabase project).
 *
 * Every table also has Row Level Security enabled with no policies. The app connects as the table
 * owner, which bypasses RLS, while Supabase's REST API roles (anon/authenticated) can't read or
 * write anything. See docs/SUPABASE.md.
 */
import { relations } from "drizzle-orm";
import {
  type AnyPgColumn,
  boolean,
  index,
  integer,
  pgSchema,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

/** Name of the PostgreSQL schema that holds all of this app's tables. */
export const DB_SCHEMA = "campus";
export const campus = pgSchema(DB_SCHEMA);

const createdAt = () => timestamp({ withTimezone: true }).notNull().defaultNow();
const updatedAt = () =>
  timestamp({ withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date());

/* -------------------------------------------------------------------------- */
/*                                   Enums                                    */
/* -------------------------------------------------------------------------- */

export const userRole = campus.enum("user_role", ["student", "admin"]);
export const orgKind = campus.enum("org_kind", ["organization", "club"]);
export const joinPolicy = campus.enum("join_policy", ["open", "request"]);
export const memberRole = campus.enum("member_role", ["owner", "admin", "member"]);
export const membershipStatus = campus.enum("membership_status", ["active", "pending"]);
export const eventStatus = campus.enum("event_status", ["draft", "published", "cancelled"]);
export const registrationStatus = campus.enum("registration_status", [
  "registered",
  "waitlisted",
  "cancelled",
]);
export const projectStatus = campus.enum("project_status", [
  "planning",
  "active",
  "on_hold",
  "completed",
]);
export const taskStatus = campus.enum("task_status", ["todo", "in_progress", "review", "done"]);
export const taskPriority = campus.enum("task_priority", ["low", "medium", "high"]);
export const conversationType = campus.enum("conversation_type", ["direct", "group", "channel"]);

/* -------------------------------------------------------------------------- */
/*                               Users & sessions                             */
/* -------------------------------------------------------------------------- */

export const users = campus.table("users", {
  id: uuid().primaryKey().defaultRandom(),
  name: text().notNull(),
  email: text().notNull().unique(),
  passwordHash: text().notNull(),
  role: userRole().notNull().default("student"),
  faculty: text(),
  studyYear: integer(),
  bio: text(),
  avatarUrl: text(),
  telegram: text(),
  instagram: text(),
  createdAt: createdAt(),
}).enableRLS();

export const sessions = campus.table(
  "sessions",
  {
    // SHA-256 hash of the random token stored in the cookie. The raw token never touches the DB.
    id: text().primaryKey(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp({ withTimezone: true }).notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("sessions_user_idx").on(t.userId)],
).enableRLS();

/* -------------------------------------------------------------------------- */
/*                         Organizations, clubs, members                      */
/* -------------------------------------------------------------------------- */

/**
 * An organization is any student body: a student union, a faculty council, a club...
 * Clubs are organizations with `kind = "club"`. A club can be managed by a parent
 * organization (`parentId`); admins of the parent can manage the club as well.
 */
export const organizations = campus.table(
  "organizations",
  {
    id: uuid().primaryKey().defaultRandom(),
    slug: text().notNull().unique(),
    name: text().notNull(),
    kind: orgKind().notNull().default("club"),
    parentId: uuid().references((): AnyPgColumn => organizations.id, { onDelete: "set null" }),
    tagline: text(),
    description: text().notNull().default(""),
    category: text().notNull().default("General"),
    logoUrl: text(),
    coverUrl: text(),
    telegramUrl: text(),
    instagramUrl: text(),
    websiteUrl: text(),
    joinPolicy: joinPolicy().notNull().default("open"),
    verified: boolean().notNull().default(false),
    createdById: uuid().references(() => users.id, { onDelete: "set null" }),
    createdAt: createdAt(),
  },
  (t) => [index("organizations_parent_idx").on(t.parentId)],
).enableRLS();

export const memberships = campus.table(
  "memberships",
  {
    id: uuid().primaryKey().defaultRandom(),
    organizationId: uuid()
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: memberRole().notNull().default("member"),
    status: membershipStatus().notNull().default("active"),
    /** Free-text responsibility inside the team, e.g. "Head of PR" or "Treasurer". */
    responsibility: text(),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex("memberships_org_user_uq").on(t.organizationId, t.userId),
    index("memberships_user_idx").on(t.userId),
  ],
).enableRLS();

export const follows = campus.table(
  "follows",
  {
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    organizationId: uuid()
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    createdAt: createdAt(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.organizationId] }),
    index("follows_org_idx").on(t.organizationId),
  ],
).enableRLS();

/** Announcements / activity posts published by an organization. */
export const posts = campus.table(
  "posts",
  {
    id: uuid().primaryKey().defaultRandom(),
    organizationId: uuid()
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    authorId: uuid().references(() => users.id, { onDelete: "set null" }),
    content: text().notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("posts_org_created_idx").on(t.organizationId, t.createdAt)],
).enableRLS();

/* -------------------------------------------------------------------------- */
/*                                   Events                                   */
/* -------------------------------------------------------------------------- */

export const events = campus.table(
  "events",
  {
    id: uuid().primaryKey().defaultRandom(),
    organizationId: uuid()
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    title: text().notNull(),
    description: text().notNull().default(""),
    category: text().notNull().default("General"),
    location: text().notNull().default(""),
    startsAt: timestamp({ withTimezone: true }).notNull(),
    endsAt: timestamp({ withTimezone: true }).notNull(),
    /** `null` means unlimited seats. */
    capacity: integer(),
    coverUrl: text(),
    status: eventStatus().notNull().default("published"),
    registrationOpen: boolean().notNull().default(true),
    createdById: uuid().references(() => users.id, { onDelete: "set null" }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("events_starts_at_idx").on(t.startsAt),
    index("events_org_idx").on(t.organizationId),
  ],
).enableRLS();

export const eventRegistrations = campus.table(
  "event_registrations",
  {
    id: uuid().primaryKey().defaultRandom(),
    eventId: uuid()
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    status: registrationStatus().notNull().default("registered"),
    checkedInAt: timestamp({ withTimezone: true }),
    createdAt: createdAt(),
    /** Also used as the waitlist position: the oldest `updatedAt` is promoted first. */
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("event_registrations_event_user_uq").on(t.eventId, t.userId),
    index("event_registrations_user_idx").on(t.userId),
  ],
).enableRLS();

/* -------------------------------------------------------------------------- */
/*                              Projects & tasks                              */
/* -------------------------------------------------------------------------- */

export const projects = campus.table(
  "projects",
  {
    id: uuid().primaryKey().defaultRandom(),
    organizationId: uuid()
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    title: text().notNull(),
    summary: text().notNull().default(""),
    description: text().notNull().default(""),
    status: projectStatus().notNull().default("planning"),
    /** Public projects appear on the discover page; private ones only inside the workspace. */
    isPublic: boolean().notNull().default(true),
    /** Shown on the public page to invite students to get involved. */
    lookingForContributors: boolean().notNull().default(false),
    coverUrl: text(),
    dueDate: timestamp({ withTimezone: true }),
    createdById: uuid().references(() => users.id, { onDelete: "set null" }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("projects_org_idx").on(t.organizationId)],
).enableRLS();

export const tasks = campus.table(
  "tasks",
  {
    id: uuid().primaryKey().defaultRandom(),
    organizationId: uuid()
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    projectId: uuid().references(() => projects.id, { onDelete: "cascade" }),
    eventId: uuid().references(() => events.id, { onDelete: "set null" }),
    title: text().notNull(),
    description: text().notNull().default(""),
    status: taskStatus().notNull().default("todo"),
    priority: taskPriority().notNull().default("medium"),
    assigneeId: uuid().references(() => users.id, { onDelete: "set null" }),
    dueDate: timestamp({ withTimezone: true }),
    completedAt: timestamp({ withTimezone: true }),
    createdById: uuid().references(() => users.id, { onDelete: "set null" }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("tasks_org_idx").on(t.organizationId),
    index("tasks_project_idx").on(t.projectId),
    index("tasks_assignee_idx").on(t.assigneeId),
  ],
).enableRLS();

/* -------------------------------------------------------------------------- */
/*                                  Meetings                                  */
/* -------------------------------------------------------------------------- */

export const meetings = campus.table(
  "meetings",
  {
    id: uuid().primaryKey().defaultRandom(),
    organizationId: uuid()
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    title: text().notNull(),
    description: text().notNull().default(""),
    location: text().notNull().default(""),
    meetingUrl: text(),
    startsAt: timestamp({ withTimezone: true }).notNull(),
    endsAt: timestamp({ withTimezone: true }).notNull(),
    createdById: uuid().references(() => users.id, { onDelete: "set null" }),
    createdAt: createdAt(),
  },
  (t) => [index("meetings_org_starts_idx").on(t.organizationId, t.startsAt)],
).enableRLS();

/* -------------------------------------------------------------------------- */
/*                                  Messaging                                 */
/* -------------------------------------------------------------------------- */

/**
 * - `direct`: 1:1 chat between two students (deduplicated by `directKey`)
 * - `group`: ad-hoc group chat created by a student
 * - `channel`: internal chat channel of an organization (members are synced with the org)
 */
export const conversations = campus.table(
  "conversations",
  {
    id: uuid().primaryKey().defaultRandom(),
    type: conversationType().notNull(),
    name: text(),
    organizationId: uuid().references(() => organizations.id, { onDelete: "cascade" }),
    directKey: text().unique(),
    createdById: uuid().references(() => users.id, { onDelete: "set null" }),
    createdAt: createdAt(),
    lastMessageAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("conversations_org_idx").on(t.organizationId)],
).enableRLS();

export const conversationMembers = campus.table(
  "conversation_members",
  {
    conversationId: uuid()
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    lastReadAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    createdAt: createdAt(),
  },
  (t) => [
    primaryKey({ columns: [t.conversationId, t.userId] }),
    index("conversation_members_user_idx").on(t.userId),
  ],
).enableRLS();

export const messages = campus.table(
  "messages",
  {
    // Monotonic identity column: clients poll with `?after=<lastId>` to fetch only new messages.
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    conversationId: uuid()
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    senderId: uuid().references(() => users.id, { onDelete: "set null" }),
    body: text().notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("messages_conversation_idx").on(t.conversationId, t.id)],
).enableRLS();

/* -------------------------------------------------------------------------- */
/*                                Notifications                               */
/* -------------------------------------------------------------------------- */

export const notifications = campus.table(
  "notifications",
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text().notNull(),
    body: text(),
    link: text(),
    readAt: timestamp({ withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [index("notifications_user_created_idx").on(t.userId, t.createdAt)],
).enableRLS();

/* -------------------------------------------------------------------------- */
/*                                  Relations                                 */
/* -------------------------------------------------------------------------- */

export const usersRelations = relations(users, ({ many }) => ({
  memberships: many(memberships),
  follows: many(follows),
  registrations: many(eventRegistrations),
  assignedTasks: many(tasks),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
}));

export const organizationsRelations = relations(organizations, ({ one, many }) => ({
  parent: one(organizations, {
    fields: [organizations.parentId],
    references: [organizations.id],
    relationName: "parent_child",
  }),
  children: many(organizations, { relationName: "parent_child" }),
  memberships: many(memberships),
  follows: many(follows),
  events: many(events),
  projects: many(projects),
  posts: many(posts),
  meetings: many(meetings),
}));

export const membershipsRelations = relations(memberships, ({ one }) => ({
  organization: one(organizations, {
    fields: [memberships.organizationId],
    references: [organizations.id],
  }),
  user: one(users, { fields: [memberships.userId], references: [users.id] }),
}));

export const followsRelations = relations(follows, ({ one }) => ({
  organization: one(organizations, {
    fields: [follows.organizationId],
    references: [organizations.id],
  }),
  user: one(users, { fields: [follows.userId], references: [users.id] }),
}));

export const postsRelations = relations(posts, ({ one }) => ({
  organization: one(organizations, {
    fields: [posts.organizationId],
    references: [organizations.id],
  }),
  author: one(users, { fields: [posts.authorId], references: [users.id] }),
}));

export const eventsRelations = relations(events, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [events.organizationId],
    references: [organizations.id],
  }),
  registrations: many(eventRegistrations),
}));

export const eventRegistrationsRelations = relations(eventRegistrations, ({ one }) => ({
  event: one(events, { fields: [eventRegistrations.eventId], references: [events.id] }),
  user: one(users, { fields: [eventRegistrations.userId], references: [users.id] }),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [projects.organizationId],
    references: [organizations.id],
  }),
  tasks: many(tasks),
}));

export const tasksRelations = relations(tasks, ({ one }) => ({
  organization: one(organizations, {
    fields: [tasks.organizationId],
    references: [organizations.id],
  }),
  project: one(projects, { fields: [tasks.projectId], references: [projects.id] }),
  event: one(events, { fields: [tasks.eventId], references: [events.id] }),
  assignee: one(users, { fields: [tasks.assigneeId], references: [users.id] }),
}));

export const meetingsRelations = relations(meetings, ({ one }) => ({
  organization: one(organizations, {
    fields: [meetings.organizationId],
    references: [organizations.id],
  }),
  createdBy: one(users, { fields: [meetings.createdById], references: [users.id] }),
}));

export const conversationsRelations = relations(conversations, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [conversations.organizationId],
    references: [organizations.id],
  }),
  members: many(conversationMembers),
  messages: many(messages),
}));

export const conversationMembersRelations = relations(conversationMembers, ({ one }) => ({
  conversation: one(conversations, {
    fields: [conversationMembers.conversationId],
    references: [conversations.id],
  }),
  user: one(users, { fields: [conversationMembers.userId], references: [users.id] }),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  conversation: one(conversations, {
    fields: [messages.conversationId],
    references: [conversations.id],
  }),
  sender: one(users, { fields: [messages.senderId], references: [users.id] }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, { fields: [notifications.userId], references: [users.id] }),
}));

/* -------------------------------------------------------------------------- */
/*                                    Types                                   */
/* -------------------------------------------------------------------------- */

export type User = typeof users.$inferSelect;
export type Organization = typeof organizations.$inferSelect;
export type Membership = typeof memberships.$inferSelect;
export type Event = typeof events.$inferSelect;
export type EventRegistration = typeof eventRegistrations.$inferSelect;
export type Project = typeof projects.$inferSelect;
export type Task = typeof tasks.$inferSelect;
export type Meeting = typeof meetings.$inferSelect;
export type Post = typeof posts.$inferSelect;
export type Conversation = typeof conversations.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type Notification = typeof notifications.$inferSelect;

export type MemberRole = (typeof memberRole.enumValues)[number];
export type TaskStatus = (typeof taskStatus.enumValues)[number];
export type TaskPriority = (typeof taskPriority.enumValues)[number];
export type ProjectStatus = (typeof projectStatus.enumValues)[number];
export type RegistrationStatus = (typeof registrationStatus.enumValues)[number];
