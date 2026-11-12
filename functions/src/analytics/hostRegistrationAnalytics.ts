import {GUEST_PAYMENTS, type GuestPaymentPurpose} from
  "../payments/guestPayments";
import type {HostAnalyticsCallableResponse as Response}
  from "../shared/generated/hostAnalyticsCallableResponse";

import {
  formAdmissionOwnershipId,
  formAdmissionReceiptId,
} from "../organizerFormAdmission/admissionService";
import {
  admissionRequestHash,
  type AdmissionCommand,
} from "../organizerFormAdmission/admissionPolicy";
import {offerPaymentId}
  from "../payments/offerPayments/offerPaymentReservation";

type Row = { id: string; data: Record<string, unknown> };
export interface RegistrationRecords {
  versions: Row[];
  drafts: Row[];
  responses: Row[];
  formPayments: Row[];
  publicPayments: Row[];
  receipts: Row[];
  formAdmissions?: Row[];
  formAdmissionReceipts?: Row[];
  offerPayments?: Row[];
  incomplete: boolean;
  unavailable: boolean;
}
const rowLimit = 200;
// Only frozen accounting/identity linkage is projected. No answers, evidence,
// notes, payment links/instructions or provider checkout keys are read.
const termFields = [
  "eventPaymentRevision",
  "eventPaymentHash",
  "expectedAmountMinor",
  "currency",
  "expiresAtMillis",
  "collectionMode",
];
const routeFields = [
  "version",
  "amountMinor",
  "transferAmountMinor",
  "settlementHold",
  "purpose",
  "organizerId",
  "selection.route",
  "selection.mode",
  "selection.currency",
  "selection.merchantCountry",
  "policySource",
  "appRevision",
  "organizerRevision",
  "bindingId",
  "merchantAccountId",
  "destinationAccountId",
  "configurationVersion",
];
// Guest payments share one ledger; each export reads its own flow.
const guestPaymentPurposeOf: Record<string, GuestPaymentPurpose> = {
  formPayments: "form",
  publicPayments: "publicEvent",
  offerPayments: "offer",
};

const sources = [
  [
    "versions",
    "organizerFormVersions",
    [
      "organizerId",
      "formId",
      "definition.defaultTargetKind",
      "definition.defaultTargetId",
    ],
  ],
  [
    "drafts",
    "organizerFormResponseDrafts",
    ["organizerId", "formId", "versionId", "createdAt"],
  ],
  [
    "responses",
    "organizerFormResponses",
    [
      "organizerId",
      "formId",
      "versionId",
      "draftId",
      "status",
      "submittedAt",
    ],
  ],
  [
    "formPayments",
    GUEST_PAYMENTS,
    [
      "organizerId",
      "formId",
      "versionId",
      "draftId",
      "responseId",
      "status",
      "mode",
      "createdAt",
      "capturedAt",
      "refundedAmountPaise",
    ],
  ],
  [
    "publicPayments",
    GUEST_PAYMENTS,
    [
      "organizerId",
      "eventId",
      "status",
      "routing.selection.mode",
      "createdAt",
      "capturedAt",
      "admittedAt",
      "admissionReceiptId",
      "refundedAmountPaise",
    ],
  ],
  [
    "receipts",
    "publicEventAdmissionReceipts",
    [
      "organizerId",
      "eventId",
      "paymentId",
      "routing.selection.mode",
      "admittedAtMillis",
    ],
  ],
  [
    "formAdmissions",
    "organizerFormAdmissions",
    [
      "organizerId",
      "eventId",
      "responseId",
      "receiptId",
      "attendeeId",
      "canonicalSeatKey",
      "offerId",
      "offerRevision",
      "offerGeneration",
    ],
  ],
  [
    "formAdmissionReceipts",
    "organizerFormAdmissionReceipts",
    [
      "organizerId",
      "eventId",
      "responseId",
      "contactId",
      "offerId",
      "expectedOfferRevision",
      "expectedOfferGeneration",
      "expectedLedgerRevision",
      "requestId",
      "receiptId",
      "attendeeId",
      "canonicalSeatKey",
      "requestHash",
      "resultingLedgerRevision",
      "admittedAtMillis",
      "actorUid",
      ...termFields.map((field) => `paymentSnapshot.${field}`),
      "manualPayment.status",
      "manualPayment.bankReceiptChecked",
      "manualPayment.reviewedByUid",
      "manualPayment.reviewedAtMillis",
      "manualPayment.attestedAmountMinor",
      "manualPayment.attestedCurrency",
      "manualPayment.attestedEventPaymentRevision",
      "manualPayment.attestedEventPaymentHash",
      "applicationApproval.applicationId",
      "applicationApproval.contactId",
      "applicationApproval.revision",
      "applicationApproval.reviewedAtMillis",
      "providerPayment.paymentId",
      "providerPayment.providerOrderId",
      "providerPayment.providerPaymentId",
      "providerPayment.recipientUid",
      "providerPayment.grantId",
      "providerPayment.capturedAtMillis",
      ...routeFields.map((field) => `providerPayment.routing.${field}`),
    ],
  ],
  [
    "offerPayments",
    GUEST_PAYMENTS,
    [
      "organizerId",
      "eventId",
      "offerId",
      "responseId",
      "contactId",
      "recipientUid",
      "grantId",
      "requestId",
      "canonicalSeatKey",
      "offerGeneration",
      "offerRevision",
      "amountPaise",
      "currency",
      "receipt",
      "status",
      "providerOrderId",
      "providerPaymentId",
      "refundedAmountPaise",
      "admissionReceiptId",
      "createdAt",
      "capturedAt",
      "admittedAt",
      "cancellation.refundAmountPaise",
      "cancellation.reason",
      ...termFields.map((field) => `paymentSnapshot.${field}`),
      ...routeFields.map((field) => `routing.${field}`),
    ],
  ],
] as const;

/** Reads projected server facts only, with a hard per-source/organizer cap.
 * Date filtering follows each stage's actual timestamp, not event start date.
 */
export async function loadHostRegistrationAnalytics(
  db: FirebaseFirestore.Firestore,
  organizerIds: string[],
  eventId: string | null,
  range: { start: Date; endExclusive: Date }
): Promise<Pick<Response, "summaryCards" | "dataQuality">> {
  const records: RegistrationRecords = {
    versions: [],
    drafts: [],
    responses: [],
    formPayments: [],
    publicPayments: [],
    receipts: [],
    formAdmissions: [],
    formAdmissionReceipts: [],
    offerPayments: [],
    incomplete: false,
    unavailable: false,
  };
  await Promise.all(
    [...new Set(organizerIds)].map(async (organizerId) => {
      await Promise.all(
        sources.map(async ([key, collection, fields]) => {
          try {
            let query = db
              .collection(collection)
              .where("organizerId", "==", organizerId);
            const purpose = guestPaymentPurposeOf[key];
            if (purpose) query = query.where("purpose", "==", purpose);
            if (
              eventId &&
              [
                "publicPayments",
                "receipts",
                "formAdmissions",
                "formAdmissionReceipts",
                "offerPayments",
              ].includes(key)
            ) {
              query = query.where("eventId", "==", eventId);
            }
            const snapshot = await query
              .select(...fields)
              .limit(rowLimit + 1)
              .get();
            if (snapshot.docs.length > rowLimit) records.incomplete = true;
            for (const doc of snapshot.docs.slice(0, rowLimit)) {
              const data = doc.data();
              if (data.organizerId !== organizerId) {
                records.incomplete = true;
                continue;
              }
              records[key]!.push({id: doc.id, data});
            }
          } catch {
            records.unavailable = true;
          }
        })
      );
    })
  );
  return buildHostRegistrationAnalytics(
    records,
    organizerIds,
    eventId,
    range
  );
}

/** Observed stage totals, never a conversion cohort or purchase assertion. */
export function buildHostRegistrationAnalytics(
  records: RegistrationRecords,
  organizerIds: string[],
  eventId: string | null,
  range: { start: Date; endExclusive: Date }
): Pick<Response, "summaryCards" | "dataQuality"> {
  const owners = new Set(organizerIds);
  const unique = (rows: Row[]) => [
    ...new Map(
      rows
        .filter((row) => owners.has(String(row.data.organizerId)))
        .map((row) => [row.id, row])
    ).values(),
  ];
  const versions = new Map(
    unique(records.versions).map((row) => [row.id, row.data])
  );
  const formScope = ({data}: Row) => {
    if (!eventId) return true;
    const version = versions.get(String(data.versionId));
    if (!version) records.incomplete = true;
    const definition = version?.definition as
      | Record<string, unknown>
      | undefined;
    return (
      version?.organizerId === data.organizerId &&
      version?.formId === data.formId &&
      definition?.defaultTargetKind === "event" &&
      definition.defaultTargetId === eventId
    );
  };
  const directScope = ({data}: Row) =>
    !eventId || data.eventId === eventId;
  const inRange = (value: unknown) => {
    const millis = timestampMillis(value);
    if (millis === null) records.incomplete = true;
    return (
      millis !== null &&
      millis >= range.start.getTime() &&
      millis < range.endExclusive.getTime()
    );
  };
  const count = (rows: Row[], predicate: (row: Row) => boolean) =>
    unique(rows).filter(predicate).length;
  const formLive = (data: Row["data"]) => data.mode === "live";
  const directLive = (data: Row["data"]) =>
    (data.routing as { selection?: { mode?: string } } | undefined)
      ?.selection?.mode === "live";
  const retainedCapture = (data: Row["data"], allowed: string[]) =>
    allowed.includes(String(data.status)) &&
    data.refundedAmountPaise === 0 &&
    inRange(data.capturedAt);
  const payments = new Map(
    unique(records.publicPayments)
      .filter(directScope)
      .map((row) => [row.id, row.data])
  );
  const admissions = offerAdmissionMetrics(
    records,
    unique,
    directScope,
    inRange
  );
  const specs: Array<[string, string, number, string]> = [
    [
      "internalFormDrafts",
      "Form drafts started",
      count(
        records.drafts,
        (row) => formScope(row) && inRange(row.data.createdAt)
      ),
      "Retained drafts created in range; expired " +
        "draft cleanup can lower this count.",
    ],
    [
      "internalFormSubmissions",
      "Form responses submitted",
      count(
        records.responses,
        (row) =>
          formScope(row) &&
          row.data.status === "submitted" &&
          inRange(row.data.submittedAt)
      ),
      "Current non-withdrawn submissions; not event admission.",
    ],
    [
      "internalFormCheckoutAttempts",
      "Form fee checkout attempts",
      count(
        records.formPayments,
        (row) =>
          formScope(row) &&
          formLive(row.data) &&
          inRange(row.data.createdAt)
      ),
      "Live server-created fee attempts, including unfinished checkout.",
    ],
    [
      "internalFormFeesCaptured",
      "Form fees captured",
      count(
        records.formPayments,
        (row) =>
          formScope(row) &&
          formLive(row.data) &&
          retainedCapture(row.data, ["captured", "submitted"])
      ),
      "Verified live fee captures retained without refund; not admission.",
    ],
    [
      "internalDirectCheckoutAttempts",
      "Direct checkout attempts",
      count(
        records.publicPayments,
        (row) =>
          directScope(row) &&
          directLive(row.data) &&
          inRange(row.data.createdAt)
      ),
      "Direct public registration skips form and " +
        "approval stages; live attempts.",
    ],
    [
      "internalDirectPaymentsCaptured",
      "Direct payments captured",
      count(
        records.publicPayments,
        (row) =>
          directScope(row) &&
          directLive(row.data) &&
          retainedCapture(row.data, ["captured", "admitted"])
      ),
      "Verified live captures retained without " +
        "refund, distinct from admission.",
    ],
    [
      "internalDirectPaidAdmissions",
      "Direct paid admissions",
      count(records.receipts, ({id, data}) => {
        const payment = payments.get(String(data.paymentId));
        return (
          directScope({id, data}) &&
          directLive(data) &&
          inRange(data.admittedAtMillis) &&
          payment?.organizerId === data.organizerId &&
          payment?.eventId === data.eventId &&
          payment?.admissionReceiptId === id &&
          payment?.status === "admitted" &&
          payment?.refundedAmountPaise === 0 &&
          directLive(payment)
        );
      }),
      "Immutable admission receipt linked to a " +
        "current live, unrefunded payment.",
    ],
  ];
  specs.push(...admissions.specs);
  const status = records.unavailable ?
    "missing" :
    records.incomplete ?
      "partial" :
      "ready";
  return {
    summaryCards: specs.map(([id, label, value, caption]) => ({
      id,
      label,
      value,
      caption,
      unit: "count",
      status:
        id.startsWith("internalOffer") ||
        id === "internalFormFreeAdmissions" ||
        id === "internalFormAttestedAdmissions" ?
          admissions.missing ?
            "missing" :
            status :
          id === "internalFormDrafts" && status === "ready" ?
            "partial" :
            status,
      previousValue: null,
    })),
    dataQuality: [
      {
        id: "internal-registration-outcomes",
        state: records.unavailable || records.incomplete ? "missing" : "ok",
        detail:
          "Current server stages use their own timestamps, not cohort " +
          "conversion. Live captures differ from admission. Direct " +
          "registration skips forms/approval; form fees are not bookings.",
        owner: "Host platform",
        runbook: "docs/data_contracts.md",
        nextAction:
          records.incomplete || records.unavailable ?
            "Check organizer-wide form source caps and source " +
              "availability before interpreting totals." :
            "Read as separate observed stages; do not " +
              "calculate cohort conversion.",
      },
      {
        id: "internal-registration-coverage",
        state: "ok",
        detail:
          "Drafts/charges reflect retained current rows. Form admissions " +
          "are historical receipts, not active seats. " +
            "Test payments excluded. " +
          "Refunded charges excluded; offer cancelled " +
            "no-refund charges retained. " +
          "Direct free public RSVP is not counted.",
        owner: "Host platform",
        runbook: "docs/data_contracts.md",
        nextAction:
          "Historical admissions survive refund/cancellation. Charge " +
          "counts use capture time and current ledger " +
            "state, not refund-period " +
          "totals. Host attestations are not verified provider purchases.",
      },
      {
        id: "internal-registration-source-check",
        state: records.incomplete || records.unavailable ? "missing" : "ok",
        detail:
          (records.unavailable ?
            "A source query failed; counts are incomplete. " :
            "") +
          (records.incomplete ?
            "200-row per-organizer source cap or missing required scope/date " +
              "fields: lower bounds. " :
            "") +
          "Bounded server reads; no personal data returned.",
        owner: "Host platform",
        runbook: "docs/data_contracts.md",
        nextAction:
          records.incomplete || records.unavailable ?
            "Check organizer-wide form source caps and source availability." :
            "No source query failure or cap observed.",
      },
    ],
  };
}

/** Reporting proof over authentic projected facts, not admission authority.
 * Canonical writers validate complete documents; reporting preserves their
 * IDs, frozen terms and reciprocal linkage without reading private fields.
 */
function offerAdmissionMetrics(
  records: RegistrationRecords,
  unique: (rows: Row[]) => Row[],
  eventScope: (row: Row) => boolean,
  inRange: (value: unknown) => boolean
): { specs: Array<[string, string, number, string]>; missing: boolean } {
  const missing =
    !records.formAdmissions ||
    !records.formAdmissionReceipts ||
    !records.offerPayments;
  const ownership = new Map(
    unique(records.formAdmissions ?? []).map((row) => [row.id, row.data])
  );
  const payments = new Map(
    unique(records.offerPayments ?? [])
      .filter(eventScope)
      .map((row) => [row.id, row.data])
  );
  const unknown = () => {
    records.incomplete = true;
    return false;
  };
  const positive = (value: unknown): value is number =>
    typeof value === "number" && Number.isSafeInteger(value) && value > 0;
  const nonempty = (value: unknown): value is string =>
    typeof value === "string" && value.length > 0;
  const termsValid = (terms: Record<string, unknown>) =>
    termFields.every((field) => field in terms) &&
    positive(terms.eventPaymentRevision) &&
    /^[a-f0-9]{64}$/u.test(String(terms.eventPaymentHash)) &&
    positive(terms.expiresAtMillis) &&
    typeof terms.expectedAmountMinor === "number" &&
    Number.isSafeInteger(terms.expectedAmountMinor) &&
    terms.expectedAmountMinor >= 0 &&
    ((terms.expectedAmountMinor === 0 && terms.currency === null) ||
      /^[A-Z]{3}$/u.test(String(terms.currency))) &&
    [
      null,
      "manualInstructions",
      "reusablePage",
      "personalRequest",
      "catchCheckout",
    ].includes(terms.collectionMode as string | null);
  const routingValid = (
    routing: Record<string, unknown>,
    data: Row["data"]
  ) =>
    routeFields.every((field) => pathValue(routing, field) !== undefined) &&
    routing.version === 1 &&
    routing.organizerId === data.organizerId &&
    routing.purpose === "eventAdmission" &&
    routing.amountMinor === data.amountPaise &&
    pathValue(routing, "selection.currency") === data.currency &&
    [
      "razorpayRoute",
      "razorpayOAuth",
      "stripeConnectDirect",
      "stripeConnectDestination",
    ].includes(String(pathValue(routing, "selection.route")));
  const paymentValid = ({id, data}: Row) => {
    const mode = pathValue(data, "routing.selection.mode");
    if (mode === "test") return false;
    const terms = asObject(data.paymentSnapshot);
    if (
      mode !== "live" ||
      !termsValid(terms) ||
      terms.collectionMode !== "catchCheckout" ||
      terms.currency !== "INR" ||
      data.currency !== "INR" ||
      !positive(data.amountPaise) ||
      terms.expectedAmountMinor !== data.amountPaise ||
      !routingValid(asObject(data.routing), data) ||
      ![
        "organizerId",
        "eventId",
        "responseId",
        "contactId",
        "offerId",
        "recipientUid",
        "grantId",
        "requestId",
        "canonicalSeatKey",
      ].every((field) => nonempty(data[field])) ||
      !positive(data.offerRevision) ||
      !positive(data.offerGeneration)
    ) {
      return unknown();
    }
    try {
      if (
        offerPaymentId(
          String(data.grantId),
          String(data.recipientUid),
          String(data.requestId)
        ) !== id ||
        data.receipt !== id
      ) {
        return unknown();
      }
    } catch {
      return unknown();
    }
    return true;
  };
  const captureValid = (data: Row["data"]) => {
    const created = timestampMillis(data.createdAt);
    const captured = timestampMillis(data.capturedAt);
    if (
      !nonempty(data.providerOrderId) ||
      !nonempty(data.providerPaymentId) ||
      created === null ||
      captured === null ||
      captured < created ||
      typeof data.refundedAmountPaise !== "number" ||
      !Number.isSafeInteger(data.refundedAmountPaise) ||
      data.refundedAmountPaise < 0 ||
      data.refundedAmountPaise > Number(data.amountPaise)
    ) {
      return unknown();
    }
    return true;
  };
  let attempts = 0;
  let captures = 0;
  for (const [id, data] of payments) {
    if (!paymentValid({id, data})) continue;
    if (inRange(data.createdAt)) attempts++;
    if (
      !["captured", "admitted", "cancelled"].includes(String(data.status))
    ) {
      continue;
    }
    if (!captureValid(data)) continue;
    if (
      data.status === "cancelled" &&
      pathValue(data, "cancellation.refundAmountPaise") !== 0
    ) {
      unknown();
      continue;
    }
    if (data.refundedAmountPaise === 0 && inRange(data.capturedAt)) {
      captures++;
    }
  }
  let free = 0;
  let attested = 0;
  let paid = 0;
  for (const {id, data} of unique(records.formAdmissionReceipts ?? [])) {
    if (!eventScope({id, data}) || !inRange(data.admittedAtMillis)) {
      continue;
    }
    const stringFields = [
      "actorUid",
      "organizerId",
      "eventId",
      "responseId",
      "contactId",
      "offerId",
      "requestId",
      "receiptId",
      "attendeeId",
      "canonicalSeatKey",
      "requestHash",
    ];
    if (
      !stringFields.every((field) => nonempty(data[field])) ||
      ![
        "expectedOfferRevision",
        "expectedOfferGeneration",
        "expectedLedgerRevision",
        "resultingLedgerRevision",
        "admittedAtMillis",
      ].every((field) => positive(data[field]))
    ) {
      unknown();
      continue;
    }
    // This is the actual projected command, not a fabricated full receipt.
    const command: AdmissionCommand = {
      actorUid: String(data.actorUid),
      organizerId: String(data.organizerId),
      eventId: String(data.eventId),
      responseId: String(data.responseId),
      contactId: String(data.contactId),
      offerId: String(data.offerId),
      requestId: String(data.requestId),
      expectedOfferRevision: Number(data.expectedOfferRevision),
      expectedOfferGeneration: Number(data.expectedOfferGeneration),
      expectedLedgerRevision: Number(data.expectedLedgerRevision),
    };
    const owner = ownership.get(
      formAdmissionOwnershipId(
        command.organizerId,
        command.eventId,
        command.responseId
      )
    );
    if (
      formAdmissionReceiptId(command.organizerId, command.requestId) !==
        id ||
      data.receiptId !== id ||
      admissionRequestHash(command) !== data.requestHash ||
      !owner ||
      [
        "organizerId",
        "eventId",
        "responseId",
        "offerId",
        "attendeeId",
        "canonicalSeatKey",
      ].some((field) => owner[field] !== data[field]) ||
      owner.receiptId !== id ||
      owner.offerRevision !== command.expectedOfferRevision ||
      owner.offerGeneration !== command.expectedOfferGeneration
    ) {
      unknown();
      continue;
    }
    const terms = asObject(data.paymentSnapshot);
    const manual = asObject(data.manualPayment);
    const approval = asObject(data.applicationApproval);
    if (
      !termsValid(terms) ||
      (Object.keys(approval).length > 0 &&
        (!nonempty(approval.applicationId) ||
          approval.contactId !== data.contactId ||
          !positive(approval.revision) ||
          !positive(approval.reviewedAtMillis) ||
          approval.reviewedAtMillis > Number(data.admittedAtMillis)))
    ) {
      unknown();
      continue;
    }
    const provider = asObject(data.providerPayment);
    if (Object.keys(provider).length > 0) {
      if (pathValue(provider, "routing.selection.mode") === "test") {
        continue;
      }
      const paymentId = String(provider.paymentId);
      const payment = payments.get(paymentId);
      if (
        !payment ||
        !paymentValid({id: paymentId, data: payment}) ||
        !captureValid(payment) ||
        command.requestId !== `paid_${paymentId}` ||
        payment.admissionReceiptId !== id ||
        [
          "organizerId",
          "eventId",
          "responseId",
          "contactId",
          "offerId",
          "canonicalSeatKey",
        ].some((field) => payment[field] !== data[field]) ||
        payment.offerRevision !== command.expectedOfferRevision ||
        payment.offerGeneration !== command.expectedOfferGeneration ||
        payment.recipientUid !== data.actorUid ||
        provider.recipientUid !== payment.recipientUid ||
        provider.grantId !== payment.grantId ||
        provider.providerOrderId !== payment.providerOrderId ||
        provider.providerPaymentId !== payment.providerPaymentId ||
        provider.capturedAtMillis !== timestampMillis(payment.capturedAt) ||
        timestampMillis(payment.admittedAt) !== data.admittedAtMillis ||
        Number(provider.capturedAtMillis) > Number(data.admittedAtMillis) ||
        termFields.some(
          (field) =>
            pathValue(payment, `paymentSnapshot.${field}`) !== terms[field]
        ) ||
        routeFields.some(
          (field) =>
            pathValue(provider, `routing.${field}`) !==
            pathValue(payment, `routing.${field}`)
        )
      ) {
        unknown();
        continue;
      }
      // Immutable canonical paid proof is historical even after refund/cancel.
      paid++;
    } else if (
      terms.expectedAmountMinor === 0 &&
      manual.status === "none"
    ) {
      free++;
    } else if (
      Number(terms.expectedAmountMinor) > 0 &&
      ["manualInstructions", "reusablePage", "personalRequest"].includes(
        String(terms.collectionMode)
      ) &&
      manual.status === "hostAttestedReceived" &&
      manual.bankReceiptChecked === true &&
      nonempty(manual.reviewedByUid) &&
      positive(manual.reviewedAtMillis) &&
      manual.reviewedAtMillis <= Number(data.admittedAtMillis) &&
      manual.attestedAmountMinor === terms.expectedAmountMinor &&
      manual.attestedCurrency === terms.currency &&
      manual.attestedEventPaymentRevision === terms.eventPaymentRevision &&
      manual.attestedEventPaymentHash === terms.eventPaymentHash
    ) {
      attested++;
    } else {
      unknown();
    }
  }
  return {
    missing,
    specs: [
      [
        "internalFormFreeAdmissions",
        "Form free admissions (historical)",
        free,
        "Explicit zero-fee receipts with reciprocal " +
          "ownership; historical admission, not current seat or attendance.",
      ],
      [
        "internalFormAttestedAdmissions",
        "Host-attested admissions (historical)",
        attested,
        "Historical receipts with matching reviewed " +
          "payment terms; host attestation is not a verified " +
          "provider purchase.",
      ],
      [
        "internalOfferCheckoutAttempts",
        "Offer checkout attempts",
        attempts,
        "Live server-created event-offer attempts by " +
          "creation time; separate from form fees and direct registration.",
      ],
      [
        "internalOfferPaymentsCaptured",
        "Offer charges retained",
        captures,
        "Live captures in range with no current " +
          "refund; cancelled no-refund charges retained. Not active admission.",
      ],
      [
        "internalOfferPaidAdmissions",
        "Offer paid admissions (historical)",
        paid,
        "Live receipt/payment/ownership proof by " +
          "admission time; remains historical after refund " +
          "or cancellation, not active seats.",
      ],
    ],
  };
}

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ?
    (value as Record<string, unknown>) :
    {};
}
function pathValue(value: unknown, path: string): unknown {
  return path
    .split(".")
    .reduce<unknown>((current, key) => asObject(current)[key], value);
}

function timestampMillis(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  if (value && typeof value === "object") {
    const timestamp = value as {
      toMillis?: () => number;
      _seconds?: number;
    };
    if (typeof timestamp.toMillis === "function") {
      const millis = timestamp.toMillis();
      return Number.isFinite(millis) ? millis : null;
    }
    if (
      typeof timestamp._seconds === "number" &&
      Number.isFinite(timestamp._seconds)
    ) {
      return timestamp._seconds * 1000;
    }
  }
  return null;
}
