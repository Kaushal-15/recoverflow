import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import type { RecoveryCandidate, RecoveryPolicyInput } from "../../shared/recovery";
import { planRecovery } from "../recovery/orchestrator";
import { SandboxPaymentLinkAdapter } from "../recovery/paymentLinkAdapter";
import { buildEvaluationReport, buildSyntheticBatch, demoPolicy as simulationPolicy } from "../recovery/simulator";
import { applySandboxOutcome, decideSandboxApproval, getSandboxPolicy, getSandboxSnapshot, ingestSandboxBatch, ingestSandboxEvent, runManualRecovery, triggerSandboxFailure, updateSandboxPolicy } from "../recovery/sandboxEngine";
import { getSandboxCaseForPersistence } from "../recovery/sandboxEngine";
import { createMerchantPolicyVersion, persistSandboxCaseForUser } from "../db";

async function persistForAuthenticatedMerchant(userId: number | undefined, caseId: string) {
  if (!userId) return null;
  try {
    return await persistSandboxCaseForUser(userId, getSandboxCaseForPersistence(caseId));
  } catch (error) {
    console.error("[Recovery] Durable sandbox persistence failed", error);
    return null;
  }
}

const demoPolicy: RecoveryPolicyInput = simulationPolicy;

export const recoveryRouter = router({
  overview: publicProcedure.query(() => {
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
  previewManualRecovery: publicProcedure.input(z.object({ caseId: z.string() })).mutation(async ({ input, ctx }) => {
    const result = await runManualRecovery(input.caseId);
    await persistForAuthenticatedMerchant(ctx.user?.id, input.caseId);
    return result;
  }),
  policy: publicProcedure.query(() => getSandboxPolicy()),
  updatePolicy: publicProcedure.input(z.object({
    eligibleFailureTypes: z.array(z.enum(["TEMPORARY_DECLINE", "CUSTOMER_FRICTION", "INSUFFICIENT_CONTEXT", "UNSUPPORTED"])).min(1),
    permittedActionTypes: z.array(z.enum(["NO_ACTION", "SIMULATED_RETRY", "PAYMENT_LINK_FALLBACK", "REMINDER", "HUMAN_ESCALATION"])).min(1),
    autoActionAmountCapPaise: z.number().int().min(1).max(500_000),
    maxRetries: z.number().int().min(0).max(5),
    requiresConsent: z.boolean(),
    minimumConfidenceBps: z.number().int().min(0).max(10_000),
    reminderMaxContacts: z.number().int().min(0).max(5),
  })).mutation(async ({ input, ctx }) => {
    const policy = updateSandboxPolicy(input);
    if (ctx.user?.id) await createMerchantPolicyVersion(ctx.user.id, input);
    return policy;
  }),
  ingestSandboxEvent: publicProcedure.input(z.object({
    sourceEventId: z.string(), externalPaymentId: z.string(), amountPaise: z.number().int().positive(), customerIdentity: z.string(),
    failureType: z.enum(["TEMPORARY_DECLINE", "CUSTOMER_FRICTION", "INSUFFICIENT_CONTEXT", "UNSUPPORTED"]), consentGranted: z.boolean(),
    confidenceBps: z.number().int().min(0).max(10_000).optional(), retryCount: z.number().int().min(0).max(5).optional(),
  })).mutation(async ({ input, ctx }) => {
    const result = await ingestSandboxEvent(input);
    await persistForAuthenticatedMerchant(ctx.user?.id, result.case.id);
    return result;
  }),
  ingestSandboxBatch: publicProcedure.input(z.object({ limit: z.number().int().min(1).max(200).default(25) })).mutation(async ({ input, ctx }) => {
    const records = buildSyntheticBatch().slice(0, input.limit).map(record => ({
      sourceEventId: record.sourceEventId, externalPaymentId: record.externalPaymentId, amountPaise: record.amountPaise,
      customerIdentity: record.customerIdentity, failureType: record.failureType, consentGranted: record.consentGranted,
      confidenceBps: record.confidenceBps, retryCount: record.retryCount,
    }));
    const result = await ingestSandboxBatch(records);
    if (ctx.user?.id) await Promise.all(result.results.map(item => persistForAuthenticatedMerchant(ctx.user?.id, item.case.id)));
    return result;
  }),
  decideApproval: publicProcedure.input(z.object({ caseId: z.string(), decision: z.enum(["APPROVE", "REJECT"]) })).mutation(async ({ input, ctx }) => {
    const result = await decideSandboxApproval(input.caseId, input.decision);
    await persistForAuthenticatedMerchant(ctx.user?.id, input.caseId);
    return result;
  }),
  applyOutcome: publicProcedure.input(z.object({ caseId: z.string(), outcome: z.enum(["RECOVERED", "EXPIRED", "CONFLICT"]) })).mutation(async ({ input, ctx }) => {
    const result = applySandboxOutcome(input.caseId, input.outcome);
    await persistForAuthenticatedMerchant(ctx.user?.id, input.caseId);
    return result;
  }),
  runFailureScenario: publicProcedure.input(z.object({ scenario: z.enum(["DUPLICATE_EVENT", "INVALID_SIGNATURE", "EXPIRED_LINK", "CONFLICTING_OUTCOME", "MISSING_CONSENT"]) })).mutation(({ input }) => triggerSandboxFailure(input.scenario)),
});
