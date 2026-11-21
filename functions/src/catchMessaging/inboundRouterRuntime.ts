import {getAuth} from "firebase-admin/auth";
import type {Firestore} from "firebase-admin/firestore";
import {defineBoolean} from "firebase-functions/params";
import {defaultMessageNominationDeps} from
  "../operations/supplyIntake/messageNominations";
import {sendCatchAutoReply, sendCatchAutoReplyWithId} from "./autoReply";
import type {CatchAutoReplyRequest} from "./autoReply";
import {autoReplyCredentialVersion, catchTextSender} from "./catchSender";
import type {CatchInboundRouterDeps} from "./inboundRouter";

// Production wiring for the inbound router: the owner's switches, the
// configured Catch sender, and one sender per function instance.

// Separate from the receipt gate: routing needs receipts, and it also needs
// the owner to switch message nominations on.
export const messageNominationsEnabled = defineBoolean(
  "SUPPLY_MESSAGE_NOMINATIONS_ENABLED", {default: false});

export interface CatchSenderScope {wabaId: string; phoneNumberId: string}

let cachedSender: ReturnType<typeof catchTextSender> | null = null;

function autoReplySender(scope: CatchSenderScope) {
  return () => {
    cachedSender ??= catchTextSender({
      credentialVersion: autoReplyCredentialVersion.value(),
      graphVersion: process.env.META_WHATSAPP_GRAPH_VERSION?.trim() || "v23.0",
      ...scope,
    }).catch((error: unknown) => {
      cachedSender = null;
      throw error;
    });
    return cachedSender;
  };
}

export function inboundRouterDeps(db: Firestore,
  scope: CatchSenderScope): CatchInboundRouterDeps {
  const sender = autoReplySender(scope);
  return {
    ...defaultMessageNominationDeps(db, (uid) => getAuth().getUser(uid)),
    reply: (request) => sendCatchAutoReply({db, nowMillis: Date.now, sender,
      scope}, request),
  };
}

/** One automatic reply from Catch's number, with its WhatsApp message id. */
export function catchAutoReplyWithId(db: Firestore, scope: CatchSenderScope) {
  const sender = autoReplySender(scope);
  return (request: CatchAutoReplyRequest) => sendCatchAutoReplyWithId(
    {db, nowMillis: Date.now, sender, scope}, request);
}
