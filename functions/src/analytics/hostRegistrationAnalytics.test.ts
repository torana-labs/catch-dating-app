import assert from "node:assert/strict";
import test from "node:test";
import {
  buildHostRegistrationAnalytics,
  loadHostRegistrationAnalytics,
  type RegistrationRecords,
} from "./hostRegistrationAnalytics";

import {
  fixture as admissionFixture,
  org,
  eventId,
  offerId,
  actorUid,
} from "../organizerFormAdmission/admissionTestFixture";
import {capturedFixture}
  from "../payments/offerPayments/offerPaymentTestFixture";
import {validateOrganizerFormAdmissionReceiptDocument}
  from "../shared/generated/validators/organizerFormAdmissionReceiptDocument";
import {
  buildHostAnalyticsFromRecords,
  resolveAnalyticsRange,
} from "./hostAnalytics";
import {validateHostAnalyticsCallableResponse}
  from "../shared/generated/validators/hostAnalyticsOutput";

const range = {start: new Date(1000), endExclusive: new Date(5000)};
const time = (n: number) => ({toMillis: () => n});
const row = (id: string, data: Record<string, unknown>) => ({
  id,
  data: {organizerId: "org", ...data},
});
function fixture(): RegistrationRecords {
  return {
    formAdmissions: [],
    formAdmissionReceipts: [],
    offerPayments: [],
    versions: [
      row("v", {
        formId: "f",
        definition: {defaultTargetKind: "event", defaultTargetId: "e"},
      }),
    ],
    drafts: [
      row("d", {formId: "f", versionId: "v", createdAt: time(2000)}),
    ],
    responses: [
      row("r", {
        formId: "f",
        versionId: "v",
        draftId: "d",
        status: "submitted",
        submittedAt: time(3000),
      }),
    ],
    formPayments: [
      row("fp", {
        formId: "f",
        versionId: "v",
        draftId: "d",
        responseId: "r",
        mode: "live",
        status: "submitted",
        createdAt: time(500),
        capturedAt: time(3000),
        refundedAmountPaise: 0,
      }),
    ],
    publicPayments: [
      row("p", {
        eventId: "e",
        routing: {selection: {mode: "live"}},
        status: "admitted",
        createdAt: time(2000),
        capturedAt: time(3000),
        admissionReceiptId: "a",
        refundedAmountPaise: 0,
      }),
    ],
    receipts: [
      row("a", {
        eventId: "e",
        paymentId: "p",
        admittedAtMillis: 4000,
        routing: {selection: {mode: "live"}},
      }),
    ],
    incomplete: false,
    unavailable: false,
  };
}
function values(records = fixture(), eventId: string | null = "e") {
  return Object.fromEntries(
    buildHostRegistrationAnalytics(
      records,
      ["org"],
      eventId,
      range
    ).summaryCards.map((card) => [card.id, card.value])
  );
}
test(
  "server stage timestamps and direct lane " +
    "count separately and replay identically",
  () => {
    const records = fixture();
    assert.deepEqual(values(records), {
      internalFormDrafts: 1,
      internalFormSubmissions: 1,
      internalFormCheckoutAttempts: 0,
      internalFormFeesCaptured: 1,
      internalDirectCheckoutAttempts: 1,
      internalDirectPaymentsCaptured: 1,
      internalDirectPaidAdmissions: 1,
      internalFormFreeAdmissions: 0,
      internalFormAttestedAdmissions: 0,
      internalOfferCheckoutAttempts: 0,
      internalOfferPaymentsCaptured: 0,
      internalOfferPaidAdmissions: 0,
    });
    records.publicPayments.push(records.publicPayments[0]);
    records.receipts.push(records.receipts[0]);
    assert.deepEqual(values(records), values());
    assert.equal(
      values(records, "foreign").internalDirectPaidAdmissions,
      0
    );
  }
);
test(
  "foreign owners, unlinked receipts, test and " +
    "refunded outcomes never count",
  () => {
    const records = fixture();
    records.drafts.push(
      row("foreign", {organizerId: "other", createdAt: time(2000)})
    );
    records.responses[0].data.status = "withdrawn";
    records.formPayments[0].data.mode = "test";
    records.publicPayments[0].data.refundedAmountPaise = 1;
    records.receipts.push(
      row("wrong", {...records.receipts[0].data, paymentId: "unknown"})
    );
    const counts = values(records);
    assert.equal(counts.internalFormDrafts, 1);
    assert.equal(counts.internalFormSubmissions, 0);
    assert.equal(counts.internalFormFeesCaptured, 0);
    assert.equal(counts.internalDirectPaymentsCaptured, 0);
    assert.equal(counts.internalDirectPaidAdmissions, 0);
  }
);
test(
  "event forms require immutable owned version " +
    "target, not guessed form joins",
  () => {
    const records = fixture();
    records.versions[0].data.organizerId = "other";
    assert.equal(values(records).internalFormSubmissions, 0);
    assert.equal(values(records, null).internalFormSubmissions, 1);
  }
);
test(
  "bounded queries project no PII and surface " +
    "failed sources and truncation",
  async () => {
    const selections: string[][] = [];
    const db = {
      collection(name: string) {
        const query = {
          where() {
            return query;
          },
          select(...fields: string[]) {
            selections.push(fields);
            return query;
          },
          limit(n: number) {
            assert.equal(n, 201);
            return query;
          },
          async get() {
            if (name === "organizerFormResponses") {
              throw new Error("unavailable");
            }
            return {
              docs: Array.from({length: 201}, (_, i) => ({
                id: String(i),
                data: () => ({organizerId: "org"}),
              })),
            };
          },
        };
        return query;
      },
    } as unknown as FirebaseFirestore.Firestore;
    const result = await loadHostRegistrationAnalytics(
      db,
      ["org"],
      "e",
      range
    );
    assert.equal(result.summaryCards[0].status, "missing");
    assert.match(result.dataQuality[2].detail, /200-row/);
    assert.match(result.dataQuality[2].detail, /query failed/);
    assert.ok(
      selections
        .flat()
        .every(
          (field) =>
            !new RegExp(
              "answers|identity|respondent|token|checkoutKey|" +
              "paymentInstructions|reusablePaymentPageUrl|" +
              "personalPaymentLink|reviewNote|evidenceReference", "i"
            ).test(
              field
            )
        )
    );
  }
);
test(
  "complete empty sources are ready zero; " +
    "truncated sources are partial lower bounds",
  () => {
    const records = fixture();
    for (const key of [
      "versions",
      "drafts",
      "responses",
      "formPayments",
      "publicPayments",
      "receipts",
      "formAdmissions",
      "formAdmissionReceipts",
      "offerPayments",
    ] as const) {
      records[key] = [];
    }
    const empty = buildHostRegistrationAnalytics(
      records,
      ["org"],
      null,
      range
    );
    assert.ok(
      empty.summaryCards.every(
        (card) =>
          card.value === 0 &&
          card.status ===
            (card.id === "internalFormDrafts" ? "partial" : "ready")
      )
    );
    records.incomplete = true;
    assert.ok(
      buildHostRegistrationAnalytics(
        records,
        ["org"],
        null,
        range
      ).summaryCards.every((card) => card.status === "partial")
    );
  }
);

test(
  "missing authoritative stage dates are " +
    "partial rather than measured zero",
  () => {
    const records = fixture();
    records.responses[0].data.submittedAt = null;
    const result = buildHostRegistrationAnalytics(
      records,
      ["org"],
      "e",
      range
    );
    assert.equal(
      result.summaryCards.find(
        (card) => card.id === "internalFormSubmissions"
      )?.status,
      "partial"
    );
    assert.match(result.dataQuality[2].detail, /required scope\/date/);
  }
);

const collections = {
  versions: "organizerFormVersions",
  drafts: "organizerFormResponseDrafts",
  responses: "organizerFormResponses",
  formPayments: "organizerFormPayments",
  publicPayments: "publicEventPayments",
  receipts: "publicEventAdmissionReceipts",
  formAdmissions: "organizerFormAdmissions",
  formAdmissionReceipts: "organizerFormAdmissionReceipts",
  offerPayments: "organizerEventOfferPayments",
} as const;
function fromStore(
  store: Map<string, Record<string, unknown>>
): RegistrationRecords {
  const records = {
    incomplete: false,
    unavailable: false,
  } as RegistrationRecords;
  for (const [key, collection] of Object.entries(collections)) {
    (records as unknown as Record<string, unknown>)[key] = [
      ...store.entries(),
    ]
      .filter(([path]) => path.startsWith(`${collection}/`))
      .map(([path, data]) => ({
        id: path.slice(collection.length + 1),
        data,
      }));
  }
  return records;
}
function admissionReport(records: RegistrationRecords) {
  return buildHostRegistrationAnalytics(records, [org], eventId, range);
}
function admissionValue(records: RegistrationRecords, id: string) {
  return admissionReport(records).summaryCards.find(
    (card) => card.id === id
  )?.value;
}
async function actualFree() {
  const h = admissionFixture();
  await h.commit();
  return {h, records: fromStore(h.store.rows)};
}
async function actualPaid(mode: "live" | "test" = "live") {
  const h = await capturedFixture();
  await h.finalize();
  // Actual test-mode writer replay precedes the live reporting model.
  await h.finalize();
  const records = fromStore(h.store.rows);
  // Fixture writer runs in test mode; model a reviewed live ledger/receipt by
  // changing only their matching mode. Full canonical receipt remains valid.
  const payment = records.offerPayments![0].data;
  const receipt = records.formAdmissionReceipts![0].data;
  (payment.routing as { selection: { mode: string } }).selection.mode =
    mode;
  (
    receipt.providerPayment as { routing: { selection: { mode: string } } }
  ).routing.selection.mode = mode;
  assert.equal(
    validateOrganizerFormAdmissionReceiptDocument(receipt),
    true
  );
  return {h, records, payment, receipt};
}

test("canonical free and host-attested admission " +
  "writers produce distinct historical counts", async () => {
  const {records} = await actualFree();
  assert.equal(admissionValue(records, "internalFormFreeAdmissions"), 1);
  assert.equal(
    admissionValue(records, "internalFormAttestedAdmissions"),
    0
  );
  const h = admissionFixture();
  const offer = h.store.get(`organizerEventOffers/${offerId}`)!;
  Object.assign(offer.paymentSnapshot as object, {
    expectedAmountMinor: 10000,
    collectionMode: "manualInstructions",
    paymentInstructions: "Private bank instructions",
  });
  Object.assign(offer.manualPayment as object, {
    status: "hostAttestedReceived",
    bankReceiptChecked: true,
    evidenceReference: "private-bank-evidence",
    evidenceRecordedAtMillis: 1500,
    reviewedAtMillis: 1600,
    reviewedByUid: actorUid,
    reviewNote: "Private review note",
    attestedAmountMinor: 10000,
    attestedCurrency: "INR",
    attestedEventPaymentRevision: 1,
    attestedEventPaymentHash: "a".repeat(64),
  });
  await h.commit();
  const attested = fromStore(h.store.rows);
  assert.equal(admissionValue(attested, "internalFormFreeAdmissions"), 0);
  assert.equal(
    admissionValue(attested, "internalFormAttestedAdmissions"),
    1
  );
  assert.equal(admissionValue(attested, "internalOfferPaidAdmissions"), 0);
  (
    attested.formAdmissionReceipts![0].data.manualPayment as Record<
      string,
      unknown
    >
  ).attestedEventPaymentRevision = 2;
  const bad = admissionReport(attested);
  assert.equal(
    bad.summaryCards.find(
      (card) => card.id === "internalFormAttestedAdmissions"
    )?.value,
    0
  );
  assert.equal(bad.summaryCards[0].status, "partial");
});

test("canonical live paid proof deduplicates and " +
  "admissions remain historical after cancellation/refund", async () => {
  const {records, payment} = await actualPaid();
  assert.equal(admissionValue(records, "internalOfferCheckoutAttempts"), 1);
  assert.equal(admissionValue(records, "internalOfferPaymentsCaptured"), 1);
  assert.equal(admissionValue(records, "internalOfferPaidAdmissions"), 1);
  records.formAdmissionReceipts!.push(records.formAdmissionReceipts![0]);
  records.offerPayments!.push(records.offerPayments![0]);
  assert.equal(admissionValue(records, "internalOfferPaidAdmissions"), 1);
  payment.status = "cancelled";
  payment.cancellation = {reason: "guestCancelled", refundAmountPaise: 0};
  assert.equal(admissionValue(records, "internalOfferPaymentsCaptured"), 1);
  assert.equal(admissionValue(records, "internalOfferPaidAdmissions"), 1);
  payment.status = "refunded";
  payment.refundedAmountPaise = payment.amountPaise;
  assert.equal(admissionValue(records, "internalOfferPaymentsCaptured"), 0);
  assert.equal(admissionValue(records, "internalOfferPaidAdmissions"), 1);
  assert.match(
    admissionReport(records).dataQuality[1].nextAction,
    /not refund-period/
  );
  const tested = await actualPaid("test");
  assert.equal(
    admissionValue(tested.records, "internalOfferCheckoutAttempts"),
    0
  );
  assert.equal(
    admissionValue(tested.records, "internalOfferPaymentsCaptured"),
    0
  );
  assert.equal(
    admissionValue(tested.records, "internalOfferPaidAdmissions"),
    0
  );
});

test("foreign receipt scope, missing ownership and " +
  "mismatched paid revisions cannot count", async () => {
  const {records, receipt, payment} = await actualPaid();
  const original = receipt.expectedOfferRevision;
  receipt.expectedOfferRevision = 999;
  assert.equal(admissionValue(records, "internalOfferPaidAdmissions"), 0);
  receipt.expectedOfferRevision = original;
  payment.offerGeneration = 999;
  assert.equal(admissionValue(records, "internalOfferPaidAdmissions"), 0);
  payment.offerGeneration = 1;
  records.formAdmissions = [];
  assert.equal(admissionValue(records, "internalOfferPaidAdmissions"), 0);
  const free = await actualFree();
  free.records.formAdmissionReceipts![0].data.eventId = "other-event";
  assert.equal(
    admissionValue(free.records, "internalFormFreeAdmissions"),
    0
  );
  free.records.formAdmissionReceipts![0].data.eventId = eventId;
  free.records.formAdmissions![0].data.organizerId = "foreign";
  assert.equal(
    admissionValue(free.records, "internalFormFreeAdmissions"),
    0
  );
});

test("unknown classification/date/proof is partial " +
  "and absent new sources are missing", async () => {
  const {records} = await actualFree();
  const receipt = records.formAdmissionReceipts![0].data;
  (receipt.paymentSnapshot as Record<string, unknown>).expectedAmountMinor =
    1;
  const bad = admissionReport(records);
  assert.equal(
    bad.summaryCards.find(
      (card) => card.id === "internalFormFreeAdmissions"
    )?.value,
    0
  );
  assert.equal(bad.summaryCards[0].status, "partial");
  receipt.admittedAtMillis = undefined;
  assert.equal(admissionReport(records).summaryCards[0].status, "partial");
  delete records.offerPayments;
  assert.equal(
    admissionReport(records).summaryCards.find(
      (card) => card.id === "internalOfferPaidAdmissions"
    )?.status,
    "missing"
  );
});

function projectedStore(store: Map<string, Record<string, unknown>>) {
  const selected: string[] = [];
  const db = {
    collection(collection: string) {
      const filters: Array<[string, unknown]> = [];
      let fields: string[] = [];
      let cap = 0;
      const query = {
        where(field: string, _op: string, value: unknown) {
          filters.push([field, value]);
          return query;
        },
        select(...values: string[]) {
          fields = values;
          selected.push(...values);
          return query;
        },
        limit(value: number) {
          cap = value;
          return query;
        },
        async get() {
          return {
            docs: [...store.entries()]
              .filter(
                ([path, data]) =>
                  path.startsWith(`${collection}/`) &&
                  filters.every(([field, value]) => data[field] === value)
              )
              .slice(0, cap)
              .map(([path, data]) => {
                const projection: Record<string, unknown> = {};
                for (const field of fields) {
                  const keys = field.split(".");
                  let value: unknown = data;
                  for (const key of keys) {
                    value =
                      value && typeof value === "object" ?
                        (value as Record<string, unknown>)[key] :
                        undefined;
                  }
                  if (value === undefined) continue;
                  let target = projection;
                  for (const key of keys.slice(0, -1)) {
                    target[key] ??= {};
                    target = target[key] as Record<string, unknown>;
                  }
                  target[keys[keys.length - 1]] = value;
                }
                return {
                  id: path.slice(collection.length + 1),
                  data: () => projection,
                };
              }),
          };
        },
      };
      return query;
    },
  } as unknown as FirebaseFirestore.Firestore;
  return {db, selected};
}

test("bounded loader retains nested canonical " +
  "proof and returns contract-valid safe aggregates", async () => {
  const {h} = await actualPaid();
  const {db, selected} = projectedStore(h.store.rows);
  const result = await loadHostRegistrationAnalytics(
    db,
    [org],
    eventId,
    range
  );
  assert.equal(
    result.summaryCards.find(
      (card) => card.id === "internalOfferPaidAdmissions"
    )?.value,
    1
  );
  assert.equal(
    result.summaryCards.find(
      (card) => card.id === "internalOfferPaymentsCaptured"
    )?.value,
    1
  );
  assert.ok(selected.includes("providerPayment.routing.selection.mode"));
  assert.ok(selected.includes("paymentSnapshot.eventPaymentRevision"));
  assert.ok(selected.includes("manualPayment.reviewedAtMillis"));
  assert.ok(
    selected.every(
      (field) =>
        !/answers|instructions|url|link|note|evidence|checkoutkey/i.test(
          field
        )
    )
  );
  assert.ok(
    result.dataQuality.every((quality) => quality.detail.length <= 240)
  );
  assert.ok(
    result.summaryCards.every((card) => (card.caption?.length ?? 0) <= 160)
  );
  const now = new Date("2026-06-18T12:00:00Z");
  const report = buildHostAnalyticsFromRecords(
    {organizers: [], events: [], martRows: []},
    resolveAnalyticsRange({rangePreset: "30d"}, now),
    now
  );
  report.summaryCards.push(...result.summaryCards);
  report.dataQuality.push(...result.dataQuality);
  assert.equal(
    validateHostAnalyticsCallableResponse(report),
    true,
    JSON.stringify(validateHostAnalyticsCallableResponse.errors)
  );
  assert.ok(!JSON.stringify(result).includes("providerPaymentId"));
  const unknown = await loadHostRegistrationAnalytics(
    db,
    ["other-owner"],
    eventId,
    range
  );
  assert.ok(unknown.summaryCards.every((card) => card.value === 0));
});
