/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

import type {LegacyPaymentRefundIntent} from "./legacyPaymentRefundIntent";

/**
 * Canonical payment record stored at payments/{paymentId}.
 */
export interface PaymentDocument {
  userId: string;
  orderId: string;
  paymentId: string;
  eventId: string;
  amount: number;
  amountMinor?: number;
  currency: string;
  provider?: "razorpay" | "stripe";
  /**
   * refundFailed marks rejected admission with an unresolved refund. New records use cancellationRefund.state for pending versus reviewRequired; historical records without that intent need manual reconciliation. Only an observed full refund becomes refunded.
   */
  status: "pending" | "completed" | "failed" | "refunded" | "refundFailed";
  providerPaymentId?: string | null;
  checkoutSessionId?: string | null;
  hostUserId?: string;
  stripeAccountId?: string | null;
  applicationFeeAmount?: number;
  /**
   * Named host invite link attributed to this payment, when present.
   */
  inviteLinkId?: string | null;
  /**
   * Host-facing invite source copied from eventInviteLinks.
   */
  inviteSource?: string | null;
  /**
   * Pair hold consumed by this booking, when present.
   */
  crossPathsPairHoldId?: string | null;
  signUpFailed: boolean;
  /**
   * Serialized Firestore Timestamp fixture shape.
   */
  createdAt: {
    _seconds: number;
    _nanoseconds: number;
  };
  /**
   * Authoritative completion time for a successful payment. Older completed records may omit it and fall back to createdAt.
   */
  completedAt?: {
    _seconds: number;
    _nanoseconds: number;
  };
  /**
   * Internal demo seed marker used for cleanup and diagnostics.
   */
  synthetic?: boolean;
  /**
   * Internal demo seed prefix used for cleanup and diagnostics.
   */
  seedPrefix?: string;
  /**
   * Internal demo seed scenario name used for cleanup and diagnostics.
   */
  scenario?: string;
  /**
   * Internal demo-operations marker used for cleanup and diagnostics.
   */
  demoOps?: boolean;
  /**
   * Internal demo-operations id used for cleanup and diagnostics.
   */
  demoOpsId?: string;
  /**
   * Internal demo-operations command name used for cleanup and diagnostics.
   */
  demoOpsCommand?: string;
  cancellationRefund?: LegacyPaymentRefundIntent;
  /**
   * Serialized Firestore Timestamp fixture shape.
   */
  updatedAt?: {
    _seconds: number;
    _nanoseconds: number;
  };
  /**
   * What the payment provider charged for a captured payment, read from its payment entity: fee is the whole charge including tax, tax is the GST within it. Both in minor units. Absent until the payment is captured or when the provider did not report them.
   */
  providerFees?: {
    feePaise: number;
    taxPaise: number;
  };
  /**
   * Frozen server-origin context for a new native Razorpay booking. Missing legacy context is unresolved, never automatic ownership adoption.
   */
  razorpayOwnership?: {
    projectId: string;
    schema: "1";
  };
}
