CREATE TABLE `approvalRequests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`recoveryCaseId` int NOT NULL,
	`recommendedAction` enum('NO_ACTION','SIMULATED_RETRY','PAYMENT_LINK_FALLBACK','REMINDER','HUMAN_ESCALATION') NOT NULL,
	`status` enum('PENDING','APPROVED','REJECTED','EXPIRED') NOT NULL DEFAULT 'PENDING',
	`rationale` text NOT NULL,
	`requestedAt` timestamp NOT NULL DEFAULT (now()),
	`expiresAt` timestamp NOT NULL,
	`decidedByUserId` int,
	`decisionReason` text,
	`decidedAt` timestamp,
	CONSTRAINT `approvalRequests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `auditEntries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`recoveryCaseId` int NOT NULL,
	`sequence` int NOT NULL,
	`actorType` enum('SYSTEM','MERCHANT','RAZORPAY','AI') NOT NULL,
	`eventType` varchar(100) NOT NULL,
	`payloadJson` text NOT NULL,
	`previousHash` varchar(64),
	`entryHash` varchar(64) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `auditEntries_id` PRIMARY KEY(`id`),
	CONSTRAINT `auditEntries_entryHash_unique` UNIQUE(`entryHash`),
	CONSTRAINT `audit_case_sequence_unique` UNIQUE(`recoveryCaseId`,`sequence`)
);
--> statement-breakpoint
CREATE TABLE `diagnoses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`recoveryCaseId` int NOT NULL,
	`failureCause` enum('TEMPORARY_DECLINE','CUSTOMER_FRICTION','INSUFFICIENT_CONTEXT','UNSUPPORTED') NOT NULL,
	`confidenceBps` int NOT NULL,
	`evidenceJson` text NOT NULL,
	`explanation` text NOT NULL,
	`recommendedAction` enum('NO_ACTION','SIMULATED_RETRY','PAYMENT_LINK_FALLBACK','REMINDER','HUMAN_ESCALATION') NOT NULL,
	`uncertaintyReason` text,
	`modelId` varchar(120) NOT NULL,
	`promptVersion` varchar(40) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `diagnoses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `evaluationResults` (
	`id` int AUTO_INCREMENT NOT NULL,
	`evaluationRunId` int NOT NULL,
	`recoveryCaseId` int,
	`comparator` enum('NO_ACTION','SINGLE_RETRY','PAYMENT_LINK','RECOVERFLOW') NOT NULL,
	`split` enum('DEVELOPMENT','HELD_OUT') NOT NULL,
	`outcome` enum('RECOVERED','NOT_RECOVERED','FALSE_POSITIVE','EXCEPTION','STOPPED') NOT NULL,
	`recoveredAmountPaise` int NOT NULL DEFAULT 0,
	`falsePositiveCostPaise` int NOT NULL DEFAULT 0,
	`exceptionClass` varchar(120),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `evaluationResults_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `evaluationRuns` (
	`id` int AUTO_INCREMENT NOT NULL,
	`merchantId` int NOT NULL,
	`policyVersion` int NOT NULL,
	`datasetVersion` varchar(80) NOT NULL,
	`seed` int NOT NULL,
	`runType` enum('DEVELOPMENT','HELD_OUT','DEMO') NOT NULL,
	`status` enum('PENDING','RUNNING','COMPLETED','FAILED') NOT NULL,
	`startedAt` timestamp,
	`completedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `evaluationRuns_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `merchantPolicies` (
	`id` int AUTO_INCREMENT NOT NULL,
	`merchantId` int NOT NULL,
	`version` int NOT NULL,
	`name` varchar(120) NOT NULL,
	`isActive` boolean NOT NULL DEFAULT true,
	`eligibleFailureTypesJson` text NOT NULL,
	`permittedActionTypesJson` text NOT NULL,
	`autoActionAmountCapPaise` int NOT NULL,
	`maxRetries` int NOT NULL,
	`requiresConsent` boolean NOT NULL DEFAULT true,
	`minimumConfidenceBps` int NOT NULL,
	`reminderMaxContacts` int NOT NULL,
	`escalationRulesJson` text NOT NULL,
	`stoppingConditionsJson` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `merchantPolicies_id` PRIMARY KEY(`id`),
	CONSTRAINT `merchant_policy_version_unique` UNIQUE(`merchantId`,`version`)
);
--> statement-breakpoint
CREATE TABLE `merchantProfiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`displayName` varchar(160) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `merchantProfiles_id` PRIMARY KEY(`id`),
	CONSTRAINT `merchantProfiles_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE TABLE `paymentEvents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`merchantId` int NOT NULL,
	`sourceEventId` varchar(128) NOT NULL,
	`sourceType` enum('WEBHOOK','BATCH','MANUAL') NOT NULL,
	`eventType` varchar(80) NOT NULL,
	`rawPayloadDigest` varchar(64) NOT NULL,
	`signatureStatus` enum('VERIFIED','NOT_APPLICABLE','INVALID','PENDING') NOT NULL,
	`externalPaymentId` varchar(128) NOT NULL,
	`amountPaise` int NOT NULL,
	`currency` varchar(12) NOT NULL DEFAULT 'INR',
	`customerIdentity` varchar(320) NOT NULL,
	`consentGranted` boolean NOT NULL DEFAULT false,
	`failureType` enum('TEMPORARY_DECLINE','CUSTOMER_FRICTION','INSUFFICIENT_CONTEXT','UNSUPPORTED') NOT NULL,
	`failureCode` varchar(120),
	`payloadJson` text NOT NULL,
	`occurredAt` timestamp NOT NULL,
	`receivedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `paymentEvents_id` PRIMARY KEY(`id`),
	CONSTRAINT `payment_event_source_unique` UNIQUE(`merchantId`,`sourceEventId`)
);
--> statement-breakpoint
CREATE TABLE `policyEvaluations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`recoveryCaseId` int NOT NULL,
	`policyId` int NOT NULL,
	`policyVersion` int NOT NULL,
	`eligible` boolean NOT NULL,
	`requiresApproval` boolean NOT NULL,
	`matchedRulesJson` text NOT NULL,
	`permittedActionTypesJson` text NOT NULL,
	`stoppingReason` varchar(160),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `policyEvaluations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `recoveryActions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`recoveryCaseId` int NOT NULL,
	`actionType` enum('NO_ACTION','SIMULATED_RETRY','PAYMENT_LINK_FALLBACK','REMINDER','HUMAN_ESCALATION') NOT NULL,
	`status` enum('PLANNED','DISPATCHED','SUCCEEDED','FAILED','EXPIRED','SKIPPED') NOT NULL,
	`idempotencyKey` varchar(128) NOT NULL,
	`actionPayloadJson` text NOT NULL,
	`attemptNumber` int NOT NULL,
	`providerReference` varchar(160),
	`expiresAt` timestamp,
	`completedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `recoveryActions_id` PRIMARY KEY(`id`),
	CONSTRAINT `recoveryActions_idempotencyKey_unique` UNIQUE(`idempotencyKey`)
);
--> statement-breakpoint
CREATE TABLE `recoveryCases` (
	`id` int AUTO_INCREMENT NOT NULL,
	`caseReference` varchar(40) NOT NULL,
	`merchantId` int NOT NULL,
	`paymentEventId` int NOT NULL,
	`policyId` int NOT NULL,
	`policyVersion` int NOT NULL,
	`source` enum('WEBHOOK','BATCH','MANUAL') NOT NULL,
	`state` enum('RECEIVED','INGESTED','POLICY_EVALUATING','DIAGNOSING','ACTION_DECIDED','APPROVAL_PENDING','ACTION_QUEUED','ACTION_ATTEMPTED','AWAITING_OUTCOME','RECOVERED','STOPPED','EXCEPTION','REJECTED','DUPLICATE_IGNORED') NOT NULL,
	`amountSnapshotPaise` int NOT NULL,
	`customerIdentitySnapshot` varchar(320) NOT NULL,
	`externalPaymentIdSnapshot` varchar(128) NOT NULL,
	`retryCount` int NOT NULL DEFAULT 0,
	`reminderCount` int NOT NULL DEFAULT 0,
	`riskFlagsJson` text NOT NULL,
	`terminalReason` varchar(160),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `recoveryCases_id` PRIMARY KEY(`id`),
	CONSTRAINT `recoveryCases_caseReference_unique` UNIQUE(`caseReference`),
	CONSTRAINT `recovery_case_payment_event_unique` UNIQUE(`paymentEventId`)
);
--> statement-breakpoint
CREATE TABLE `webhookReceipts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`merchantId` int NOT NULL,
	`sourceEventId` varchar(128) NOT NULL,
	`rawPayloadDigest` varchar(64) NOT NULL,
	`signatureStatus` enum('VERIFIED','INVALID','PENDING') NOT NULL,
	`processingStatus` enum('RECEIVED','REJECTED','DUPLICATE','PROCESSED','EXCEPTION') NOT NULL,
	`receivedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `webhookReceipts_id` PRIMARY KEY(`id`),
	CONSTRAINT `webhook_receipt_source_unique` UNIQUE(`merchantId`,`sourceEventId`)
);
--> statement-breakpoint
CREATE INDEX `approval_queue_idx` ON `approvalRequests` (`status`,`expiresAt`);--> statement-breakpoint
CREATE INDEX `audit_case_created_idx` ON `auditEntries` (`recoveryCaseId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `diagnosis_case_idx` ON `diagnoses` (`recoveryCaseId`);--> statement-breakpoint
CREATE INDEX `evaluation_result_run_idx` ON `evaluationResults` (`evaluationRunId`,`comparator`,`split`);--> statement-breakpoint
CREATE INDEX `merchant_policy_active_idx` ON `merchantPolicies` (`merchantId`,`isActive`);--> statement-breakpoint
CREATE INDEX `payment_event_payment_idx` ON `paymentEvents` (`merchantId`,`externalPaymentId`);--> statement-breakpoint
CREATE INDEX `policy_evaluation_case_idx` ON `policyEvaluations` (`recoveryCaseId`);--> statement-breakpoint
CREATE INDEX `recovery_action_case_idx` ON `recoveryActions` (`recoveryCaseId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `recovery_case_queue_idx` ON `recoveryCases` (`merchantId`,`state`,`createdAt`);