import {httpsCallable} from "firebase/functions";
import {validateAdminCallableRequest, validateAdminCallableResponse} from
  "../../../generated/validators/adminCallableValidators";
import type {AdminManageOrganizerBillsCallablePayload} from
  "../../../generated/contracts/adminManageOrganizerBillsCallablePayload";
import type {AdminManageOrganizerBillsCallableResponse} from
  "../../../generated/contracts/adminManageOrganizerBillsCallableResponse";
import type {AdminManagePaymentIssuesCallablePayload} from
  "../../../generated/contracts/adminManagePaymentIssuesCallablePayload";
import type {AdminManagePaymentIssuesCallableResponse} from
  "../../../generated/contracts/adminManagePaymentIssuesCallableResponse";
import {dataMode} from "../../../shared/api/dataMode";
import {functions} from "../../../shared/api/firebaseFunctions";
import {sampleManageOrganizerBills, sampleManagePaymentIssues} from
  "./moneySamples";

export type BillsMonth = AdminManageOrganizerBillsCallableResponse;
export type Bill = BillsMonth["bills"][number];
export type BillAction = Exclude<AdminManageOrganizerBillsCallablePayload["action"],
  "list" | "generate">;
export type IssuesView = AdminManagePaymentIssuesCallableResponse;
export type MoneyIssue = IssuesView["issues"][number];

async function call<Request, Response>(name: string, payload: Request,
  sample: (payload: Request) => Response): Promise<Response> {
  if (dataMode() === "sample") {
    await new Promise((resolve) => window.setTimeout(resolve, 120));
    return sample(payload);
  }
  validateAdminCallableRequest(name, payload);
  const response = await httpsCallable<Request, Response>(functions,
    name)(payload);
  validateAdminCallableResponse(name, response.data);
  return response.data;
}

/** Reads one month's bills, or makes them from its bookings. */
export function loadBills(month: string | null, generate = false):
  Promise<BillsMonth> {
  return call<AdminManageOrganizerBillsCallablePayload, BillsMonth>(
    "adminManageOrganizerBills", {action: generate ? "generate" : "list",
      month, organizerId: null, billId: null, expectedRevision: null,
      note: null},
    sampleManageOrganizerBills);
}

/** Every bill of one organizer, newest month first (its Money tab). */
export function loadOrganizerBills(organizerId: string): Promise<BillsMonth> {
  return call<AdminManageOrganizerBillsCallablePayload, BillsMonth>(
    "adminManageOrganizerBills", {action: "list", month: null, organizerId,
      billId: null, expectedRevision: null, note: null},
    sampleManageOrganizerBills);
}

/** Sends, reminds, marks paid or writes off one bill. */
export function actOnBill(bill: Pick<Bill, "billId" | "revision">,
  action: BillAction, note: string | null): Promise<BillsMonth> {
  return call<AdminManageOrganizerBillsCallablePayload, BillsMonth>(
    "adminManageOrganizerBills", {action, month: null, organizerId: null,
      billId: bill.billId,
      expectedRevision: bill.revision, note: note?.trim() || null},
    sampleManageOrganizerBills);
}

/** Reads Money's open or resolved issues. */
export function loadIssues(view: IssuesView["view"]): Promise<IssuesView> {
  return call<AdminManagePaymentIssuesCallablePayload, IssuesView>(
    "adminManagePaymentIssues", {action: "list", view, issueId: null,
      note: null}, sampleManagePaymentIssues);
}

/** Confirms a booking or closes an issue, then rereads the open view. */
export function actOnIssue(issueId: string,
  action: "confirmBooking" | "close", note: string | null):
  Promise<IssuesView> {
  return call<AdminManagePaymentIssuesCallablePayload, IssuesView>(
    "adminManagePaymentIssues", {action, view: "open", issueId,
      note: note?.trim() || null}, sampleManagePaymentIssues);
}
