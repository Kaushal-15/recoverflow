import { desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { approvalRequests, auditEntries, diagnoses, InsertUser, merchantPolicies, merchantProfiles, paymentEvents, policyEvaluations, recoveryActions, recoveryCases, users } from "../drizzle/schema";
import { ENV } from './_core/env';
import { buildAuditEntry, type AuditActorType } from "./recovery/audit";
import type { RecoveryActionType, RecoveryCandidate, RecoveryCaseState } from "../shared/recovery";

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function ensureMerchantForUser(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");

  const existing = await db.select().from(merchantProfiles).where(eq(merchantProfiles.userId, userId)).limit(1);
  if (existing[0]) return existing[0];

  await db.insert(merchantProfiles).values({ userId, displayName: "Recovery Demo Merchant" });
  const created = await db.select().from(merchantProfiles).where(eq(merchantProfiles.userId, userId)).limit(1);
  const merchant = created[0];
  if (!merchant) throw new Error("Could not create merchant profile");

  await db.insert(merchantPolicies).values({
    merchantId: merchant.id,
    version: 1,
    name: "Default guarded recovery policy",
    eligibleFailureTypesJson: JSON.stringify(["TEMPORARY_DECLINE", "CUSTOMER_FRICTION"]),
    permittedActionTypesJson: JSON.stringify(["SIMULATED_RETRY", "PAYMENT_LINK_FALLBACK", "REMINDER"]),
    autoActionAmountCapPaise: 50_000,
    maxRetries: 2,
    requiresConsent: true,
    minimumConfidenceBps: 8_000,
    reminderMaxContacts: 2,
    escalationRulesJson: JSON.stringify({ highValue: "APPROVAL", ambiguous: "APPROVAL", lowConfidence: "APPROVAL" }),
    stoppingConditionsJson: JSON.stringify(["CONSENT_REQUIRED", "RETRY_LIMIT_REACHED", "PAYMENT_ALREADY_RESOLVED"]),
  });

  return merchant;
}

export async function getActivePolicyForMerchant(merchantId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  const policies = await db.select().from(merchantPolicies)
    .where(eq(merchantPolicies.merchantId, merchantId))
    .orderBy(desc(merchantPolicies.version));
  return policies.find(policy => policy.isActive) ?? null;
}

export async function appendAuditEntry(input: {
  recoveryCaseId: number;
  actorType: AuditActorType;
  eventType: string;
  payload: Record<string, unknown>;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  const prior = await db.select().from(auditEntries)
    .where(eq(auditEntries.recoveryCaseId, input.recoveryCaseId))
    .orderBy(desc(auditEntries.sequence))
    .limit(1);
  const previous = prior[0] ?? null;
  const sequence = previous ? previous.sequence + 1 : 1;
  const built = buildAuditEntry({ ...input, sequence, previousHash: previous?.entryHash ?? null });
  await db.insert(auditEntries).values({
    recoveryCaseId: input.recoveryCaseId,
    sequence,
    actorType: input.actorType,
    eventType: input.eventType,
    payloadJson: built.payloadJson,
    previousHash: previous?.entryHash ?? null,
    entryHash: built.entryHash,
  });
  return { sequence, ...built };
}

export async function createMerchantPolicyVersion(userId: number, input: {
  eligibleFailureTypes: RecoveryCandidate["failureType"][];
  permittedActionTypes: RecoveryActionType[];
  autoActionAmountCapPaise: number;
  maxRetries: number;
  requiresConsent: boolean;
  minimumConfidenceBps: number;
  reminderMaxContacts: number;
}) {
  const db = await getDb();
  if (!db) return null;
  const merchant = await ensureMerchantForUser(userId);
  const active = await getActivePolicyForMerchant(merchant.id);
  const version = (active?.version ?? 0) + 1;
  await db.update(merchantPolicies).set({ isActive: false }).where(eq(merchantPolicies.merchantId, merchant.id));
  await db.insert(merchantPolicies).values({
    merchantId: merchant.id,
    version,
    name: `Guarded recovery policy v${version}`,
    isActive: true,
    eligibleFailureTypesJson: JSON.stringify(input.eligibleFailureTypes),
    permittedActionTypesJson: JSON.stringify(input.permittedActionTypes),
    autoActionAmountCapPaise: input.autoActionAmountCapPaise,
    maxRetries: input.maxRetries,
    requiresConsent: input.requiresConsent,
    minimumConfidenceBps: input.minimumConfidenceBps,
    reminderMaxContacts: input.reminderMaxContacts,
    escalationRulesJson: active?.escalationRulesJson ?? JSON.stringify({ highValue: "APPROVAL", ambiguous: "APPROVAL", lowConfidence: "APPROVAL" }),
    stoppingConditionsJson: active?.stoppingConditionsJson ?? JSON.stringify(["CONSENT_REQUIRED", "RETRY_LIMIT_REACHED", "PAYMENT_ALREADY_RESOLVED"]),
  });
  return getActivePolicyForMerchant(merchant.id);
}

type PersistableSandboxCase = {
  caseReference: string;
  sourceEventId: string;
  state: RecoveryCaseState;
  actionType: RecoveryActionType | null;
  terminalReason: string | null;
  candidate: RecoveryCandidate;
  paymentLink: { providerReference: string; expiresAt: Date } | null;
  diagnosis: {
    failureCause: RecoveryCandidate["failureType"];
    confidenceBps: number;
    evidence: Array<{ field: string; observedValue: string; relevance: string }>;
    explanation: string;
    recommendedAction: RecoveryActionType;
    uncertaintyReason?: string;
    modelId: string;
  } | null;
  audit: Array<{ actor: AuditActorType; event: string; detail: string; time: string }>;
};

export async function persistSandboxCaseForUser(userId: number, snapshot: PersistableSandboxCase) {
  const db = await getDb();
  if (!db) return null;
  const merchant = await ensureMerchantForUser(userId);
  const policy = await getActivePolicyForMerchant(merchant.id);
  if (!policy) throw new Error("Merchant recovery policy is unavailable");

  const merchantEvents = await db.select().from(paymentEvents).where(eq(paymentEvents.merchantId, merchant.id));
  let event = merchantEvents.find(item => item.sourceEventId === snapshot.sourceEventId);
  if (!event) {
    await db.insert(paymentEvents).values({
      merchantId: merchant.id,
      sourceEventId: snapshot.sourceEventId,
      sourceType: "MANUAL",
      eventType: "payment.failed",
      rawPayloadDigest: `sandbox-${snapshot.caseReference}`.padEnd(64, "0").slice(0, 64),
      signatureStatus: "NOT_APPLICABLE",
      externalPaymentId: snapshot.candidate.externalPaymentId,
      amountPaise: snapshot.candidate.amountPaise,
      customerIdentity: snapshot.candidate.customerIdentity,
      consentGranted: snapshot.candidate.consentGranted,
      failureType: snapshot.candidate.failureType,
      payloadJson: JSON.stringify(snapshot.candidate),
      occurredAt: new Date(),
    });
    event = (await db.select().from(paymentEvents).where(eq(paymentEvents.merchantId, merchant.id))).find(item => item.sourceEventId === snapshot.sourceEventId);
  }
  if (!event) throw new Error("Unable to persist sandbox payment event");

  const merchantCases = await db.select().from(recoveryCases).where(eq(recoveryCases.merchantId, merchant.id));
  let recoveryCase = merchantCases.find(item => item.paymentEventId === event!.id);
  if (!recoveryCase) {
    await db.insert(recoveryCases).values({
      caseReference: snapshot.caseReference,
      merchantId: merchant.id,
      paymentEventId: event.id,
      policyId: policy.id,
      policyVersion: policy.version,
      source: "MANUAL",
      state: snapshot.state,
      amountSnapshotPaise: snapshot.candidate.amountPaise,
      customerIdentitySnapshot: snapshot.candidate.customerIdentity,
      externalPaymentIdSnapshot: snapshot.candidate.externalPaymentId,
      retryCount: snapshot.candidate.retryCount,
      reminderCount: snapshot.candidate.reminderCount,
      riskFlagsJson: JSON.stringify({ ambiguous: snapshot.candidate.isAmbiguous, riskFlag: snapshot.candidate.hasRiskFlag }),
      terminalReason: snapshot.terminalReason,
    });
    recoveryCase = (await db.select().from(recoveryCases).where(eq(recoveryCases.merchantId, merchant.id))).find(item => item.paymentEventId === event!.id);
  } else {
    await db.update(recoveryCases).set({ state: snapshot.state, terminalReason: snapshot.terminalReason }).where(eq(recoveryCases.id, recoveryCase.id));
  }
  if (!recoveryCase) throw new Error("Unable to persist sandbox recovery case");

  const evaluations = await db.select().from(policyEvaluations).where(eq(policyEvaluations.recoveryCaseId, recoveryCase.id));
  if (!evaluations.length) {
    await db.insert(policyEvaluations).values({
      recoveryCaseId: recoveryCase.id,
      policyId: policy.id,
      policyVersion: policy.version,
      eligible: snapshot.candidate.consentGranted,
      requiresApproval: snapshot.state === "APPROVAL_PENDING",
      matchedRulesJson: JSON.stringify(["SANDBOX_POLICY_SNAPSHOT"]),
      permittedActionTypesJson: policy.permittedActionTypesJson,
      stoppingReason: snapshot.terminalReason,
    });
  }

  if (snapshot.diagnosis) {
    const storedDiagnoses = await db.select().from(diagnoses).where(eq(diagnoses.recoveryCaseId, recoveryCase.id));
    if (!storedDiagnoses.length) {
      await db.insert(diagnoses).values({
        recoveryCaseId: recoveryCase.id,
        failureCause: snapshot.diagnosis.failureCause,
        confidenceBps: snapshot.diagnosis.confidenceBps,
        evidenceJson: JSON.stringify(snapshot.diagnosis.evidence),
        explanation: snapshot.diagnosis.explanation,
        recommendedAction: snapshot.diagnosis.recommendedAction,
        uncertaintyReason: snapshot.diagnosis.uncertaintyReason ?? null,
        modelId: snapshot.diagnosis.modelId,
        promptVersion: "recoverflow-v1",
      });
    }
  }

  if (snapshot.actionType) {
    const existingActions = await db.select().from(recoveryActions).where(eq(recoveryActions.recoveryCaseId, recoveryCase.id));
    if (!existingActions.some(action => action.actionType === snapshot.actionType)) {
      const status = snapshot.state === "RECOVERED" ? "SUCCEEDED" : snapshot.state === "STOPPED" ? "SKIPPED" : snapshot.state === "AWAITING_OUTCOME" ? "DISPATCHED" : "PLANNED";
      await db.insert(recoveryActions).values({
        recoveryCaseId: recoveryCase.id,
        actionType: snapshot.actionType,
        status,
        idempotencyKey: `sandbox:${snapshot.caseReference}:${snapshot.actionType}`,
        actionPayloadJson: JSON.stringify({ amountPaise: snapshot.candidate.amountPaise, customerIdentity: snapshot.candidate.customerIdentity }),
        attemptNumber: snapshot.candidate.retryCount,
        providerReference: snapshot.paymentLink?.providerReference ?? null,
        expiresAt: snapshot.paymentLink?.expiresAt ?? null,
        completedAt: ["RECOVERED", "STOPPED", "EXCEPTION"].includes(snapshot.state) ? new Date() : null,
      });
    }
  }

  if (snapshot.state === "APPROVAL_PENDING") {
    const requests = await db.select().from(approvalRequests).where(eq(approvalRequests.recoveryCaseId, recoveryCase.id));
    if (!requests.some(request => request.status === "PENDING")) {
      await db.insert(approvalRequests).values({
        recoveryCaseId: recoveryCase.id,
        recommendedAction: snapshot.actionType ?? "HUMAN_ESCALATION",
        rationale: "Sandbox policy requires merchant approval before action execution.",
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      });
    }
  }

  const persistedAudit = await db.select().from(auditEntries).where(eq(auditEntries.recoveryCaseId, recoveryCase.id)).orderBy(desc(auditEntries.sequence));
  const start = persistedAudit.length;
  for (const entry of snapshot.audit.slice(start)) {
    await appendAuditEntry({ recoveryCaseId: recoveryCase.id, actorType: entry.actor, eventType: entry.event, payload: { detail: entry.detail, time: entry.time } });
  }
  return { merchantId: merchant.id, recoveryCaseId: recoveryCase.id, policyVersion: policy.version };
}
