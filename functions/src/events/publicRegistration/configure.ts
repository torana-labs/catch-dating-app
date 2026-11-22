import {
  assertPaymentRouteSnapshot,
  type PaymentRoutingSnapshot,
} from "../../payments/paymentRouting";
import {assertRazorpayCollectionRoutingCurrent} from
  "../../payments/razorpayCollectionRouting";
import {createHash} from "node:crypto";
import {Timestamp} from "firebase-admin/firestore";
import {HttpsError} from "firebase-functions/v2/https";
import type {ConfigureEventRegistrationCallablePayload as Command} from
  "../../shared/generated/configureEventRegistrationCallablePayload";
import type {ConfigureEventRegistrationCallableResponse as Result} from
  "../../shared/generated/configureEventRegistrationCallableResponse";
import {validateConfigureEventRegistrationCallablePayload} from
  "../../shared/generated/validators/configureEventRegistrationInput";
import {
  classifyCommandReceipt,
  commandReceiptRef,
  commandRequestHash,
  writeCommandReceipt,
} from "../../shared/commandReceipts";
import {readRegistrationManager} from "./authority";
import {readSeatMigrationWriterFence} from "../seatMigrationPaged";
import {
  assertPublicRegistrationAvailability,
  registrationUnavailable,
} from "./policy";
import {updateEventPublicRegistration} from
  "../../domain/events/eventDocumentWrites";

/** An explicit, revision-checked opt-in; origin and booking provenance survive
 * every transition. Closing remains possible even after the event ends.
 */
export async function configureEventRegistration(input: {
  db: FirebaseFirestore.Firestore;
  actorUid: string;
  command: Command;
  nowMillis?: () => number;
  routing?: PaymentRoutingSnapshot;
}): Promise<Result> {
  const {db, actorUid, command} = input;
  if (
    !validateConfigureEventRegistrationCallablePayload(command) ||
    !/^[A-Za-z0-9][A-Za-z0-9_-]{0,119}$/u.test(actorUid)
  ) {
    throw new HttpsError(
      "invalid-argument",
      "Invalid registration change.",
    );
  }
  const requestHash = registrationRequestHash(actorUid, command);
  const nowMillis = input.nowMillis ?? Date.now;
  return db.runTransaction(async (tx) => {
    const eventRef = db.collection("events").doc(command.eventId);
    const receiptRef = registrationReceiptRef(db, command);
    const [{event, organizer}, receiptSnap] = await Promise.all([
      readRegistrationManager({
        db,
        tx,
        actorUid,
        eventId: command.eventId,
        organizerId: command.organizerId,
      }),
      tx.get(receiptRef),
    ]);
    const lookup = classifyCommandReceipt<{registrationRevision?: number}>(
      receiptSnap,
      {command: registrationReceiptCommand, requestHash,
        nowMillis: nowMillis()},
    );
    if (lookup.kind !== "none") {
      const revision = lookup.kind === "replay" ?
        lookup.result?.registrationRevision : undefined;
      if (typeof revision !== "number" || !Number.isSafeInteger(revision) ||
          revision < 1) {
        throw new HttpsError(
          "already-exists",
          "Request identity was reused.",
        );
      }
      return {
        eventId: command.eventId,
        registrationRevision: revision,
        mode: command.mode,
        replayed: true,
      };
    }
    const revision = event.publicRegistrationRevision ?? 0;
    if (
      revision !== command.expectedRegistrationRevision ||
      revision >= Number.MAX_SAFE_INTEGER
    ) {
      throw new HttpsError(
        "aborted",
        "Registration changed. Refresh and retry.",
      );
    }
    const now = nowMillis();
    if (command.mode !== "closed") {
      assertPublicRegistrationAvailability(event, organizer, command.mode, now);
      if (
        command.mode === "paid" &&
        (await readSeatMigrationWriterFence({
          db,
          tx,
          eventId: command.eventId,
        })) !== "ready"
      ) {
        registrationUnavailable(
          "Reconcile event seats before opening checkout.",
        );
      }
    }
    if (command.mode === "paid") {
      if (!input.routing) {
        registrationUnavailable("Configure event payments first.");
      }
      assertPaymentRouteSnapshot(input.routing, {
        organizerId: command.organizerId,
        purpose: "eventAdmission",
        currency: "INR",
        amountMinor: event.priceInPaise!,
      });
      await assertRazorpayCollectionRoutingCurrent({
        db,
        tx,
        snapshot: input.routing,
        nowMillis: now,
      });
    }
    const next = revision + 1;
    updateEventPublicRegistration(tx, eventRef, {
      publicRegistrationMode: command.mode,
      publicRegistrationEnabled: command.mode !== "closed",
      publicRegistrationRevision: next,
      updatedAt: Timestamp.fromMillis(now),
    });
    writeCommandReceipt(tx, receiptRef, {
      command: registrationReceiptCommand,
      retention: "request",
      requestHash,
      result: {registrationRevision: next},
      nowMillis: now,
    });
    return {
      eventId: command.eventId,
      registrationRevision: next,
      mode: command.mode,
      replayed: false,
    };
  });
}

const registrationReceiptCommand = "configureEventRegistration";

/** The replay receipt for one registration change request. */
export function registrationReceiptRef(
  db: FirebaseFirestore.Firestore,
  command: Pick<Command, "organizerId" | "requestId">,
): FirebaseFirestore.DocumentReference {
  return commandReceiptRef(db, registrationReceiptCommand,
    registrationChangeReceiptId(command));
}

/** What a registration change request asked for, the actor included. */
export function registrationRequestHash(
  actorUid: string,
  command: Command,
): string {
  return commandRequestHash(actorUid, command);
}

/**
 * Whether the receipt [stored] replays, conflicts with, or is absent for
 * this request; the callable reads it before preparing payment routing.
 */
export function classifyRegistrationReceipt(
  stored: FirebaseFirestore.DocumentSnapshot,
  actorUid: string,
  command: Command,
  nowMillis: number,
): "none" | "replay" | "conflict" {
  return classifyCommandReceipt(stored, {
    command: registrationReceiptCommand,
    requestHash: registrationRequestHash(actorUid, command),
    nowMillis,
  }).kind;
}

export function registrationChangeReceiptId(
  command: Pick<Command, "organizerId" | "requestId">,
): string {
  return createHash("sha256")
    .update(JSON.stringify([command.organizerId, command.requestId]))
    .digest("hex");
}
