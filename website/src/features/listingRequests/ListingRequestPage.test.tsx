import {cleanup, fireEvent, render, screen, waitFor} from "@testing-library/react";
import {MemoryRouter} from "react-router";
import {afterEach, describe, expect, it, vi} from "vitest";
import {listingRequestCopy as copy} from "@content/listingRequest";
import {listingPolicyContent} from "@content/listingPolicies";
import type {ListingRequestDraftBody, ListingRequestSubmission} from "../../shared/api/listingRequest";
import {ListingPolicyPage} from "./ListingPolicyPage";
import {ListingRequestPage} from "./ListingRequestPage";
import {requestTypes, type RequestType} from "./listingRequestModel";

afterEach(cleanup);

function harness(entry = "/listings/request/?organizer=lantern-lane-social") {
  const submit = vi.fn(async (body: ListingRequestDraftBody) => ({status: "sent" as const, receipt: {requestId: `lr-${"a".repeat(40)}`,
    reference: "LR-K7Q2M9TX", requestType: body.requestType, isNew: true, ackDueAt: "2026-11-19T06:00:00.000Z", actionDueAt: null,
    resolveDueAt: "2026-11-25T06:00:00.000Z"}}));
  const submission: ListingRequestSubmission = {submit, reset: vi.fn()};
  render(<MemoryRouter initialEntries={[entry]}><ListingRequestPage submission={submission} /></MemoryRouter>);
  return {submit};
}

/** Escapes every regex metacharacter, backslash included, so a label is matched literally. */
const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
const field = (label: string, value: string) => fireEvent.change(screen.getByLabelText(new RegExp(`^${escapeRegExp(label)}`, "u")), {target: {value}});
const radio = (name: string) => fireEvent.click(screen.getByRole("radio", {name: new RegExp(`^${escapeRegExp(name)}`, "u")}));
const button = (name: string) => fireEvent.click(screen.getByRole("button", {name}));

/** The fields each type shows on step 2, by label. */
const typeFields: Record<RequestType, string[]> = {
  claim: [copy.proof.method],
  correctFact: [copy.fields.fact.label, copy.fields.correction.label, copy.fields.evidenceUrl.label],
  removeAndDoNotList: [copy.proof.method],
  trademark: [copy.fields.basis.label, copy.fields.trademarkRemedy.label],
  copyright: [copy.fields.workKind.label, copy.fields.originalWorkUrl.label, copy.fields.ownershipBasis.label],
  privacy: [copy.fields.relationship.label, copy.fields.dataKinds.label, copy.fields.identityMatch.label, copy.fields.privacyRemedy.label],
  impersonation: [copy.proof.method],
  legalOrder: [copy.fields.issuingBody.label, copy.fields.orderReference.label, copy.fields.orderDate.label],
};

describe("listing request form", {timeout: 20_000}, () => {
  it("offers the eight fixed types with their timelines, and needs one chosen", () => {
    harness();
    expect(screen.getAllByRole("radio")).toHaveLength(8);
    for (const type of requestTypes) expect(screen.getByText(copy.types[type].timeline)).toBeTruthy();
    button(copy.typeStep.continue);
    expect(screen.getByRole("alert").textContent).toBe(copy.errors.type);
  });

  it.each(requestTypes)("shows %s's own fixed fields and no other type's", (type) => {
    harness(`/listings/request/?organizer=lantern-lane-social&type=${type}`);
    for (const label of typeFields[type]) expect(screen.getAllByText(label).length).toBeGreaterThan(0);
    const others = requestTypes.filter((other) => other !== type && typeFields[other].some((label) => !typeFields[type].includes(label)));
    for (const other of others) {
      for (const label of typeFields[other].filter((entry) => !typeFields[type].includes(entry))) expect(screen.queryByText(label)).toBeNull();
    }
    // One short optional context line, capped; no free-text demand box.
    expect(screen.getByLabelText(copy.detailsStep.context.label).getAttribute("maxlength") ?? "280").toBe("280");
  });

  it("prefills the listing from the link, so no address is asked for, and can change it", () => {
    harness("/listings/request/?organizer=lantern-lane-social&type=claim");
    expect(screen.getByText(copy.detailsStep.target.organizer)).toBeTruthy();
    expect(screen.queryByLabelText(copy.detailsStep.target.label)).toBeNull();
    button(copy.detailsStep.target.change);
    expect(screen.getByLabelText(copy.detailsStep.target.label)).toBeTruthy();
  });

  it("asks for a page link when opened without one", () => {
    harness("/listings/request/?type=correctFact");
    button(copy.detailsStep.continue);
    expect(screen.getByText(copy.errors.target)).toBeTruthy();
  });

  it("requires every declaration before sending, then sends the type's body and shows the reference", async () => {
    const {submit} = harness("/listings/request/?organizer=lantern-lane-social&type=removeAndDoNotList");
    field(copy.detailsStep.name.label, "Asha Verma");
    radio(copy.roles.owner);
    field(copy.detailsStep.email.label, "asha@lanternlane.example");
    radio(copy.proof.domainEmail);
    field(copy.proof.domain.label, "lanternlane.example");
    button(copy.detailsStep.continue);
    expect(screen.getAllByRole("checkbox")).toHaveLength(3);
    button(copy.declarationsStep.send);
    expect(screen.getByText(copy.errors.declarations)).toBeTruthy();
    expect(submit).not.toHaveBeenCalled();
    for (const box of screen.getAllByRole("checkbox")) fireEvent.click(box);
    button(copy.declarationsStep.send);
    await waitFor(() => expect(screen.getByText("Your reference: LR-K7Q2M9TX")).toBeTruthy());
    const body = submit.mock.calls[0][0] as unknown as Record<string, unknown>;
    expect(body).toMatchObject({requestType: "removeAndDoNotList", target: {kind: "organizer", organizerId: "lantern-lane-social"},
      verification: {proofMethod: "domainEmail", officialDomain: "lanternlane.example"},
      declarations: {accurate: true, authorised: true, contactConsent: true}});
    for (const step of copy.sent.next) expect(screen.getByText(step.title)).toBeTruthy();
  });

  it("asks trademark requests for the good-faith declaration too", () => {
    harness("/listings/request/?organizer=lantern-lane-social&type=trademark");
    field(copy.detailsStep.name.label, "Asha Verma");
    radio(copy.roles.rightsHolder);
    field(copy.detailsStep.email.label, "asha@lanternlane.example");
    radio(copy.fields.basis.options.unregistered);
    field(copy.fields.firstUseYear.label, "2019");
    field(copy.fields.evidenceUrl.label, "https://lanternlane.example/history");
    radio(copy.fields.trademarkRemedy.options.relabel);
    button(copy.detailsStep.continue);
    expect(screen.getByText(copy.declarations.goodFaith)).toBeTruthy();
    expect(screen.getAllByRole("checkbox")).toHaveLength(4);
  });
});

describe("listing policy drafts", () => {
  it("render under the draft banner with counsel markers and the grievance officer from the brand", () => {
    render(<ListingPolicyPage policy="takedownPolicy" />);
    expect(listingPolicyContent.status).toBe("draft");
    expect(screen.getByText(listingPolicyContent.banner.title)).toBeTruthy();
    expect(screen.getByRole("heading", {name: "Grievance Officer"})).toBeTruthy();
    expect(document.body.textContent).toContain("[counsel");
    expect(document.body.textContent).not.toMatch(/\{\{|dating/iu);
  });
});
