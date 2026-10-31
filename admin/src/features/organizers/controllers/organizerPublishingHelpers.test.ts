import {describe, expect, it} from "vitest";
import {sampleOrganizerDetails} from "../../../shared/api/sampleData";
import {
  buildOrganizerSavePayload,
  countIncompletePublishChecklist,
  diffOrganizerProfile,
  emptyOrganizerOwnerLinkDraft,
  emptyPublishChecklist,
  formFromOrganizerProfile,
  organizerOwnerLinkFieldId,
  organizerPublishingFieldIds,
  type OrganizerPublishingFormState,
  updateOrganizerLaunchMarket,
  validateOrganizerPublishingForm,
} from "./organizerPublishingHelpers";

const courtsideForm: OrganizerPublishingFormState = {
  organizerId: "courtside",
  name: "Courtside",
  description: "Mumbai padel socials and community play.",
  location: "in-mh-mumbai",
  area: "Mumbai",
  tagsText: "Padel socials\nCommunity play",
  instagramHandle: "",
  phoneNumber: "",
  email: "",
  imageUrl: "",
  profileImageUrl: "",
  organizerType: "community",
  publicCategoryLabel: "Padel socials",
  cityName: "Mumbai",
  regionName: "Maharashtra",
  countryCode: "IN",
  countryName: "India",
  appVisibility: "hidden",
  publicPageSlug: "courtside",
  publicPageCitySlug: "mumbai",
  canonicalPath: "/organizers/courtside/",
  publishStatus: "draft",
  seoTitle: "",
  seoDescription: "",
  sourceConfidence: "medium",
  verificationStatus: "sourceBacked",
  headline: "",
  summary: "",
  sourceSummary: "Official source identifies Courtside in Mumbai.",
  formatsText: "Padel socials\nCommunity play",
  ownerLinks: [],
  reviewNote: "",
};

describe("organizerPublishingHelpers", () => {
  it("updates the governed market projection as one choice", () => {
    const updated = updateOrganizerLaunchMarket(
      {
        ...courtsideForm,
        canonicalPath: "/organizers/mumbai/courtside/",
      },
      "in-mp-indore"
    );

    expect(updated).toMatchObject({
      location: "in-mp-indore",
      cityName: "Indore",
      regionName: "Madhya Pradesh",
      countryCode: "IN",
      countryName: "India",
      publicPageCitySlug: "indore",
      canonicalPath: "/organizers/indore/courtside/",
    });
  });

  it("turns the Courtside publish blockers into field targets", () => {
    const issues = validateOrganizerPublishingForm(
      courtsideForm,
      {publishing: true, requireReviewNote: true}
    );

    expect(issues.map((issue) => issue.id)).toEqual([
      "review-note",
      "headline",
      "summary",
      "source-confidence",
    ]);
    expect(issues.map((issue) => issue.targetId)).toEqual([
      organizerPublishingFieldIds.reviewNote,
      organizerPublishingFieldIds.headline,
      organizerPublishingFieldIds.summary,
      organizerPublishingFieldIds.sourceConfidence,
    ]);
    expect(countIncompletePublishChecklist(emptyPublishChecklist)).toBe(4);
  });

  it("blocks invalid market, route, URL, and email combinations", () => {
    const issues = validateOrganizerPublishingForm({
      ...courtsideForm,
      location: "Mumbai",
      publicPageSlug: "Courtside Mumbai",
      canonicalPath: "/organizers/not-courtside/",
      imageUrl: "javascript:alert(1)",
      email: "not-an-email",
    });

    expect(issues.map((issue) => issue.id)).toEqual(expect.arrayContaining([
      "launch-market",
      "slug-shape",
      "image-url",
      "email-shape",
      "route-slug",
    ]));
    expect(issues.every((issue) =>
      issue.severity !== "blocker" || Boolean(issue.targetId)
    )).toBe(true);
  });

  it("saves the page links only when they change, as one ordered list", () => {
    const organizer = sampleOrganizerDetails.afterfly;
    const form = formFromOrganizerProfile(organizer);
    expect(form.ownerLinks.map((link) => link.id))
      .toEqual(["diwali-run", "whatsapp"]);
    expect(buildOrganizerSavePayload(organizer, form).fields.ownerLinks)
      .toBeUndefined();
    expect(diffOrganizerProfile(organizer, form)).toEqual([]);

    const [diwali, whatsapp] = form.ownerLinks;
    const edited = {
      ...form,
      ownerLinks: [{...whatsapp, subtitle: "  ", label: " Community chat "},
        {...diwali, pinned: false, showUntil: ""}],
    };
    expect(buildOrganizerSavePayload(organizer, edited).fields.ownerLinks).toEqual([
      {...organizer.ownerLinks[1], label: "Community chat", subtitle: null},
      {...organizer.ownerLinks[0], pinned: false, showUntil: null},
    ]);
    expect(diffOrganizerProfile(organizer, edited)).toEqual([{
      field: "Page links",
      before: "Diwali night run tickets (pinned), Join the WhatsApp community",
      after: "Community chat, Diwali night run tickets",
    }]);
  });

  it("keeps the show-until time when the form round-trips it", () => {
    const organizer = sampleOrganizerDetails.afterfly;
    const form = formFromOrganizerProfile(organizer);
    expect(form.ownerLinks[0].showUntil).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/u);
    expect(new Date(form.ownerLinks[0].showUntil).toISOString())
      .toBe(organizer.ownerLinks[0].showUntil);
  });

  it("asks for a label and an https address on every page link", () => {
    const issues = validateOrganizerPublishingForm({
      ...courtsideForm,
      ownerLinks: [
        {...emptyOrganizerOwnerLinkDraft(), label: "Tickets",
          url: "https://www.district.in/courtside"},
        {...emptyOrganizerOwnerLinkDraft(), url: "http://courtside.in"},
      ],
    });
    expect(issues.filter((issue) => issue.id.startsWith("owner-link"))
      .map((issue) => issue.targetId)).toEqual([
      organizerOwnerLinkFieldId(1, "label"),
      organizerOwnerLinkFieldId(1, "url"),
    ]);
  });
});
