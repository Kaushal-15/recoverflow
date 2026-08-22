import { desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { auditEntries, InsertUser, merchantPolicies, merchantProfiles, users } from "../drizzle/schema";
import { ENV } from './_core/env';
import { buildAuditEntry, type AuditActorType } from "./recovery/audit";

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
