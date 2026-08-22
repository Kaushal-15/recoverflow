import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import type { RecoveryCandidate, RecoveryPolicyInput } from "../../shared/recovery";
import { planRecovery } from "../recovery/orchestrator";
import { SandboxPaymentLinkAdapter } from "../recovery/paymentLinkAdapter";
import { buildEvaluationReport, buildSyntheticBatch, demoPolicy as simulationPolicy } from "../recovery/simulator";
import { applySandboxOutcome, decideSandboxApproval, getSandboxPolicy, getSandboxSnapshot, ingestSandboxBatch, ingestSandboxEvent, runManualRecovery, triggerSandboxFailure, updateSandboxPolicy } from "../recovery/sandboxEngine";

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
    };
  }),
  previewManualRecovery: publicProcedure.input(z.object({ caseId: z.string() })).mutation(async ({ input }) => runManualRecovery(input.caseId)),
  policy: publicProcedure.query(() => getSandboxPolicy()),
  updatePolicy: publicProcedure.input(z.object({
    autoActionAmountCapPaise: z.number().int().min(1).max(500_000),
    maxRetries: z.number().int().min(0).max(5),
    requiresConsent: z.boolean(),
    minimumConfidenceBps: z.number().int().min(0).max(10_000),
    reminderMaxContacts: z.number().int().min(0).max(5),
  })).mutation(({ input }) => updateSandboxPolicy(input)),
  ingestSandboxEvent: publicProcedure.input(z.object({
    sourceEventId: z.string(), externalPaymentId: z.string(), amountPaise: z.number().int().positive(), customerIdentity: z.string(),
    failureType: z.enum(["TEMPORARY_DECLINE", "CUSTOMER_FRICTION", "INSUFFICIENT_CONTEXT", "UNSUPPORTED"]), consentGranted: z.boolean(),
    confidenceBps: z.number().int().min(0).max(10_000).optional(), retryCount: z.number().int().min(0).max(5).optional(),
  })).mutation(({ input }) => ingestSandboxEvent(input)),
  ingestSandboxBatch: publicProcedure.input(z.object({ limit: z.number().int().min(1).max(200).default(25) })).mutation(({ input }) => {
    const records = buildSyntheticBatch().slice(0, input.limit).map(record => ({
      sourceEventId: record.sourceEventId, externalPaymentId: record.externalPaymentId, amountPaise: record.amountPaise,
      customerIdentity: record.customerIdentity, failureType: record.failureType, consentGranted: record.consentGranted,
      confidenceBps: record.confidenceBps, retryCount: record.retryCount,
    }));
    return ingestSandboxBatch(records);
  }),
  decideApproval: publicProcedure.input(z.object({ caseId: z.string(), decision: z.enum(["APPROVE", "REJECT"]) })).mutation(({ input }) => decideSandboxApproval(input.caseId, input.decision)),
  applyOutcome: publicProcedure.input(z.object({ caseId: z.string(), outcome: z.enum(["RECOVERED", "EXPIRED", "CONFLICT"]) })).mutation(({ input }) => applySandboxOutcome(input.caseId, input.outcome)),
  runFailureScenario: publicProcedure.input(z.object({ scenario: z.enum(["DUPLICATE_EVENT", "INVALID_SIGNATURE", "EXPIRED_LINK", "CONFLICTING_OUTCOME", "MISSING_CONSENT"]) })).mutation(({ input }) => triggerSandboxFailure(input.scenario)),
});
