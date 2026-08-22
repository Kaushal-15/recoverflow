import { createHash } from "node:crypto";

export type AuditActorType = "SYSTEM" | "MERCHANT" | "RAZORPAY" | "AI";

export type AuditEntryInput = {
  recoveryCaseId: number;
  sequence: number;
  actorType: AuditActorType;
  eventType: string;
  payload: Record<string, unknown>;
  previousHash: string | null;
};

export function canonicalize(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(",")}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record).sort().map(key => `${JSON.stringify(key)}:${canonicalize(record[key])}`).join(",")}}`;
}

export function buildAuditEntry(input: AuditEntryInput) {
  const payloadJson = canonicalize(input.payload);
  const preimage = canonicalize({
    recoveryCaseId: input.recoveryCaseId,
    sequence: input.sequence,
    actorType: input.actorType,
    eventType: input.eventType,
    payloadJson,
    previousHash: input.previousHash,
  });
  const entryHash = createHash("sha256").update(preimage).digest("hex");
  return { payloadJson, entryHash };
}
