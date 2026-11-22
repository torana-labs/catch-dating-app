import {describe, expect, it} from "vitest";
import runClubs from "@content/playbook/pages/host/run-clubs.json";
import {playbookCopy} from "@content/playbook/playbookCopy";
import {websiteLeadCopy} from "@content/websiteLead";
import {validatedPlaybookPage, type PlaybookLeadForm, type PlaybookPageDocument} from "../../content/playbook/playbookContract";
import {isJoinWaitlistHttpRequest} from "../../shared/api/joinWaitlistContract";
import {joinWaitlistRequestSchema} from "../../shared/contracts/generated/joinWaitlistSchemas";
import {websiteLeadRequest} from "../../shared/api/websiteLead";
import {
  playbookGuideFormat,
  playbookGuideFormats,
  playbookLeadConsent,
  playbookLeadProblems,
  playbookLeadRequest,
  playbookSendableLeadKind,
  websiteLeadGuideFormats,
} from "./playbookLeadModel";
import {registeredPlaybookPages} from "./playbookPages";

// The run-clubs page's guide form, and venue and demo forms built on its words: a field is labelled by its name.
const guide = (validatedPlaybookPage(runClubs).sections.find((section) => section.type === "cta" && section.leadForm) as {leadForm: PlaybookLeadForm}).leadForm;
type FieldName = NonNullable<PlaybookLeadForm["fields"]>[number]["name"];
const fields = (...names: FieldName[]) => names.map((name) => ({name, label: name}));
const venue: PlaybookLeadForm = {...guide, id: "venue_list_space", requestKind: "venue", format: undefined, fields: fields("orgName", "area", "capacity", "nights")};
const demo: PlaybookLeadForm = {...guide, id: "demo_request", requestKind: "demo", format: undefined, fields: fields("name", "whatYouHost")};
const walkthrough: PlaybookLeadForm = {...guide, id: "walkthrough_request", requestKind: "walkthrough", format: undefined,
  fields: fields("name", "orgName", "whatYouHost", "preferredTime")};
const referral: PlaybookLeadForm = {...guide, id: "referral_host", requestKind: "referral", format: undefined,
  fields: fields("name", "hostName", "hostLink", "relationship")};
const appLink: PlaybookLeadForm = {id: "host_app_link", requestKind: "app_link", label: "Your WhatsApp number", submitLabel: "Text me the link"};

/** The guide names the lead contract lists for lead.guide.format, read from its description. */
function contractGuideFormats(): string[] {
  const match = /Which setup guide, as a slug: ([^.]+)\./u.exec(JSON.stringify(joinWaitlistRequestSchema));
  if (!match) throw new Error("The lead contract no longer lists its setup guides.");
  return match[1].replace(/ or /u, ", ").split(", ").map((name) => name.trim());
}

/** Every registered page's lead forms, read straight from its content (pending bindings or not). */
async function pageLeadForms(): Promise<{page: PlaybookPageDocument; form: PlaybookLeadForm}[]> {
  const forms: {page: PlaybookPageDocument; form: PlaybookLeadForm}[] = [];
  for (const ref of registeredPlaybookPages()) {
    const page = validatedPlaybookPage((await ref.entry.load()).default);
    for (const section of page.sections) {
      if ((section.type === "cta" || section.type === "split") && section.leadForm) forms.push({page, form: section.leadForm});
    }
  }
  return forms;
}

const entryPattern = /^[a-z0-9][a-z0-9_-]{0,39}$/u;

describe("playbook guide formats", () => {
  it("keeps to the setup guides the lead contract names, each named by exactly one page tag", () => {
    expect([...websiteLeadGuideFormats].sort()).toEqual(contractGuideFormats().sort());
    expect(Object.values(playbookGuideFormats).sort()).toEqual([...websiteLeadGuideFormats].sort());
  });

  it("maps the organiser-type page tags explicitly, and nothing it does not list", () => {
    expect(playbookGuideFormat("supper-clubs")).toBe("supper_club");
    expect(playbookGuideFormat("colleges")).toBe("society");
    expect(playbookGuideFormat("nightlife")).toBe("social_night");
    expect(playbookGuideFormat("teams")).toBe("team_social");
    expect(playbookGuideFormat("toString")).toBeUndefined();
    expect(playbookGuideFormat(undefined)).toBeUndefined();
  });

  it("maps every format tag a page's guide form names, and every page form can be sent", async () => {
    const forms = await pageLeadForms();
    expect(forms.some(({form}) => form.id === "run_club_setup_guide")).toBe(true);
    for (const {page, form} of forms) {
      const where = `${page.id} ${form.id}`;
      if (form.requestKind === "guide") expect(playbookGuideFormat(form.format), where).toBeDefined();
      // A try-it tool's form waits for its command: it never sends, so it never renders.
      expect(playbookSendableLeadKind(form), where).toBe(form.requestKind === "tool" ? null : form.requestKind);
      expect(form.id, where).toMatch(entryPattern);
    }
  });
});

describe("playbookSendableLeadKind", () => {
  it("takes the guide, venue, demo and walkthrough forms the intake can file", () => {
    expect(playbookSendableLeadKind(guide)).toBe("guide");
    expect(playbookSendableLeadKind(venue)).toBe("venue");
    expect(playbookSendableLeadKind(demo)).toBe("demo");
    expect(playbookSendableLeadKind(walkthrough)).toBe("walkthrough");
    expect(playbookSendableLeadKind(referral)).toBe("referral");
    // A referral without the host's link or how they know them is not one the intake takes.
    expect(playbookSendableLeadKind({...referral, fields: fields("name", "hostName")})).toBeNull();
    expect(playbookSendableLeadKind({...walkthrough, fields: fields("name", "preferredTime")})).toBe("walkthrough");
  });

  it("refuses a form that asks for a link or text: no backend reads one until its try-it command ships", () => {
    expect(playbookSendableLeadKind({...walkthrough, input: "url"})).toBeNull();
    expect(playbookSendableLeadKind({...guide, input: "text"})).toBeNull();
    expect(playbookSendableLeadKind({...guide, requestKind: "tool", input: "url"})).toBeNull();
    expect(playbookSendableLeadKind({...guide, input: "tel"})).toBe("guide");
  });

  it("refuses a kind no form sends, a guide without a known tag, a missing needed field and a field the kind does not carry", () => {
    expect(playbookSendableLeadKind({...guide, requestKind: "story"})).toBeNull();
    expect(playbookSendableLeadKind({...guide, requestKind: "walkthrough"})).toBeNull();
    expect(playbookSendableLeadKind({...walkthrough, fields: fields("name", "orgName")})).toBeNull();
    expect(playbookSendableLeadKind({...guide, format: "weddings"})).toBeNull();
    expect(playbookSendableLeadKind({...guide, format: undefined})).toBeNull();
    expect(playbookSendableLeadKind({...venue, fields: venue.fields!.filter((field) => field.name !== "capacity")})).toBeNull();
    expect(playbookSendableLeadKind({...demo, fields: [...demo.fields!, ...fields("orgType")]})).toBeNull();
  });
});

describe("playbookLeadProblems", () => {
  it("puts a line under every empty field and a number that is not a mobile number", () => {
    expect(playbookLeadProblems(venue, {orgName: " ", area: "Bandra", phone: "123"})).toEqual({
      orgName: playbookCopy.leadForm.required.orgName,
      capacity: playbookCopy.leadForm.required.capacity,
      nights: playbookCopy.leadForm.required.nights,
      phone: websiteLeadCopy.problems.invalid_phone,
    });
    expect(playbookLeadProblems(demo, {name: "A", whatYouHost: "Quiz", phone: "98765 43210"})).toEqual({name: playbookCopy.leadForm.required.name});
    expect(playbookLeadProblems(guide, {phone: "98765 43210"})).toEqual({});
    expect(playbookLeadProblems(walkthrough, {name: "Asha", orgName: "Sunday Runners", whatYouHost: "Run club", phone: "98765 43210"}))
      .toEqual({preferredTime: playbookCopy.leadForm.required.preferredTime});
  });
});

describe("playbookLeadRequest", () => {
  const send = (form: PlaybookLeadForm, answers: Parameters<typeof playbookLeadRequest>[2]) => {
    const lead = playbookLeadRequest(form, playbookSendableLeadKind(form)!, answers, "/host/run-clubs/");
    return {lead, body: websiteLeadRequest(lead, "+919876543210", "a".repeat(32))};
  };

  it("files a host app link request with the number alone, under its own short consent line", () => {
    expect(playbookSendableLeadKind(appLink)).toBe("app_link");
    expect(playbookSendableLeadKind({...appLink, fields: fields("name")})).toBeNull();
    expect(playbookLeadProblems(appLink, {phone: "98765 43210"})).toEqual({});
    expect(playbookLeadConsent("app_link")).toEqual(playbookCopy.leadForm.appLink);
    expect(playbookCopy.leadForm.appLink.consent).toBe("On WhatsApp, from Catch.");
    expect(playbookLeadConsent("guide")).toEqual({consent: playbookCopy.leadForm.consent, consentVersion: playbookCopy.leadForm.consentVersion});
    const {lead, body} = send(appLink, {phone: "98765 43210"});
    expect(lead).toEqual({kind: "app_link", phone: "98765 43210", consentVersion: "app-link-whatsapp-v1",
      sourcePage: "/host/run-clubs/", entry: "host_app_link", answers: {app: "host"}});
    expect(body).toMatchObject({requestKind: "app_link", lead: {consent: {purpose: "leadFollowUp", version: "app-link-whatsapp-v1"},
      appLink: {app: "host"}}});
    expect(body).not.toHaveProperty("fullName");
    expect(isJoinWaitlistHttpRequest(body)).toBe(true);
  });

  it("files a guide under the intake's guide name, with the follow-up consent and the form as its entry", () => {
    const {lead, body} = send(guide, {phone: "98765 43210"});
    expect(lead).toEqual({kind: "guide", phone: "98765 43210", consentVersion: playbookCopy.leadForm.consentVersion,
      sourcePage: "/host/run-clubs/", entry: "run_club_setup_guide", answers: {format: "run_club"}});
    expect(body.requestKind).toBe("guide");
    expect(body.lead).toMatchObject({consent: {purpose: "leadFollowUp", version: playbookCopy.leadForm.consentVersion}, guide: {format: "run_club"}});
    expect(isJoinWaitlistHttpRequest(body)).toBe(true);
  });

  it("files a venue's name as spaceName, with what it fits and the nights to fill", () => {
    const {lead, body} = send(venue, {orgName: " Hopline  Brewing ", area: "", capacity: "60 standing", nights: "Tuesdays", phone: "98765 43210"});
    expect(lead.answers).toEqual({spaceName: "Hopline Brewing", capacity: "60 standing", nights: "Tuesdays"});
    expect(body.lead?.venue).toEqual({spaceName: "Hopline Brewing", capacity: "60 standing", nights: "Tuesdays"});
    expect(send(venue, {orgName: "Hopline", area: "Lower Parel, Mumbai", capacity: "60", nights: "Tue", phone: "9876543210"}).lead.answers)
      .toMatchObject({area: "Lower Parel, Mumbai"});
    expect(isJoinWaitlistHttpRequest(body)).toBe(true);
  });

  it("files a demo with the person's name and what they host", () => {
    const {lead, body} = send(demo, {name: "Asha Rao", whatYouHost: "A monthly supper club for 24", phone: "98765 43210"});
    expect(lead).toMatchObject({kind: "demo", fullName: "Asha Rao", answers: {whatYouHost: "A monthly supper club for 24"}});
    expect(body).toMatchObject({requestKind: "demo", fullName: "Asha Rao", lead: {consent: {purpose: "leadFollowUp"}, demo: {whatYouHost: "A monthly supper club for 24"}}});
    expect(isJoinWaitlistHttpRequest(body)).toBe(true);
  });

  it("files a walkthrough with the person's name, the time they asked for, their organisation and what they run", () => {
    const {lead, body} = send(walkthrough, {name: " Asha  Rao ", orgName: "Sunday Runners", whatYouHost: "A run club, three chapters",
      preferredTime: " Tue  16:00 ", phone: "98765 43210"});
    expect(lead).toMatchObject({kind: "walkthrough", fullName: "Asha Rao", entry: "walkthrough_request",
      answers: {preferredTime: "Tue 16:00", organisation: "Sunday Runners", whatYouRun: "A run club, three chapters"}});
    expect(body).toMatchObject({requestKind: "walkthrough", fullName: "Asha Rao", lead: {consent: {purpose: "leadFollowUp"},
      walkthrough: {preferredTime: "Tue 16:00", organisation: "Sunday Runners", whatYouRun: "A run club, three chapters"}}});
    expect(isJoinWaitlistHttpRequest(body)).toBe(true);
    const short = playbookLeadRequest({...walkthrough, fields: fields("name", "preferredTime")}, "walkthrough", {name: "Asha", preferredTime: "Wed 11:00",
      phone: "98765 43210"}, "/host/walkthrough/");
    expect(short.answers).toEqual({preferredTime: "Wed 11:00"});
  });

  it("files a referral with the person's name and the host's name, link and how they know them", () => {
    const {lead, body} = send(referral, {name: " Asha  Rao ", hostName: " Kestrel  Supper Club ", hostLink: "kestrel.example",
      relationship: "I go to their dinners", phone: "98765 43210"});
    expect(lead).toMatchObject({kind: "referral", fullName: "Asha Rao", entry: "referral_host",
      answers: {hostName: "Kestrel Supper Club", hostLink: "kestrel.example", relationship: "I go to their dinners"}});
    expect(body).toMatchObject({requestKind: "referral", fullName: "Asha Rao", lead: {consent: {purpose: "leadFollowUp"},
      referral: {hostName: "Kestrel Supper Club", hostLink: "kestrel.example", relationship: "I go to their dinners"}}});
    expect(isJoinWaitlistHttpRequest(body)).toBe(true);
  });
});
