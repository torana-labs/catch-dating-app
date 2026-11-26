import {QueryClient, QueryClientProvider} from "@tanstack/react-query";
import {cleanup, fireEvent, render, screen, waitFor} from "@testing-library/react";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {getTakedownRequest, sampleTakedownDetail, type TakedownDetail, type TakedownStep} from "../api/takedownRepository";
import {activeDeadline, deadlineLabel, takedownInfoTemplates} from "../controllers/takedownLabels";
import {TakedownRequestWorkspace} from "./TakedownRequestWorkspace";

const repository = vi.hoisted(() => ({
  detail: null as TakedownDetail | null,
  steps: [] as TakedownStep[],
}));

vi.mock("../api/takedownRepository", async (original) => ({
  ...(await original<typeof import("../api/takedownRepository")>()),
  getTakedownRequest: vi.fn(async () => repository.detail),
  updateTakedownRequest: vi.fn(async (step: TakedownStep) => {
    repository.steps.push(step);
    return repository.detail!.request;
  }),
}));

const now = Date.parse("2026-11-18T08:00:00.000Z");

function draw(detail: TakedownDetail) {
  repository.detail = detail;
  const notices: string[] = [];
  const client = new QueryClient({defaultOptions: {queries: {retry: false}, mutations: {retry: false}}});
  render(<QueryClientProvider client={client}>
    <TakedownRequestWorkspace now={now} onError={() => undefined} onNotice={(notice) => notices.push(notice)} requestId={detail.request.requestId} />
  </QueryClientProvider>);
  return {notices};
}

const withRequest = (patch: Partial<TakedownDetail["request"]>, detail: Partial<TakedownDetail> = {}): TakedownDetail =>
  ({...sampleTakedownDetail, ...detail, request: {...sampleTakedownDetail.request, ...patch}});

beforeEach(() => {
  repository.steps = [];
  vi.mocked(getTakedownRequest).mockClear();
});
afterEach(cleanup);

describe("takedown request workspace", () => {
  it("shows the request, the type's verification fields and the deadline that applies now", async () => {
    draw(sampleTakedownDetail);
    expect(await screen.findByText("Remove and don't list again")).toBeTruthy();
    expect(screen.getByText("LR-K7Q2M9TX")).toBeTruthy();
    expect(screen.getByText("lanternlane.example")).toBeTruthy();
    expect(screen.getByText("Act by")).toBeTruthy();
    expect(screen.getByText("Acknowledge")).toBeTruthy();
  });

  it("acknowledges a new request", async () => {
    const {notices} = draw(withRequest({status: "received", acknowledgedAt: null}));
    fireEvent.click(await screen.findByRole("button", {name: "Acknowledge"}));
    await waitFor(() => expect(repository.steps).toEqual([{requestId: sampleTakedownDetail.request.requestId, action: "acknowledge"}]));
    await waitFor(() => expect(notices[0]).toMatch(/Acknowledged/u));
  });

  it("needs the takedown case id to action a removal, and records it", async () => {
    draw(sampleTakedownDetail);
    const action = await screen.findByRole("button", {name: "Action it"});
    fireEvent.change(screen.getByLabelText("Action it"), {target: {value: "removedAndSuppressed"}});
    fireEvent.click(action);
    expect(repository.steps).toEqual([]);
    fireEvent.change(screen.getByLabelText("Takedown case id"), {target: {value: "TD-0042"}});
    fireEvent.click(screen.getByRole("button", {name: "Action it"}));
    await waitFor(() => expect(repository.steps[0]).toMatchObject({action: "action", outcome: "removedAndSuppressed", caseId: "TD-0042"}));
  });

  it("asks for more only with a fixed template, and declines only with a fixed reason", async () => {
    const {notices} = draw(sampleTakedownDetail);
    fireEvent.change(await screen.findByLabelText("Ask for more"), {target: {value: "replyFromDomainEmail"}});
    expect(screen.getByText(takedownInfoTemplates.replyFromDomainEmail.message)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", {name: "Record that we asked"}));
    // One step at a time: the operation lease refuses a second write until the first settles.
    await waitFor(() => expect(notices).toHaveLength(1));
    await waitFor(() => expect(getTakedownRequest).toHaveBeenCalledTimes(2));
    await new Promise((resolve) => setTimeout(resolve, 0));
    fireEvent.change(screen.getByLabelText("Decline it"), {target: {value: "couldNotVerify"}});
    fireEvent.click(screen.getByRole("button", {name: "Decline"}));
    await waitFor(() => expect(repository.steps.map((step) => step.action)).toEqual(["requestInfo", "decline"]));
    expect(repository.steps[1]).toMatchObject({declineReason: "couldNotVerify"});
  });

  it("suspends the named organiser's page in one click, only where the server allows it", async () => {
    const {notices} = draw(sampleTakedownDetail);
    fireEvent.click(await screen.findByRole("button", {name: "Suspend the organiser page"}));
    await waitFor(() => expect(repository.steps).toEqual([{requestId: sampleTakedownDetail.request.requestId, action: "suspendOrganizer"}]));
    await waitFor(() => expect(notices[0]).toMatch(/Page suspended/u));
    cleanup();
    draw(withRequest({}, {canSuspendOrganizer: false}));
    await screen.findByText("Ask for more");
    expect(screen.queryByRole("button", {name: "Suspend the organiser page"})).toBeNull();
  });

  it("hides decisions from support and leaves the appeal to a second reviewer", async () => {
    draw(withRequest({}, {canDecide: false}));
    await screen.findByText("Ask for more");
    expect(screen.queryByRole("button", {name: "Action it"})).toBeNull();
    cleanup();
    draw(withRequest({status: "appealed", deciderUid: "staff-1", appeal: {recordedAt: "2026-11-18T07:00:00.000Z", recordedByUid: "staff-2",
      dueAt: "2026-11-25T07:00:00.000Z", decision: null, decidedAt: null, decidedByUid: null}}, {canDecideAppeal: false}));
    expect(await screen.findByText("Waiting for a second reviewer")).toBeTruthy();
  });

  it("marks deadlines close or past", () => {
    expect(deadlineLabel("2026-11-18T07:00:00.000Z", now)?.tone).toBe("danger");
    expect(deadlineLabel("2026-11-18T10:00:00.000Z", now)?.tone).toBe("warning");
    expect(deadlineLabel("2026-11-20T10:00:00.000Z", now)?.tone).toBeUndefined();
    expect(activeDeadline({...sampleTakedownDetail.request, status: "received"}).label).toBe("Acknowledge by");
  });
});
