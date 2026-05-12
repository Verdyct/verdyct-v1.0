import {
  bigserial,
  boolean,
  index,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { organizations, users, orgMemberRoleEnum } from "./tenancy.js";
import { partieRelations, partieContacts } from "./parties.js";
import { dossiers, lignesDossier } from "./dossiers.js";

export const relanceStatusEnum = pgEnum("relance_status", [
  "draft",
  "sent",
  "opened",
  "replied",
  "bounced",
  "expired",
]);

export const notificationKindEnum = pgEnum("notification_kind", [
  "dossier_ready_to_validate",
  "importer_replied",
  "cascade_needs_clarification",
  "cbam_quarter_deadline",
  "subscription_payment_failed",
  "system",
]);

export const invitationStatusEnum = pgEnum("invitation_status", [
  "pending",
  "accepted",
  "expired",
  "revoked",
]);

export const emailInboundAddresses = pgTable(
  "email_inbound_addresses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    slug: varchar("slug", { length: 48 }).notNull().unique(),
    partieRelationId: uuid("partie_relation_id").references(
      () => partieRelations.id,
    ),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
  },
  (t) => ({
    orgIdx: index("email_inbound_org")
      .on(t.organizationId)
      .where(sql`${t.isActive} = true`),
  }),
);

export const relances = pgTable(
  "relances",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    dossierId: uuid("dossier_id")
      .notNull()
      .references(() => dossiers.id, { onDelete: "cascade" }),
    ligneId: uuid("ligne_id").references(() => lignesDossier.id),
    partieRelationId: uuid("partie_relation_id")
      .notNull()
      .references(() => partieRelations.id),
    contactId: uuid("contact_id").references(() => partieContacts.id),

    status: relanceStatusEnum("status").notNull().default("draft"),
    subject: text("subject").notNull(),
    bodyHtml: text("body_html").notNull(),
    bodyText: text("body_text").notNull(),
    toEmail: text("to_email").notNull(),
    ccEmails: text("cc_emails").array(),
    questionSummary: text("question_summary"),
    missingInfoFields: text("missing_info_fields").array(),

    sentAt: timestamp("sent_at", { withTimezone: true }),
    openedAt: timestamp("opened_at", { withTimezone: true }),
    repliedAt: timestamp("replied_at", { withTimezone: true }),
    replyMessageId: text("reply_message_id"),
    replyParsedResponse: jsonb("reply_parsed_response"),

    resendMessageId: text("resend_message_id"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdBy: uuid("created_by").references(() => users.id),
  },
  (t) => ({
    dossierIdx: index("relances_dossier").on(t.dossierId),
    statusIdx: index("relances_status").on(t.organizationId, t.status),
    resendMsgIdx: index("relances_resend_msg").on(t.resendMessageId),
  }),
);

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    kind: notificationKindEnum("kind").notNull(),
    title: text("title").notNull(),
    body: text("body"),
    linkUrl: text("link_url"),
    relatedDossierId: uuid("related_dossier_id").references(() => dossiers.id),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    userUnreadIdx: index("notifications_user_unread")
      .on(t.userId)
      .where(sql`${t.readAt} IS NULL`),
  }),
);

export const metricEvents = pgTable(
  "metric_events",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    organizationId: uuid("organization_id").references(() => organizations.id),
    userId: uuid("user_id").references(() => users.id),
    eventType: text("event_type").notNull(),
    properties: jsonb("properties"),
    occurredAt: timestamp("occurred_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    typeTimeIdx: index("metric_events_type_time").on(
      t.eventType,
      t.occurredAt,
    ),
  }),
);

export const stripeWebhookEvents = pgTable("stripe_webhook_events", {
  eventId: text("event_id").primaryKey(),
  type: text("type").notNull(),
  receivedAt: timestamp("received_at", { withTimezone: true }).defaultNow(),
  processedAt: timestamp("processed_at", { withTimezone: true }),
});

export const inboundEmailLog = pgTable("inbound_email_log", {
  messageId: text("message_id").primaryKey(),
  toAddress: text("to_address").notNull(),
  fromAddress: text("from_address"),
  organizationId: uuid("organization_id").references(() => organizations.id),
  dossierId: uuid("dossier_id").references(() => dossiers.id),
  status: text("status").notNull(),
  receivedAt: timestamp("received_at", { withTimezone: true }).defaultNow(),
});

export const invitations = pgTable(
  "invitations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    role: orgMemberRoleEnum("role").notNull().default("member"),
    invitedBy: uuid("invited_by")
      .notNull()
      .references(() => users.id),
    token: text("token").notNull().unique(),
    status: invitationStatusEnum("status").notNull().default("pending"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    acceptedBy: uuid("accepted_by").references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    // UNIQUE (organization_id, email, status) DEFERRABLE INITIALLY DEFERRED
    // — enforced in SQL migration; Drizzle does not support DEFERRABLE constraints
  },
  (t) => ({
    orgPendingIdx: index("invitations_org")
      .on(t.organizationId)
      .where(sql`${t.status} = 'pending'`),
    tokenIdx: index("invitations_token").on(t.token),
    uniqueOrgEmailStatus: uniqueIndex(
      "invitations_org_email_status_unique",
    ).on(t.organizationId, t.email, t.status),
  }),
);

export const onboardingFunnel = pgTable("onboarding_funnel", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  signupStartedAt: timestamp("signup_started_at", { withTimezone: true }),
  signupCompletedAt: timestamp("signup_completed_at", { withTimezone: true }),
  emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
  orgCreatedAt: timestamp("org_created_at", { withTimezone: true }),
  bureauConfiguredAt: timestamp("bureau_configured_at", {
    withTimezone: true,
  }),
  checkoutStartedAt: timestamp("checkout_started_at", { withTimezone: true }),
  trialStartedAt: timestamp("trial_started_at", { withTimezone: true }),
  emailSetupSeenAt: timestamp("email_setup_seen_at", { withTimezone: true }),
  firstDossierCreatedAt: timestamp("first_dossier_created_at", {
    withTimezone: true,
  }),
  firstLigneValidatedAt: timestamp("first_ligne_validated_at", {
    withTimezone: true,
  }),
  firstDeclarationGeneratedAt: timestamp("first_declaration_generated_at", {
    withTimezone: true,
  }),
  teamInvitedAt: timestamp("team_invited_at", { withTimezone: true }),
  fullyActivatedAt: timestamp("fully_activated_at", { withTimezone: true }),
  abandonedAtStep: text("abandoned_at_step"),
});

export type EmailInboundAddressSelect =
  typeof emailInboundAddresses.$inferSelect;
export type EmailInboundAddressInsert =
  typeof emailInboundAddresses.$inferInsert;
export type RelanceSelect = typeof relances.$inferSelect;
export type RelanceInsert = typeof relances.$inferInsert;
export type NotificationSelect = typeof notifications.$inferSelect;
export type NotificationInsert = typeof notifications.$inferInsert;
export type MetricEventSelect = typeof metricEvents.$inferSelect;
export type MetricEventInsert = typeof metricEvents.$inferInsert;
export type StripeWebhookEventSelect = typeof stripeWebhookEvents.$inferSelect;
export type StripeWebhookEventInsert = typeof stripeWebhookEvents.$inferInsert;
export type InboundEmailLogSelect = typeof inboundEmailLog.$inferSelect;
export type InboundEmailLogInsert = typeof inboundEmailLog.$inferInsert;
export type InvitationSelect = typeof invitations.$inferSelect;
export type InvitationInsert = typeof invitations.$inferInsert;
export type OnboardingFunnelSelect = typeof onboardingFunnel.$inferSelect;
export type OnboardingFunnelInsert = typeof onboardingFunnel.$inferInsert;
