import { boolean, index, int, mysqlEnum, mysqlTable, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const merchantProfiles = mysqlTable("merchantProfiles", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  displayName: varchar("displayName", { length: 160 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const merchantPolicies = mysqlTable("merchantPolicies", {
  id: int("id").autoincrement().primaryKey(),
  merchantId: int("merchantId").notNull(),
  version: int("version").notNull(),
  name: varchar("name", { length: 120 }).notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  eligibleFailureTypesJson: text("eligibleFailureTypesJson").notNull(),
  permittedActionTypesJson: text("permittedActionTypesJson").notNull(),
  autoActionAmountCapPaise: int("autoActionAmountCapPaise").notNull(),
  maxRetries: int("maxRetries").notNull(),
  requiresConsent: boolean("requiresConsent").default(true).notNull(),
  minimumConfidenceBps: int("minimumConfidenceBps").notNull(),
  reminderMaxContacts: int("reminderMaxContacts").notNull(),
  escalationRulesJson: text("escalationRulesJson").notNull(),
  stoppingConditionsJson: text("stoppingConditionsJson").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [
  uniqueIndex("merchant_policy_version_unique").on(table.merchantId, table.version),
  index("merchant_policy_active_idx").on(table.merchantId, table.isActive),
]);

export const paymentEvents = mysqlTable("paymentEvents", {
  id: int("id").autoincrement().primaryKey(),
  merchantId: int("merchantId").notNull(),
  sourceEventId: varchar("sourceEventId", { length: 128 }).notNull(),
  sourceType: mysqlEnum("sourceType", ["WEBHOOK", "BATCH", "MANUAL"]).notNull(),
  eventType: varchar("eventType", { length: 80 }).notNull(),
  rawPayloadDigest: varchar("rawPayloadDigest", { length: 64 }).notNull(),
  signatureStatus: mysqlEnum("signatureStatus", ["VERIFIED", "NOT_APPLICABLE", "INVALID", "PENDING"]).notNull(),
  externalPaymentId: varchar("externalPaymentId", { length: 128 }).notNull(),
  amountPaise: int("amountPaise").notNull(),
  currency: varchar("currency", { length: 12 }).default("INR").notNull(),
  customerIdentity: varchar("customerIdentity", { length: 320 }).notNull(),
  consentGranted: boolean("consentGranted").default(false).notNull(),
  failureType: mysqlEnum("failureType", ["TEMPORARY_DECLINE", "CUSTOMER_FRICTION", "INSUFFICIENT_CONTEXT", "UNSUPPORTED"]).notNull(),
  failureCode: varchar("failureCode", { length: 120 }),
  payloadJson: text("payloadJson").notNull(),
  occurredAt: timestamp("occurredAt").notNull(),
  receivedAt: timestamp("receivedAt").defaultNow().notNull(),
}, table => [
  uniqueIndex("payment_event_source_unique").on(table.merchantId, table.sourceEventId),
  index("payment_event_payment_idx").on(table.merchantId, table.externalPaymentId),
]);

export const recoveryCases = mysqlTable("recoveryCases", {
  id: int("id").autoincrement().primaryKey(),
  caseReference: varchar("caseReference", { length: 40 }).notNull().unique(),
  merchantId: int("merchantId").notNull(),
  paymentEventId: int("paymentEventId").notNull(),
  policyId: int("policyId").notNull(),
  policyVersion: int("policyVersion").notNull(),
  source: mysqlEnum("source", ["WEBHOOK", "BATCH", "MANUAL"]).notNull(),
  state: mysqlEnum("state", ["RECEIVED", "INGESTED", "POLICY_EVALUATING", "DIAGNOSING", "ACTION_DECIDED", "APPROVAL_PENDING", "ACTION_QUEUED", "ACTION_ATTEMPTED", "AWAITING_OUTCOME", "RECOVERED", "STOPPED", "EXCEPTION", "REJECTED", "DUPLICATE_IGNORED"]).notNull(),
  amountSnapshotPaise: int("amountSnapshotPaise").notNull(),
  customerIdentitySnapshot: varchar("customerIdentitySnapshot", { length: 320 }).notNull(),
  externalPaymentIdSnapshot: varchar("externalPaymentIdSnapshot", { length: 128 }).notNull(),
  retryCount: int("retryCount").default(0).notNull(),
  reminderCount: int("reminderCount").default(0).notNull(),
  riskFlagsJson: text("riskFlagsJson").notNull(),
  terminalReason: varchar("terminalReason", { length: 160 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [
  uniqueIndex("recovery_case_payment_event_unique").on(table.paymentEventId),
  index("recovery_case_queue_idx").on(table.merchantId, table.state, table.createdAt),
]);

export const policyEvaluations = mysqlTable("policyEvaluations", {
  id: int("id").autoincrement().primaryKey(),
  recoveryCaseId: int("recoveryCaseId").notNull(),
  policyId: int("policyId").notNull(),
  policyVersion: int("policyVersion").notNull(),
  eligible: boolean("eligible").notNull(),
  requiresApproval: boolean("requiresApproval").notNull(),
  matchedRulesJson: text("matchedRulesJson").notNull(),
  permittedActionTypesJson: text("permittedActionTypesJson").notNull(),
  stoppingReason: varchar("stoppingReason", { length: 160 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [index("policy_evaluation_case_idx").on(table.recoveryCaseId)]);

export const diagnoses = mysqlTable("diagnoses", {
  id: int("id").autoincrement().primaryKey(),
  recoveryCaseId: int("recoveryCaseId").notNull(),
  failureCause: mysqlEnum("failureCause", ["TEMPORARY_DECLINE", "CUSTOMER_FRICTION", "INSUFFICIENT_CONTEXT", "UNSUPPORTED"]).notNull(),
  confidenceBps: int("confidenceBps").notNull(),
  evidenceJson: text("evidenceJson").notNull(),
  explanation: text("explanation").notNull(),
  recommendedAction: mysqlEnum("recommendedAction", ["NO_ACTION", "SIMULATED_RETRY", "PAYMENT_LINK_FALLBACK", "REMINDER", "HUMAN_ESCALATION"]).notNull(),
  uncertaintyReason: text("uncertaintyReason"),
  modelId: varchar("modelId", { length: 120 }).notNull(),
  promptVersion: varchar("promptVersion", { length: 40 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [index("diagnosis_case_idx").on(table.recoveryCaseId)]);

export const recoveryActions = mysqlTable("recoveryActions", {
  id: int("id").autoincrement().primaryKey(),
  recoveryCaseId: int("recoveryCaseId").notNull(),
  actionType: mysqlEnum("actionType", ["NO_ACTION", "SIMULATED_RETRY", "PAYMENT_LINK_FALLBACK", "REMINDER", "HUMAN_ESCALATION"]).notNull(),
  status: mysqlEnum("status", ["PLANNED", "DISPATCHED", "SUCCEEDED", "FAILED", "EXPIRED", "SKIPPED"]).notNull(),
  idempotencyKey: varchar("idempotencyKey", { length: 128 }).notNull().unique(),
  actionPayloadJson: text("actionPayloadJson").notNull(),
  attemptNumber: int("attemptNumber").notNull(),
  providerReference: varchar("providerReference", { length: 160 }),
  expiresAt: timestamp("expiresAt"),
  completedAt: timestamp("completedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [index("recovery_action_case_idx").on(table.recoveryCaseId, table.createdAt)]);

export const approvalRequests = mysqlTable("approvalRequests", {
  id: int("id").autoincrement().primaryKey(),
  recoveryCaseId: int("recoveryCaseId").notNull(),
  recommendedAction: mysqlEnum("recommendedAction", ["NO_ACTION", "SIMULATED_RETRY", "PAYMENT_LINK_FALLBACK", "REMINDER", "HUMAN_ESCALATION"]).notNull(),
  status: mysqlEnum("status", ["PENDING", "APPROVED", "REJECTED", "EXPIRED"]).default("PENDING").notNull(),
  rationale: text("rationale").notNull(),
  requestedAt: timestamp("requestedAt").defaultNow().notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  decidedByUserId: int("decidedByUserId"),
  decisionReason: text("decisionReason"),
  decidedAt: timestamp("decidedAt"),
}, table => [index("approval_queue_idx").on(table.status, table.expiresAt)]);

export const webhookReceipts = mysqlTable("webhookReceipts", {
  id: int("id").autoincrement().primaryKey(),
  merchantId: int("merchantId").notNull(),
  sourceEventId: varchar("sourceEventId", { length: 128 }).notNull(),
  rawPayloadDigest: varchar("rawPayloadDigest", { length: 64 }).notNull(),
  signatureStatus: mysqlEnum("signatureStatus", ["VERIFIED", "INVALID", "PENDING"]).notNull(),
  processingStatus: mysqlEnum("processingStatus", ["RECEIVED", "REJECTED", "DUPLICATE", "PROCESSED", "EXCEPTION"]).notNull(),
  receivedAt: timestamp("receivedAt").defaultNow().notNull(),
}, table => [uniqueIndex("webhook_receipt_source_unique").on(table.merchantId, table.sourceEventId)]);

export const auditEntries = mysqlTable("auditEntries", {
  id: int("id").autoincrement().primaryKey(),
  recoveryCaseId: int("recoveryCaseId").notNull(),
  sequence: int("sequence").notNull(),
  actorType: mysqlEnum("actorType", ["SYSTEM", "MERCHANT", "RAZORPAY", "AI"]).notNull(),
  eventType: varchar("eventType", { length: 100 }).notNull(),
  payloadJson: text("payloadJson").notNull(),
  previousHash: varchar("previousHash", { length: 64 }),
  entryHash: varchar("entryHash", { length: 64 }).notNull().unique(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [
  uniqueIndex("audit_case_sequence_unique").on(table.recoveryCaseId, table.sequence),
  index("audit_case_created_idx").on(table.recoveryCaseId, table.createdAt),
]);

export const evaluationRuns = mysqlTable("evaluationRuns", {
  id: int("id").autoincrement().primaryKey(),
  merchantId: int("merchantId").notNull(),
  policyVersion: int("policyVersion").notNull(),
  datasetVersion: varchar("datasetVersion", { length: 80 }).notNull(),
  seed: int("seed").notNull(),
  runType: mysqlEnum("runType", ["DEVELOPMENT", "HELD_OUT", "DEMO"]).notNull(),
  status: mysqlEnum("status", ["PENDING", "RUNNING", "COMPLETED", "FAILED"]).notNull(),
  startedAt: timestamp("startedAt"),
  completedAt: timestamp("completedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const evaluationResults = mysqlTable("evaluationResults", {
  id: int("id").autoincrement().primaryKey(),
  evaluationRunId: int("evaluationRunId").notNull(),
  recoveryCaseId: int("recoveryCaseId"),
  comparator: mysqlEnum("comparator", ["NO_ACTION", "SINGLE_RETRY", "PAYMENT_LINK", "RECOVERFLOW"]).notNull(),
  split: mysqlEnum("split", ["DEVELOPMENT", "HELD_OUT"]).notNull(),
  outcome: mysqlEnum("outcome", ["RECOVERED", "NOT_RECOVERED", "FALSE_POSITIVE", "EXCEPTION", "STOPPED"]).notNull(),
  recoveredAmountPaise: int("recoveredAmountPaise").default(0).notNull(),
  falsePositiveCostPaise: int("falsePositiveCostPaise").default(0).notNull(),
  exceptionClass: varchar("exceptionClass", { length: 120 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [index("evaluation_result_run_idx").on(table.evaluationRunId, table.comparator, table.split)]);

export type MerchantPolicy = typeof merchantPolicies.$inferSelect;
export type PaymentEvent = typeof paymentEvents.$inferSelect;
export type RecoveryCase = typeof recoveryCases.$inferSelect;
