import type {ValidateFunction} from "ajv";
import {schemaErrorMessages} from "../shared/generated/schemaValidationRuntime";
import {
  validateActivityNotificationDocument,
} from "../shared/generated/validators/activityNotificationDocument";
import {
  validateChatMessageDocument,
} from "../shared/generated/validators/chatMessageDocument";
import {
  validateEventDocument,
} from "../shared/generated/validators/eventDocument";
import {
  validateEventParticipationDocument,
} from "../shared/generated/validators/eventParticipationDocument";
import {
  validateMatchDocument,
} from "../shared/generated/validators/matchDocument";
import {
  validateOrganizerDocument,
} from "../shared/generated/validators/organizerDocument";
import {
  validatePaymentDocument,
} from "../shared/generated/validators/paymentDocument";
import {
  validatePublicProfileDocument,
} from "../shared/generated/validators/publicProfileDocument";
import {
  validateSavedEventDocument,
} from "../shared/generated/validators/savedEventDocument";
import {
  validateSwipeDocument,
} from "../shared/generated/validators/swipeDocument";
import {
  validateUserProfileDocument,
} from "../shared/generated/validators/userProfileDocument";

export interface DemoDocWrite {
  path: string;
  data: FirebaseFirestore.DocumentData;
}

const contractedPaths: ReadonlyArray<{
  pattern: RegExp;
  validate: ValidateFunction<unknown>;
}> = [
  {pattern: /^users\/[^/]+$/u, validate: validateUserProfileDocument},
  {
    pattern: /^publicProfiles\/[^/]+$/u,
    validate: validatePublicProfileDocument,
  },
  {pattern: /^organizers\/[^/]+$/u, validate: validateOrganizerDocument},
  {pattern: /^events\/[^/]+$/u, validate: validateEventDocument},
  {
    pattern: /^eventParticipations\/[^/]+$/u,
    validate: validateEventParticipationDocument,
  },
  {pattern: /^savedEvents\/[^/]+$/u, validate: validateSavedEventDocument},
  {pattern: /^payments\/[^/]+$/u, validate: validatePaymentDocument},
  {pattern: /^matches\/[^/]+$/u, validate: validateMatchDocument},
  {
    pattern: /^matches\/[^/]+\/messages\/[^/]+$/u,
    validate: validateChatMessageDocument,
  },
  {
    pattern: /^notifications\/[^/]+\/items\/[^/]+$/u,
    validate: validateActivityNotificationDocument,
  },
  {
    pattern: /^profileDecisions\/[^/]+\/outgoing\/[^/]+$/u,
    validate: validateSwipeDocument,
  },
];

// Suvbot's own bookkeeping. No product surface reads these collections and no
// contract describes them; every other path must match a contract above.
export const SUVBOT_OPERATION_COLLECTIONS: ReadonlySet<string> = new Set([
  "demoSelfServiceAccess",
  "demoOpsRequests",
  "demoOpsEvents",
  "demoOpsConfirmations",
]);

/**
 * Throws unless a document Suvbot is about to write matches its Firestore
 * contract. Paths without a contract fail closed, apart from Suvbot's own
 * operation records.
 * @param {DemoDocWrite} doc Candidate write.
 */
export function assertValidSuvbotDocument(doc: DemoDocWrite): void {
  const collection = doc.path.split("/")[0];
  if (
    SUVBOT_OPERATION_COLLECTIONS.has(collection) &&
    doc.path.split("/").length === 2
  ) {
    return;
  }
  const contract = contractedPaths.find((item) => item.pattern.test(doc.path));
  if (!contract) {
    throw new Error(`Suvbot has no Firestore contract for ${doc.path}.`);
  }
  const data = schemaSerializable(doc.data, doc.path);
  if (!contract.validate(data)) {
    throw new Error(
      `Suvbot write ${doc.path} breaks its contract: ` +
      schemaErrorMessages(contract.validate).join("; ")
    );
  }
}

/**
 * Validates every write in a plan before any of it reaches Firestore.
 * @param {DemoDocWrite[]} docs Candidate writes.
 */
export function assertValidSuvbotPlan(docs: DemoDocWrite[]): void {
  for (const doc of docs) assertValidSuvbotDocument(doc);
}

/**
 * Converts Firestore values to the serialized shape contracts describe.
 * Timestamps become {_seconds, _nanoseconds}; undefined values and
 * FieldValue sentinels are rejected because a validated document must be the
 * exact document that is stored.
 * @param {unknown} value Firestore value.
 * @param {string} at Location for error messages.
 * @return {unknown} Serialized value.
 */
export function schemaSerializable(value: unknown, at: string): unknown {
  if (value === undefined) {
    throw new Error(`Suvbot write ${at} contains an undefined value.`);
  }
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) {
    return value.map((item, index) =>
      schemaSerializable(item, `${at}[${index}]`));
  }
  if (isTimestamp(value)) {
    return {_seconds: value.seconds, _nanoseconds: value.nanoseconds};
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    throw new Error(
      `Suvbot write ${at} contains a ` +
      `${prototype?.constructor?.name ?? "non-plain"} ` +
      "value; contracted documents use concrete values only."
    );
  }
  const result: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value)) {
    result[key] = schemaSerializable(item, `${at}.${key}`);
  }
  return result;
}

/**
 * @param {object} value Candidate.
 * @return {boolean} True for a Firestore Timestamp.
 */
function isTimestamp(
  value: object
): value is {seconds: number; nanoseconds: number} {
  const candidate = value as {
    seconds?: unknown;
    nanoseconds?: unknown;
    toMillis?: unknown;
  };
  return typeof candidate.toMillis === "function" &&
    Number.isInteger(candidate.seconds) &&
    Number.isInteger(candidate.nanoseconds);
}
