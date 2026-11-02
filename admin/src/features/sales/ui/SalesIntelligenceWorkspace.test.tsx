import {act, cleanup, fireEvent, render, screen, waitFor} from
  "@testing-library/react";
import {QueryClient, QueryClientProvider} from "@tanstack/react-query";
import {afterEach, expect, it, vi} from "vitest";
import type {IntelligenceApi} from "../api/salesIntelligenceTypes";
import {SalesIntelligenceWorkspace} from "./SalesIntelligenceWorkspace";

afterEach(() => {cleanup(); vi.unstubAllGlobals();});
const evaluatedAt = "2026-09-28T10:00:00.000Z";
const hash = "a".repeat(64);
function fixture() {
  const policy = {policyId: "policy-one", version: "v1", revision: 1,
    status: "active" as const, factors: ["a", "b", "c", "d", "e", "f", "g"]
      .map((id, index) => ({id, weight: index === 6 ? 16 : 14,
        claimKeys: ["operation" as const],
        maxAgeDays: 30})), priorityBands: {high: 80, medium: 50},
    promptVersion: "prompt-v1", playbookVersion: "playbook-v1"};
  const clause = (clauseId: string, kind: "observation" | "capability" |
    "cta", text: string) => ({clauseId, organizerId: "org-one", revision: 1,
    kind, text, state: "approved" as const, evidenceIds: [],
    validUntil: "2099-01-01T00:00:00.000Z", permission: "not_required" as const,
    reviewedAt: evaluatedAt});
  const api = {catalog: vi.fn(async () => ({policy, assessments: [],
    clauses: [clause("observation-one", "observation", "Host uses applications."),
      clause("capability-one", "capability", "Catch collects applications."),
      clause("cta-one", "cta", "Would a walkthrough help?")], evaluatedAt})),
  score: vi.fn(async () => ({snapshot: {status: "needs_research",
    score: null, priority: "unranked", policyVersion: "v1", evaluatedAt,
    factors: []}})),
  account: vi.fn(async () => ({account: {organizerId: "org-one", revision: 1,
    researchStatus: "qualified", suppressionStatus: "clear"},
  organizerSummary: {name: "Example Host"}, activities: [], tasks: [],
  opportunities: [{opportunityId: "opportunity-one", organizerId: "org-one",
    motion: "first_pilot", stage: "ready_to_contact", ownerUid: "employee-one",
    nextStep: null, nextStepAt: null, revision: 1}]})),
  contacts: vi.fn(async () => ({rows: [{contactId: "contact-one",
    displayName: "Example Contact", relationship: {revision: 1,
      role: "organizer", decisionInfluence: "operator", primary: true,
      contactabilityStatus: "draft_reviewed", sendAuthority: false}}],
    nextCursor: null})),
  evidence: vi.fn(async () => ({rows: [], nextCursor: null})),
  drafts: vi.fn(async () => ({rows: [{draftId: "draft-one",
    contactId: "contact-one", opportunityId: "opportunity-one",
    subject: "Private note", status: "approved", contentHash: hash,
    createdAt: evaluatedAt, reviewedAt: evaluatedAt}]})),
  draft: vi.fn(async () => ({draftId: "draft-one", status: "approved",
    reviewedAt: evaluatedAt, reviewedBy: "employee-one",
    sendAuthority: false, draft: {draftId: "draft-one", subject: "Private note",
      text: "Approved text", contentHash: hash, sendAuthority: false,
      model: {modelId: "deterministic", usage: {inputTokens: 0,
        outputTokens: 0, costMicros: 0}}, sentences: []}})),
  job: vi.fn(), assess: vi.fn(), savePolicy: vi.fn(),
  saveClause: vi.fn(), reviewClause: vi.fn(),
  generate: vi.fn(async () => ({status: "completed" as const,
    result: {draftId: "draft-one", contentHash: hash}})),
  review: vi.fn(), copy: vi.fn(async () => ({draftId: "draft-one",
    exactContentHash: hash, subject: "Private note", text: "Approved text",
    copiedAt: evaluatedAt, sendAuthority: false, providerConfirmed: false}))} as
    IntelligenceApi;
  const client = new QueryClient({defaultOptions: {queries: {retry: false}}});
  const tree = (isAdminOwner = false, actorUid = "employee-one", organizerId = "org-one") => <QueryClientProvider client={client}>
    <SalesIntelligenceWorkspace organizerId={organizerId} organizerName="Example Host"
      currentUserUid={actorUid} isAdminOwner={isAdminOwner} api={api} />
  </QueryClientProvider>;
  const view = (isAdminOwner = false) => render(tree(isAdminOwner));
  return {api, view, tree, client};
}

it("selects current approved sources and prepares a real private draft request", async () => {
  const {api, view} = fixture();
  view();
  await screen.findByText("Host uses applications.");
  fireEvent.change(screen.getByLabelText("Reviewed contact"),
    {target: {value: "contact-one"}});
  fireEvent.change(screen.getByLabelText("Opportunity ready for contact"),
    {target: {value: "opportunity-one"}});
  fireEvent.change(screen.getByLabelText("Host observation"),
    {target: {value: "observation-one"}});
  fireEvent.change(screen.getByLabelText("Catch capability"),
    {target: {value: "capability-one"}});
  fireEvent.change(screen.getByLabelText("Question or next step"),
    {target: {value: "cta-one"}});
  fireEvent.click(screen.getByRole("button", {name: "Review plan and prepare private draft"}));
  await waitFor(() => expect(api.generate).toHaveBeenCalledOnce());
  expect(vi.mocked(api.generate).mock.calls[0][0].sourceRequest).toEqual({
    organizerId: "org-one", contactId: "contact-one",
    opportunityId: "opportunity-one", observationIds: ["observation-one"],
    capabilityIds: ["capability-one"], referenceIds: [], ctaIds: ["cta-one"],
    channel: "email", purpose: "first_message"});
  expect(screen.queryByRole("button", {name: /send/iu})).toBeNull();
});

it("offers copy only after server-reviewed draft and never claims delivery", async () => {
  const {api, view} = fixture();
  const writeText = vi.fn(async () => undefined);
  vi.stubGlobal("navigator", {...navigator, clipboard: {writeText}});
  view();
  fireEvent.click(await screen.findByRole("button", {name: "Open draft"}));
  fireEvent.click(await screen.findByRole("button", {name: "Copy approved text"}));
  await waitFor(() => expect(api.copy).toHaveBeenCalledOnce());
  expect(vi.mocked(api.copy).mock.calls[0][0].expectedContentHash).toBe(hash);
  await waitFor(() => expect(writeText).toHaveBeenCalledWith(
    "Private note\n\nApproved text"));
  expect(screen.getByText(/Sending, if appropriate, is a separate manual action/u))
    .toBeTruthy();
});

it("keeps wording approval unavailable to non-owner staff", async () => {
  const {api, view} = fixture();
  view(false);
  await screen.findByText("Host uses applications.");
  expect(screen.queryByRole("button", {name: "Approve wording"})).toBeNull();
  expect(screen.queryByRole("button", {name: "Save sentence for approval"}))
    .toBeNull();
  expect(api.reviewClause).not.toHaveBeenCalled();
  expect(screen.queryByRole("button", {name: "Review policy settings"})).toBeNull();
  expect(api.savePolicy).not.toHaveBeenCalled();
});

it("lets an owner configure seven factors without seeded strategy", async () => {
  const {api, view} = fixture();
  vi.mocked(api.catalog).mockResolvedValue({policy: null,
    assessments: [], clauses: [], evaluatedAt});
  vi.mocked(api.savePolicy).mockImplementation(async ({policy}) => ({
    policy: {...policy, revision: 1}}));
  view(true);
  fireEvent.click(await screen.findByRole("button",
    {name: "Set up private fit policy"}));
  expect(screen.getByLabelText("Factor 1 name")).toHaveProperty("value", "");
  // Query this large form once and keep the elements: repeating label and role queries for all
  // seven factors took most of the test's time, which made it time out on a busy machine.
  const names = screen.getAllByLabelText(/^Factor \d name$/u);
  const weights = screen.getAllByLabelText(/^Factor \d weight out of 100$/u);
  const ages = screen.getAllByLabelText(/^Factor \d evidence age limit in days$/u);
  const evidenceKinds = screen.getAllByLabelText(/^Current operations · factor \d$/u);
  expect(names).toHaveLength(7);
  names.forEach((name, index) => {
    fireEvent.change(name, {target: {value: `Factor ${index + 1}`}});
    fireEvent.change(weights[index]!, {target: {value: index === 6 ? "16" : "14"}});
    fireEvent.change(ages[index]!, {target: {value: "30"}});
    fireEvent.click(evidenceKinds[index]!);
  });
  fireEvent.change(screen.getByLabelText("High priority begins at"),
    {target: {value: "80"}});
  fireEvent.change(screen.getByLabelText("Medium priority begins at"),
    {target: {value: "50"}});
  fireEvent.click(screen.getByRole("button", {name: "Save reviewed policy"}));
  await waitFor(() => expect(api.savePolicy).toHaveBeenCalledOnce());
  const request = vi.mocked(api.savePolicy).mock.calls[0][0];
  expect(request.expectedRevision).toBe(0);
  expect(request.policy.status).toBe("paused");
  expect(request.policy.factors.map((factor) => factor.id)).toEqual(
    ["factor_1", "factor_2", "factor_3", "factor_4", "factor_5",
      "factor_6", "factor_7"]);
  expect(request.policy.factors.reduce((sum, factor) =>
    sum + factor.weight, 0)).toBe(100);
});

it("preserves unchanged existing factor IDs when editing an owner policy", async () => {
  const {api, view} = fixture();
  vi.mocked(api.catalog).mockImplementation(async () => ({
    policy: {policyId: "policy-one", version: "v1", revision: 1,
      status: "paused", factors: ["a.one", "b.two", "c", "d", "e", "f", "g"]
        .map((id, index) => ({id, weight: index === 6 ? 16 : 14,
          claimKeys: ["operation"], maxAgeDays: 30})),
      priorityBands: {high: 80, medium: 50}, promptVersion: "prompt-v1",
      playbookVersion: "playbook-v1"},
    assessments: [], clauses: [], evaluatedAt}));
  vi.mocked(api.savePolicy).mockImplementation(async ({policy}) => ({
    policy: {...policy, revision: 2}}));
  view(true);
  fireEvent.click(await screen.findByRole("button",
    {name: "Review policy settings"}));
  await waitFor(() => expect(screen.getByLabelText("Factor 1 name"))
    .toHaveProperty("value", "A.One"));
  fireEvent.change(screen.getByLabelText("Factor 1 evidence age limit in days"),
    {target: {value: "31"}});
  fireEvent.click(screen.getByRole("button", {name: "Save reviewed policy"}));
  await waitFor(() => expect(api.savePolicy).toHaveBeenCalledOnce());
  const request = vi.mocked(api.savePolicy).mock.calls[0][0];
  expect(request.expectedRevision).toBe(1);
  expect(request.policy.factors[0].id).toBe("a.one");
  expect(request.policy.factors[1].id).toBe("b.two");
});


it("freezes factor review revision until the changed source is compared", async () => {
  const {api, view, client} = fixture();
  view();
  await screen.findByText("Host uses applications.");
  fireEvent.change(screen.getByLabelText("Factor"), {target: {value: "a"}});
  fireEvent.change(screen.getByLabelText("Why is this unknown or disputed?"),
    {target: {value: "Original review"}});
  const current = await api.catalog("org-one");
  act(() => client.setQueryData(["sales-intelligence", "employee-one", "org-one", "catalog"],
    {...current, assessments: [{factorId: "a", revision: 2, state: "unknown",
      value: null, evidenceIds: [], reason: "Another reviewer"}]}));
  await waitFor(() => expect(screen.getByRole("button", {name: "Record review"})).toHaveProperty("disabled", true));
  expect(screen.getByLabelText("Why is this unknown or disputed?"))
    .toHaveProperty("value", "Original review");
  fireEvent.click(screen.getByRole("button", {name: "Use current factor review"}));
  fireEvent.click(screen.getByRole("button", {name: "Record review"}));
  await waitFor(() => expect(api.assess).toHaveBeenCalledOnce());
  expect(vi.mocked(api.assess).mock.calls[0][0]).toMatchObject({
    expectedRevision: 2, reason: "Another reviewer"});
});

for (const changedScope of ["actor", "host"] as const) {
  it(`does not copy a pending prior ${changedScope} result after scope changes`, async () => {
    const {api, view, tree} = fixture();
    const originalCopy = await api.copy({} as never);
    let resolveCopy!: (value: typeof originalCopy) => void;
    vi.mocked(api.copy).mockImplementation(() => new Promise(resolve => {resolveCopy = resolve;}));
    const writeText = vi.fn(async () => undefined);
    vi.stubGlobal("navigator", {...navigator, clipboard: {writeText}});
    const shown = view();
    fireEvent.click(await screen.findByRole("button", {name: "Open draft"}));
    fireEvent.click(await screen.findByRole("button", {name: "Copy approved text"}));
    shown.rerender(tree(false, changedScope === "actor" ? "employee-two" : "employee-one",
      changedScope === "host" ? "org-two" : "org-one"));
    await act(async () => {resolveCopy(originalCopy);});
    expect(writeText).not.toHaveBeenCalled();
  });
}

it("requires new factual and tone review for an automatically replaced draft", async () => {
  const {api, view, client} = fixture();
  const original = await api.draft("draft-one");
  vi.mocked(api.draft).mockResolvedValue({...original, status: "pending_review"});
  view();
  fireEvent.click(await screen.findByRole("button", {name: "Open draft"}));
  const facts = await screen.findByLabelText("I checked every factual claim against the current source.");
  fireEvent.click(facts);
  fireEvent.click(screen.getByLabelText("I approve the tone and understand this is manual copy only."));
  expect(screen.getByRole("button", {name: "Approve exact draft"})).toHaveProperty("disabled", false);
  act(() => client.setQueryData(["sales-intelligence", "employee-one", "org-one", "draft", "draft-one"],
    {...original, draftId: "draft-two", status: "pending_review",
      draft: {...original.draft, draftId: "draft-two", contentHash: "b".repeat(64)}}));
  await waitFor(() => expect(screen.getByRole("button", {name: "Approve exact draft"})).toHaveProperty("disabled", true));
  expect(api.review).not.toHaveBeenCalled();
});

it("shares public citations only after an owner's explicit selection", async () => {
  const {api, view} = fixture();
  const catalog = await api.catalog("org-one");
  const option = {evidenceId: "evidence-public", sourceHash: hash,
    sourceRef: "https://public.example.test/events", excerpt: "Public excerpt",
    observedAt: evaluatedAt, validThrough: null, confidence: "high" as const};
  vi.mocked(api.catalog).mockResolvedValue({...catalog, clauses: [{...catalog.clauses[0], state: "draft",
    partnerCitationOptions: [option]}]});
  view(true);
  const choice = await screen.findByLabelText(/Share this exact public citation/u);
  expect(choice).toHaveProperty("checked", false);
  fireEvent.click(choice);
  fireEvent.click(screen.getByRole("button", {name: "Approve wording"}));
  await waitFor(() => expect(api.reviewClause).toHaveBeenCalledOnce());
  expect(vi.mocked(api.reviewClause).mock.calls[0][0]).toMatchObject({
    clauseId: catalog.clauses[0].clauseId, expectedRevision: 1, decision: "approve",
    partnerCitations: [{evidenceId: option.evidenceId, sourceHash: hash}]});
});

it("does not carry citation sharing selection onto changed source content", async () => {
  const {api, view, client} = fixture();
  const catalog = await api.catalog("org-one");
  const option = {evidenceId: "evidence-public", sourceHash: hash,
    sourceRef: "https://public.example.test/events", excerpt: "Original public excerpt",
    observedAt: evaluatedAt, validThrough: null, confidence: "high" as const};
  const original = {...catalog, clauses: [{...catalog.clauses[0], state: "draft" as const, partnerCitationOptions: [option]}]};
  vi.mocked(api.catalog).mockResolvedValue(original);
  view(true);
  fireEvent.click(await screen.findByLabelText(/Share this exact public citation/u));
  const changed = {...original, clauses: [{...original.clauses[0],
    partnerCitationOptions: [{...option, excerpt: "Changed public excerpt", sourceHash: "b".repeat(64)}]}]};
  act(() => client.setQueryData(["sales-intelligence", "employee-one", "org-one", "catalog"], changed));
  await waitFor(() => expect(screen.getByLabelText(/Share this exact public citation/u)).toHaveProperty("checked", false));
  fireEvent.click(screen.getByRole("button", {name: "Approve wording"}));
  await waitFor(() => expect(api.reviewClause).toHaveBeenCalledOnce());
  expect(vi.mocked(api.reviewClause).mock.calls[0][0]).not.toHaveProperty("partnerCitations");
});
