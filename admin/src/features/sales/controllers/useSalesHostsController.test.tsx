import {act, cleanup, renderHook, waitFor} from "@testing-library/react";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {createQueryHarness} from "../../../shared/test/queryHarness";
import {useSalesHostsController} from "./useSalesHostsController";

const repository = vi.hoisted(() => ({listSalesAccounts: vi.fn(), getSalesAccount: vi.fn(), listSalesContacts: vi.fn(),
  recordSalesActivity: vi.fn(), upsertSalesTask: vi.fn(), upsertSalesOpportunity: vi.fn(), updateSalesAccount: vi.fn(), upsertSalesContact: vi.fn()}));
vi.mock("../api/salesRepository", () => repository);

describe("useSalesHostsController", () => {
  afterEach(cleanup);
  beforeEach(() => {
    Object.values(repository).forEach((mock) => mock.mockReset());
    repository.listSalesAccounts.mockImplementation(async ({cursor}: {cursor?: string}) => ({
      rows: [{organizerId: cursor ? "older" : "harbor", name: cursor ? "Older" : "Harbor", researchStatus: "qualified"}],
      nextCursor: cursor ? null : "page-2"}));
    repository.getSalesAccount.mockResolvedValue({account: {organizerId: "harbor", revision: 1, researchStatus: "qualified"},
      organizerSummary: {name: "Harbor"}, activities: [], opportunities: [], tasks: []});
    repository.listSalesContacts.mockResolvedValue({rows: [{contactId: "c1", displayName: "Kavya"}]});
  });

  it("lists a person's hosts, searches and pages, and opens one host", async () => {
    const {wrapper} = createQueryHarness();
    const {result} = renderHook(() => useSalesHostsController({ownerUid: "riya", selectedOrganizerId: "harbor", uid: "riya", onError: vi.fn(), onNotice: vi.fn()}), {wrapper});
    await waitFor(() => expect(result.current.rows.map((row) => row.organizerId)).toEqual(["harbor"]));
    expect(repository.listSalesAccounts).toHaveBeenCalledWith({limit: 25, ownerUid: "riya"});
    await waitFor(() => expect(result.current.host?.organizerSummary.name).toBe("Harbor"));
    act(() => result.current.nextPage());
    await waitFor(() => expect(result.current.rows.map((row) => row.organizerId)).toEqual(["older"]));
    act(() => result.current.setQuery(" bandra "));
    await waitFor(() => expect(repository.listSalesAccounts).toHaveBeenLastCalledWith({limit: 25, ownerUid: "riya", query: "bandra"}));
    expect(result.current.hasPreviousPage).toBe(false);
    act(() => result.current.setTab("deals"));
    expect(result.current.tab).toBe("deals");
  });

  it("logs, adds and completes next steps and moves a deal, then reloads the host", async () => {
    const {wrapper} = createQueryHarness();
    const onError = vi.fn();
    const onNotice = vi.fn();
    const {result} = renderHook(() => useSalesHostsController({ownerUid: null, selectedOrganizerId: "harbor", uid: "riya", onError, onNotice}), {wrapper});
    await waitFor(() => expect(result.current.contacts).toHaveLength(1));
    const reads = repository.getSalesAccount.mock.calls.length;

    await act(async () => { await result.current.logActivity({type: "call", note: "Wants a demo"}); });
    expect(repository.recordSalesActivity.mock.calls[0][0]).toMatchObject({organizerId: "harbor", type: "call", note: "Wants a demo"});

    await act(async () => { await result.current.addNextStep({kind: "demo", title: "Demo", dueAt: "2026-11-05T13:30:00.000Z"}); });
    expect(repository.upsertSalesTask.mock.calls[0][0]).toMatchObject({organizerId: "harbor", expectedRevision: 0,
      task: {kind: "demo", title: "Demo", ownerUid: "riya", status: "open"}});

    const task = {taskId: "t1", kind: "demo", title: "Demo", dueAt: null, ownerUid: "dev", status: "open", revision: 4};
    await act(async () => { await result.current.completeNextStep(task as never); });
    expect(repository.upsertSalesTask.mock.calls[1][0]).toMatchObject({taskId: "t1", expectedRevision: 4,
      task: {ownerUid: "dev", status: "completed"}});

    const deal = {opportunityId: "o1", organizerId: "harbor", motion: "expansion", stage: "contacted", ownerUid: "dev", nextStep: "Call", nextStepAt: null, revision: 2};
    await act(async () => { await result.current.saveDeal(deal, {stage: "closed_lost", nextStep: "Stop", nextStepAt: "2026-11-05T13:30:00.000Z", transitionReason: "No budget"}); });
    expect(repository.upsertSalesOpportunity.mock.calls[0][0]).toMatchObject({opportunityId: "o1", expectedRevision: 2,
      transitionReason: "No budget", fields: {motion: "expansion", ownerUid: "dev", stage: "closed_lost"}});
    await act(async () => { await result.current.saveDeal(null, {stage: "new_enquiry", nextStep: "Call", nextStepAt: "2026-11-05T13:30:00.000Z"}); });
    expect(repository.upsertSalesOpportunity.mock.calls[1][0]).toMatchObject({expectedRevision: 0,
      fields: {motion: "first_workflow_pilot", ownerUid: "riya"}});
    await waitFor(() => expect(repository.getSalesAccount.mock.calls.length).toBeGreaterThan(reads));
    expect(onError).not.toHaveBeenCalledWith(expect.any(String));
  });

  it("the team can edit research and owner; a sales associate edits only the summary and next action", async () => {
    const {wrapper} = createQueryHarness();
    const input = {researchStatus: "qualified" as const, assignedOwnerUid: "dev", summary: " Quiz nights ", nextAction: ""};
    const team = renderHook(() => useSalesHostsController({ownerUid: null, selectedOrganizerId: "harbor", uid: "dev", onError: vi.fn(), onNotice: vi.fn()}), {wrapper});
    expect(team.result.current.canEditResearch).toBe(true);
    await act(async () => { await team.result.current.saveHost(3, input); });
    expect(repository.updateSalesAccount.mock.calls[0][0]).toMatchObject({organizerId: "harbor", expectedRevision: 3,
      patch: {researchStatus: "qualified", assignedOwnerUid: "dev", summary: "Quiz nights", nextAction: null}});

    const own = renderHook(() => useSalesHostsController({ownerUid: "riya", selectedOrganizerId: "harbor", uid: "riya", onError: vi.fn(), onNotice: vi.fn()}), {wrapper});
    expect(own.result.current.canEditResearch).toBe(false);
    await act(async () => { await own.result.current.saveHost(3, input); });
    expect(repository.updateSalesAccount.mock.calls[1][0].patch).toEqual({summary: "Quiz nights", nextAction: null});
  });

  it("adds a person as a new contact", async () => {
    const {wrapper} = createQueryHarness();
    const {result} = renderHook(() => useSalesHostsController({ownerUid: null, selectedOrganizerId: "harbor", uid: "dev", onError: vi.fn(), onNotice: vi.fn()}), {wrapper});
    const person = {contact: {displayName: "Kavya"}, relationship: {role: "Founder", decisionInfluence: "decision_maker" as const, primary: true}};
    await act(async () => { await result.current.addPerson(person); });
    expect(repository.upsertSalesContact.mock.calls[0][0]).toMatchObject({...person, organizerId: "harbor", expectedRevision: 0});
  });

  it("reports a refused write and leaves the sheet open", async () => {
    const {wrapper} = createQueryHarness();
    const onError = vi.fn();
    repository.upsertSalesOpportunity.mockRejectedValue(new Error("Someone updated this opportunity. Reload before saving."));
    const {result} = renderHook(() => useSalesHostsController({ownerUid: null, selectedOrganizerId: "harbor", uid: "riya", onError, onNotice: vi.fn()}), {wrapper});
    let done = true;
    await act(async () => { done = await result.current.saveDeal(null, {stage: "new_enquiry", nextStep: "Call", nextStepAt: null}); });
    expect(done).toBe(false);
    expect(onError).toHaveBeenLastCalledWith("Someone updated this opportunity. Reload before saving.");
  });
});
