/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

export type ManagePublicEventCheckoutCallablePayload =
  | {
      action: "quote";
      eventId: string;
    }
  | {
      action: "prepare";
      eventId: string;
      requestId: string;
      displayName: string;
      reviewedQuote: {
        eventId: string;
        eventName: string;
        registrationRevision: number;
        startTimeMillis: number;
        amountPaise: number;
        currency: "INR";
        cancellationPolicy: {
          refundDeadlineMillis: number;
          eventStartsAtMillis: number;
        };
        /**
         * Present only when a paid host membership price applies: the list price the member would otherwise pay.
         */
        listAmountPaise?: number;
      };
      inviteToken: string | null;
    }
  | {
      action: "status";
      paymentId: string;
      callback: {
        paymentId: string;
        signature: string;
      } | null;
    }
  | {
      action: "cancelAdmission";
      paymentId: string;
      expectedRefundAmountPaise: number;
    }
  | {
      action: "find";
      eventId: string;
    };
