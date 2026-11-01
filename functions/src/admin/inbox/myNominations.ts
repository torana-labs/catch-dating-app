/* eslint-disable max-len */
import * as admin from "firebase-admin";
import {CallableRequest, HttpsError, onCall} from "firebase-functions/v2/https";
import {appCheckCallableOptions} from "../../shared/callableOptions";
import type {AdminListMyNominationsCallablePayload} from "../../shared/generated/adminListMyNominationsCallablePayload";
import type {AdminListMyNominationsCallableResponse} from "../../shared/generated/adminListMyNominationsCallableResponse";
import {validateAdminListMyNominationsCallablePayload} from "../../shared/generated/validators/adminListMyNominationsInput";
import {checkRateLimit as defaultCheckRateLimit} from "../../shared/rateLimit";
import {validateCallableWithAjv} from "../../shared/validation";
import {requireAdminRole} from "../adminAuth";
import {INBOX_ITEMS_COLLECTION, InboxItemDocument} from "./model";

/**
 * What happened to every organizer a sales associate nominated, newest
 * first: published, still waiting, or stuck. The same inbox items ops work,
 * read by who nominated them, so the associate and ops see one state.
 */
const nominationRoles = ["admin", "adminOwner", "support", "salesStaff"] as const;
type Filter = AdminListMyNominationsCallablePayload["filter"];
type Response = AdminListMyNominationsCallableResponse;

interface MyNominationsDeps {
  firestore: () => FirebaseFirestore.Firestore;
  now: () => Date;
  checkRateLimit?: typeof defaultCheckRateLimit;
}

const defaultDeps: MyNominationsDeps = {
  firestore: () => admin.firestore(),
  now: () => new Date(),
  checkRateLimit: defaultCheckRateLimit,
};

function filtered(base: FirebaseFirestore.Query, filter: Filter): FirebaseFirestore.Query {
  switch (filter) {
  case "all": return base;
  case "published": return base.where("status", "==", "done").where("state.code", "==", "approved");
  case "waiting": return base.where("type", "==", "listing").where("status", "in", ["working", "waiting", "snoozed"]);
  case "stuck": return base.where("type", "==", "stuck").where("status", "in", ["waiting", "snoozed"]);
  }
}

export async function adminListMyNominationsHandler(request: CallableRequest<unknown>,
  deps: MyNominationsDeps = defaultDeps): Promise<Response> {
  const adminContext = requireAdminRole(request, nominationRoles);
  const data = validateCallableWithAjv<AdminListMyNominationsCallablePayload>(request,
    validateAdminListMyNominationsCallablePayload);
  const db = deps.firestore();
  await deps.checkRateLimit?.(db, adminContext.uid, "adminListMyNominations", {maxRequests: 60, windowMs: 60 * 1000});
  const base = db.collection(INBOX_ITEMS_COLLECTION).where("nominatorUid", "==", adminContext.uid);
  let page = filtered(base, data.filter).orderBy("waitingSince", "desc")
    .orderBy(admin.firestore.FieldPath.documentId(), "desc").limit(data.limit + 1);
  if (data.cursor) {
    const cursor = decodeCursor(data.cursor);
    page = page.startAfter(cursor.waitingSince, cursor.itemId);
  }
  const count = async (filter: Filter) => (await filtered(base, filter).count().get()).data().count;
  const [snapshot, all, published, waiting, stuck] = await Promise.all([
    page.get(), count("all"), count("published"), count("waiting"), count("stuck"),
  ]);
  const docs = snapshot.docs.slice(0, data.limit).map((doc) => doc.data() as InboxItemDocument);
  const last = docs.at(-1);
  return {
    generatedAt: deps.now().toISOString(),
    filter: data.filter,
    nominations: docs.map((item) => ({
      itemId: item.itemId, type: item.type, title: item.title, subtitle: item.subtitle, city: item.city,
      state: item.state, status: item.status, sentAt: item.waitingSince, updatedAt: item.updatedAt, doneAt: item.doneAt,
    })),
    nextCursor: snapshot.docs.length > data.limit && last ?
      Buffer.from(JSON.stringify({waitingSince: last.waitingSince, itemId: last.itemId}), "utf8").toString("base64url") : null,
    totals: {all, published, waiting, stuck},
  };
}

function decodeCursor(value: string): {waitingSince: string; itemId: string} {
  try {
    const cursor = JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as Record<string, unknown>;
    if (typeof cursor.waitingSince === "string" && typeof cursor.itemId === "string") {
      return {waitingSince: cursor.waitingSince, itemId: cursor.itemId};
    }
  } catch {
    // Falls through to the refusal below.
  }
  throw new HttpsError("invalid-argument", "This page cursor is invalid; reload your nominations.");
}

export const adminListMyNominations = onCall(appCheckCallableOptions,
  (request) => adminListMyNominationsHandler(request));
