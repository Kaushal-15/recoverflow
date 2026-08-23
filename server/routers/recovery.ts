import { z } from "zod";
import { adminProcedure, router } from "../_core/trpc";
import type { RecoveryCandidate, RecoveryPolicyInput } from "../../shared/recovery";
import { planRecovery } from "../recovery/orchestrator";
import { SandboxPaymentLinkAdapter } from "../recovery/paymentLinkAdapter";
import { buildEvaluationReport, buildSyntheticBatch, demoPolicy as simulationPolicy } from "../recovery/simulator";
import { applySandboxOutcome, decideSandboxApproval, getSandboxPolicy, getSandboxSnapshot, hydrateSandboxCase, hydrateSandboxPolicy, ingestSandboxBatch, ingestSandboxEvent, runManualRecovery, triggerSandboxFailure, updateSandboxPolicy } from "../recovery/sandboxEngine";
import { getSandboxCaseForPersistence } from "../recovery/sandboxEngine";
import { createMerchantPolicyVersion, persistSandboxCaseForUser } from "../db";
import { bootstrapSupabaseRecoveryWorkspace, createSupabaseMerchantPolicyVersion, getSupabaseCaseRuntimeSnapshot, getSupabaseDashboardSnapshotForUser, persistSandboxCaseForSupabaseUser } from "../persistence/supabaseRecoveryRepository";

async function persistForAuthenticatedMerchant(user: { id: number | string; email: string | null; name: string | null } | null | undefined, caseId: string) {
  if (typeof user?.id === "string") {
    return persistSandboxCaseForSupabaseUser({ id: user.id, email: user.email, name: user.name }, getSandboxCaseForPersistence(caseId));
  }
  if (typeof user?.id !== "number") return null;
  try {
    return await persistSandboxCaseForUser(user.id, getSandboxCaseForPersistence(caseId));
  } catch (error) {
    console.error("[Recovery] Durable sandbox persistence failed", error);
    return null;
  }
}

async function hydrateSupabasePolicyForMutation(user: { id: number | string; email: string | null; name: string | null } | null | undefined) {
  if (typeof user?.id !== "string") return;
  const supabaseUser = { id: user.id, email: user.email, name: user.name };
  await bootstrapSupabaseRecoveryWorkspace(supabaseUser);
  const workspace = await getSupabaseDashboardSnapshotForUser(supabaseUser);
  if (!workspace) throw new Error("Supabase recovery workspace is not configured");
  hydrateSandboxPolicy(workspace.policy);
}

async function hydrateSupabaseCaseForMutation(user: { id: number | string; email: string | null; name: string | null } | null | undefined, caseId: string) {
  if (typeof user?.id !== "string") return;
  const supabaseUser = { id: user.id, email: user.email, name: user.name };
  const restored = await getSupabaseCaseRuntimeSnapshot(supabaseUser, caseId);
  if (!restored) throw new Error("Persisted recovery case was not found for this administrator");
  hydrateSandboxPolicy(restored.policy);
  hydrateSandboxCase(restored.case);
}

const demoPolicy: RecoveryPolicyInput = simulationPolicy;

export const recoveryRouter = router({
  overview: adminProcedure.query(async ({ ctx }) => {
    if (typeof ctx.user?.id === "string") {
      const user = { id: ctx.user.id, email: ctx.user.email, name: ctx.user.name };
      await bootstrapSupabaseRecoveryWorkspace(user);
      const persisted = await getSupabaseDashboardSnapshotForUser(user);
      if (!persisted) throw new Error("Supabase recovery workspace is not configured");
      return {
        sandboxNotice: "Razorpay Test Mode — Sandbox: no real money is moved.",
        policy: {
          version: persisted.policy.version,
          autoActionCap: `₹${(persisted.policy.autoActionAmountCapPaise / 100).toLocaleString("en-IN")}`,
          confidenceFloor: `${persisted.policy.minimumConfidenceBps / 100}%`,
          retryLimit: persisted.policy.maxRetries,
          consentRequired: persisted.policy.requiresConsent,
          reminderMaxContacts: persisted.policy.reminderMaxContacts,
          approvedActions: persisted.policy.permittedActionTypes.map(item => item.replaceAll("_", " ")),
        },
        metrics: persisted.metrics,
        comparators: buildEvaluationReport().comparators,
        cases: persisted.cases,
        audit: persisted.audit,
        receipts: persisted.receipts,
      };
    }
    const evaluation = buildEvaluationReport();
    const sandbox = getSandboxSnapshot();
    const policy = getSandboxPolicy();
    return {
    sandboxNotice: "Razorpay Test Mode — Sandbox: no real money is moved.",
    policy: {
      version: policy.version,
      autoActionCap: `₹${(policy.autoActionAmountCapPaise / 100).toLocaleString("en-IN")}`,
      confidenceFloor: `${policy.minimumConfidenceBps / 100}%`,
      retryLimit: policy.maxRetries,
      consentRequired: policy.requiresConsent,
      reminderMaxContacts: policy.reminderMaxContacts,
      approvedActions: policy.permittedActionTypes.map(item => item.replaceAll("_", " ")),
    },
    metrics: {
      recoveredRevenuePaise: evaluation.recoverflow.recoveredRevenuePaise,
      revenueAtRiskPaise: evaluation.recoverflow.eligibleRevenueAtRiskPaise,
      recoveryRate: evaluation.recoverflow.recoveryRate,
      actionPrecision: evaluation.recoverflow.actionPrecision,
      falsePositiveCostPaise: evaluation.recoverflow.falsePositiveCostPaise,
      exceptionRate: evaluation.exceptionRate,
      baselineLift: evaluation.baselineLift,
      stoppingRuleCompliance: evaluation.recoverflow.stoppingRuleCompliance,
      recordCount: evaluation.recordCount,
      heldOutCount: evaluation.heldOutCount,
    },
    comparators: evaluation.comparators,
    cases: sandbox.cases,
    audit: sandbox.audit,
    receipts: sandbox.receipts,
    };
  }),
  previewManualRecovery: adminProcedure.input(z.object({ caseId: z.string() })).mutation(async ({ input, ctx }) => {
    await hydrateSupabaseCaseForMutation(ctx.user, input.caseId);
    const result = await runManualRecovery(input.caseId);
    await persistForAuthenticatedMerchant(ctx.user, input.caseId);
    return result;
  }),
  policy: adminProcedure.query(async ({ ctx }) => {
    if (typeof ctx.user?.id !== "string") return getSandboxPolicy();
    const user = { id: ctx.user.id, email: ctx.user.email, name: ctx.user.name };
    await bootstrapSupabaseRecoveryWorkspace(user);
    const persisted = await getSupabaseDashboardSnapshotForUser(user);
    if (!persisted) throw new Error("Supabase recovery workspace is not configured");
    return persisted.policy;
  }),
  updatePolicy: adminProcedure.input(z.object({
    eligibleFailureTypes: z.array(z.enum(["TEMPORARY_DECLINE", "CUSTOMER_FRICTION", "INSUFFICIENT_CONTEXT", "UNSUPPORTED"])).min(1),
    permittedActionTypes: z.array(z.enum(["NO_ACTION", "SIMULATED_RETRY", "PAYMENT_LINK_FALLBACK", "REMINDER", "HUMAN_ESCALATION"])).min(1),
    autoActionAmountCapPaise: z.number().int().min(1).max(500_000),
    maxRetries: z.number().int().min(0).max(5),
    requiresConsent: z.boolean(),
    minimumConfidenceBps: z.number().int().min(0).max(10_000),
    reminderMaxContacts: z.number().int().min(0).max(5),
  })).mutation(async ({ input, ctx }) => {
    const policy = updateSandboxPolicy(input);
    if (typeof ctx.user?.id === "string") await createSupabaseMerchantPolicyVersion({ id: ctx.user.id, email: ctx.user.email, name: ctx.user.name }, input);
    if (typeof ctx.user?.id === "number") await createMerchantPolicyVersion(ctx.user.id, input);
    return policy;
  }),
  ingestSandboxEvent: adminProcedure.input(z.object({
    sourceEventId: z.string(), externalPaymentId: z.string(), amountPaise: z.number().int().positive(), customerIdentity: z.string(),
    failureType: z.enum(["TEMPORARY_DECLINE", "CUSTOMER_FRICTION", "INSUFFICIENT_CONTEXT", "UNSUPPORTED"]), consentGranted: z.boolean(),
    confidenceBps: z.number().int().min(0).max(10_000).optional(), retryCount: z.number().int().min(0).max(5).optional(),
  })).mutation(async ({ input, ctx }) => {
    await hydrateSupabasePolicyForMutation(ctx.user);
    const result = await ingestSandboxEvent(input);
    await persistForAuthenticatedMerchant(ctx.user, result.case.id);
    return result;
  }),
  ingestSandboxBatch: adminProcedure.input(z.object({ limit: z.number().int().min(1).max(200).default(25) })).mutation(async ({ input, ctx }) => {
    await hydrateSupabasePolicyForMutation(ctx.user);
    const records = buildSyntheticBatch().slice(0, input.limit).map(record => ({
      sourceEventId: record.sourceEventId, externalPaymentId: record.externalPaymentId, amountPaise: record.amountPaise,
      customerIdentity: record.customerIdentity, failureType: record.failureType, consentGranted: record.consentGranted,
      confidenceBps: record.confidenceBps, retryCount: record.retryCount,
    }));
    const result = await ingestSandboxBatch(records);
    if (ctx.user?.id) await Promise.all(result.results.map(item => persistForAuthenticatedMerchant(ctx.user, item.case.id)));
    return result;
  }),
  decideApproval: adminProcedure.input(z.object({ caseId: z.string(), decision: z.enum(["APPROVE", "REJECT"]) })).mutation(async ({ input, ctx }) => {
    await hydrateSupabaseCaseForMutation(ctx.user, input.caseId);
    const result = await decideSandboxApproval(input.caseId, input.decision);
    await persistForAuthenticatedMerchant(ctx.user, input.caseId);
    return result;
  }),
  applyOutcome: adminProcedure.input(z.object({ caseId: z.string(), outcome: z.enum(["RECOVERED", "EXPIRED", "CONFLICT"]) })).mutation(async ({ input, ctx }) => {
    await hydrateSupabaseCaseForMutation(ctx.user, input.caseId);
    const result = applySandboxOutcome(input.caseId, input.outcome);
    await persistForAuthenticatedMerchant(ctx.user, input.caseId);
    return result;
  }),
  runFailureScenario: adminProcedure.input(z.object({ scenario: z.enum(["DUPLICATE_EVENT", "INVALID_SIGNATURE", "EXPIRED_LINK", "CONFLICTING_OUTCOME", "MISSING_CONSENT"]) })).mutation(({ input }) => triggerSandboxFailure(input.scenario)),
});
