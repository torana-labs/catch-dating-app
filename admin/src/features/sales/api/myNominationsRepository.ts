import {httpsCallable} from "firebase/functions";
import type {AdminListMyNominationsCallablePayload} from
  "../../../generated/contracts/adminListMyNominationsCallablePayload";
import type {AdminListMyNominationsCallableResponse} from
  "../../../generated/contracts/adminListMyNominationsCallableResponse";
import type {AdminGetInboxItemCallableResponse} from
  "../../../generated/contracts/adminGetInboxItemCallableResponse";
import {dataMode} from "../../../shared/api/dataMode";
import {functions} from "../../../shared/api/firebaseFunctions";

export type MyNominationsPage = AdminListMyNominationsCallableResponse;
export type MyNominationsFilter = AdminListMyNominationsCallablePayload["filter"];
export type MyNomination = MyNominationsPage["nominations"][number];
export type NominationDetail = AdminGetInboxItemCallableResponse;

// The validators load on first call, not in the Sales chunk.
async function call<Request extends object, Response>(name: string, payload: Request): Promise<Response> {
  const {validateAdminCallableRequest, validateAdminCallableResponse} =
    await import("../../../generated/validators/adminCallableValidators")
      .then((validators) => validators.loadAdminCallableValidators(name));
  validateAdminCallableRequest(name, payload);
  const result = await httpsCallable<Request, Response>(functions, name)(payload);
  validateAdminCallableResponse(name, result.data);
  return result.data;
}

const sampleNow = Date.parse("2026-10-31T12:00:00.000Z");
const at = (hours: number) => new Date(sampleNow - hours * 3_600_000).toISOString();

export const sampleNominations: MyNomination[] = [
  {itemId: "supply-sunday-table", type: "stuck", title: "Sunday Table", subtitle: "Instagram asked to sign in, so Catch could not read the page.",
    city: "mumbai", state: {code: "needs_person", label: "Stuck: page needs sign-in", tone: "danger"}, status: "waiting",
    sentAt: at(4), updatedAt: at(4), doneAt: null},
  {itemId: "supply-small-world", type: "listing", title: "Small World", subtitle: "https://smallworld.in", city: "mumbai",
    state: {code: "ready", label: "Waiting for a review", tone: "warning"}, status: "waiting", sentAt: at(26), updatedAt: at(24), doneAt: null},
  {itemId: "supply-afterfly", type: "listing", title: "Afterfly", subtitle: "https://luma.com/afterfly", city: "mumbai",
    state: {code: "approved", label: "Published", tone: "success"}, status: "done", sentAt: at(74), updatedAt: at(3), doneAt: at(3)},
];

/** The organizers this person nominated, newest first, with what happened to each. */
export async function listMyNominations(input: AdminListMyNominationsCallablePayload): Promise<MyNominationsPage> {
  if (dataMode() !== "sample") return call("adminListMyNominations", input);
  const published = sampleNominations.filter((row) => row.state.code === "approved");
  const stuck = sampleNominations.filter((row) => row.type === "stuck");
  const waiting = sampleNominations.filter((row) => row.type === "listing" && row.status !== "done");
  const rows = input.filter === "published" ? published : input.filter === "stuck" ? stuck :
    input.filter === "waiting" ? waiting : sampleNominations;
  return {generatedAt: new Date(sampleNow).toISOString(), filter: input.filter, nominations: rows, nextCursor: null,
    totals: {all: sampleNominations.length, published: published.length, waiting: waiting.length, stuck: stuck.length}};
}

/** One nomination and every step it took, from the inbox item ops work. */
export async function getNomination(itemId: string): Promise<NominationDetail> {
  if (dataMode() !== "sample") return call("adminGetInboxItem", {itemId});
  const row = sampleNominations.find((entry) => entry.itemId === itemId);
  if (!row) throw new Error("This nomination was not found.");
  return {
    item: {itemId: row.itemId, type: row.type, sourceKind: "supplyIntakeRequest", sourceId: row.itemId,
      sourcePath: `supplyIntakeRequests/${row.itemId}`, title: row.title, subtitle: row.subtitle, cameFrom: "You on WhatsApp",
      nominatorUid: "sample-owner", city: row.city, state: row.state, status: row.status, waitingSince: row.sentAt,
      doneAt: row.doneAt, assigneeUid: null, snoozedUntil: null, recommendation: null, listingEvent: null},
    journey: [{stepId: "submitted", occurredAt: row.sentAt, title: "You sent a link on WhatsApp", detail: row.subtitle,
      actorUid: "sample-owner", tone: "ink"}],
    canWork: false, canDecideClaim: false,
  };
}
