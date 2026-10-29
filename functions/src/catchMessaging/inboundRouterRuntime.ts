import {getAuth} from "firebase-admin/auth";
import type {Firestore} from "firebase-admin/firestore";
import {defineBoolean} from "firebase-functions/params";
import {defaultMessageNominationDeps} from
  "../operations/supplyIntake/messageNominations";
import {sendCatchAutoReply} from "./autoReply";
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

export function inboundRouterDeps(db: Firestore,
  scope: CatchSenderScope): CatchInboundRouterDeps {
  const sender = () => {
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
  return {
    ...defaultMessageNominationDeps(db, (uid) => getAuth().getUser(uid)),
    reply: (request) => sendCatchAutoReply({db, nowMillis: Date.now, sender,
      scope}, request),
  };
}
