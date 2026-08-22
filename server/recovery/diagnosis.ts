import { invokeLLM, listLLMModels } from "../_core/llm";
import type { RecoveryActionType, RecoveryCandidate } from "../../shared/recovery";

export type GroundedDiagnosis = {
  failureCause: RecoveryCandidate["failureType"];
  confidenceBps: number;
  evidence: Array<{ field: string; observedValue: string; relevance: string }>;
  explanation: string;
  recommendedAction: RecoveryActionType;
  uncertaintyReason?: string;
  modelId: string;
};

const ACTIONS: RecoveryActionType[] = ["NO_ACTION", "SIMULATED_RETRY", "PAYMENT_LINK_FALLBACK", "REMINDER", "HUMAN_ESCALATION"];

export async function diagnoseWithGroundedAI(input: {
  candidate: RecoveryCandidate;
  permittedActions: RecoveryActionType[];
}): Promise<GroundedDiagnosis> {
  const fallback = deterministicDiagnosis(input.candidate, input.permittedActions);
  try {
    const { data: models } = await listLLMModels();
    const model = models.find(item => item.id === "gpt-5-mini")?.id;
    const response = await invokeLLM({
      model,
      messages: [
        {
          role: "system",
          content: "You are RecoverFlow's payment-recovery diagnosis component. Return only strict JSON. You may diagnose from the supplied evidence only. Never alter amount, customer identity, external payment id, policy limits, retry limits, or consent. Recommend exactly one action from the supplied allowed actions. If evidence is insufficient, use INSUFFICIENT_CONTEXT, low confidence, and HUMAN_ESCALATION or NO_ACTION.",
        },
        {
          role: "user",
          content: JSON.stringify({
            immutablePaymentFacts: {
              amountPaise: input.candidate.amountPaise,
              customerIdentity: input.candidate.customerIdentity,
              externalPaymentId: input.candidate.externalPaymentId,
            },
            recoveryEvidence: {
              failureType: input.candidate.failureType,
              consentGranted: input.candidate.consentGranted,
              retryCount: input.candidate.retryCount,
              reminderCount: input.candidate.reminderCount,
              riskFlag: input.candidate.hasRiskFlag,
              ambiguous: input.candidate.isAmbiguous,
            },
            allowedActions: input.permittedActions,
          }),
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "recoverflow_diagnosis",
          strict: true,
          schema: {
            type: "object",
            properties: {
              failureCause: { type: "string", enum: ["TEMPORARY_DECLINE", "CUSTOMER_FRICTION", "INSUFFICIENT_CONTEXT", "UNSUPPORTED"] },
              confidenceBps: { type: "integer", minimum: 0, maximum: 10000 },
              evidence: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    field: { type: "string" },
                    observedValue: { type: "string" },
                    relevance: { type: "string" },
                  },
                  required: ["field", "observedValue", "relevance"],
                  additionalProperties: false,
                },
              },
              explanation: { type: "string" },
              recommendedAction: { type: "string", enum: ACTIONS },
              uncertaintyReason: { type: "string" },
            },
            required: ["failureCause", "confidenceBps", "evidence", "explanation", "recommendedAction", "uncertaintyReason"],
            additionalProperties: false,
          },
        },
      },
    });
    const content = response.choices[0]?.message?.content;
    if (typeof content !== "string") return fallback;
    const parsed = JSON.parse(content);
    if (!ACTIONS.includes(parsed.recommendedAction) || !input.permittedActions.includes(parsed.recommendedAction)) return fallback;
    return { ...parsed, modelId: model ?? "platform-default" } as GroundedDiagnosis;
  } catch {
    return fallback;
  }
}

export function deterministicDiagnosis(candidate: RecoveryCandidate, permittedActions: RecoveryActionType[]): GroundedDiagnosis {
  const recommendedAction = chooseFallbackAction(candidate, permittedActions);
  const lowConfidence = candidate.failureType === "INSUFFICIENT_CONTEXT" || candidate.failureType === "UNSUPPORTED";
  return {
    failureCause: candidate.failureType,
    confidenceBps: lowConfidence ? 5_400 : candidate.hasRiskFlag || candidate.isAmbiguous ? 7_200 : 9_100,
    evidence: [
      { field: "failureType", observedValue: candidate.failureType, relevance: "Determines the recovery strategy class." },
      { field: "retryCount", observedValue: String(candidate.retryCount), relevance: "Prevents excessive recovery attempts." },
      { field: "consentGranted", observedValue: String(candidate.consentGranted), relevance: "Required before any customer-contact action." },
    ],
    explanation: `The verified failure is classified as ${candidate.failureType}. The recommendation is restricted to the merchant-approved action set and the immutable payment facts are unchanged.`,
    recommendedAction,
    uncertaintyReason: lowConfidence ? "Insufficient evidence for an unattended recovery action." : undefined,
    modelId: "deterministic-sandbox-fallback",
  };
}

function chooseFallbackAction(candidate: RecoveryCandidate, permittedActions: RecoveryActionType[]): RecoveryActionType {
  if (candidate.hasRiskFlag || candidate.isAmbiguous || candidate.failureType === "INSUFFICIENT_CONTEXT" || candidate.failureType === "UNSUPPORTED") {
    return permittedActions.includes("HUMAN_ESCALATION") ? "HUMAN_ESCALATION" : "NO_ACTION";
  }
  if (candidate.failureType === "CUSTOMER_FRICTION" && candidate.retryCount > 0 && permittedActions.includes("REMINDER")) return "REMINDER";
  if (candidate.failureType === "TEMPORARY_DECLINE" && permittedActions.includes("SIMULATED_RETRY")) return "SIMULATED_RETRY";
  if (permittedActions.includes("PAYMENT_LINK_FALLBACK")) return "PAYMENT_LINK_FALLBACK";
  return "NO_ACTION";
}
