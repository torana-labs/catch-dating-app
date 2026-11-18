import {strict as assert} from "node:assert";
import {describe, it} from "node:test";
import {BRAND} from "../shared/generated/brand";
import {
  BLOCKING_STATUSES, CUSTOM_DOMAIN_TRANSITIONS, HISTORY_LIMIT,
  PENDING_LEASE_MS, canTransition, hasCurrentDomainOwnership, holdsHostname,
  isInsideTargetZone, newReservation, normalizeRequestedHostname,
  parseCustomDomain, parseServedHostname, registrableDomainOf,
  resolveFormTarget, screenHostname, transitionCustomDomain,
  type CustomDomainRecord, type CustomDomainStatus,
} from "./domainPolicy";

const now = 1_700_000_000_000;
const challenge = "catch-verification=Qx7Lr2Vb9Tn4Hc6Md1Ks8Wp3Yf5Ga0Ze";
const context = {atMillis: now, actor: "owner" as const, actorUid: "owner-1",
  reason: null};

function reserve(hostname = "www.example-club.test",
  previous: CustomDomainRecord | null = null): CustomDomainRecord {
  const served = parseServedHostname(hostname)!;
  return newReservation({served, apexRedirect: null,
    target: {kind: "organizerPage", organizerId: "organizer-1"},
    provider: "cloudflareSaas", expectedCname: "domains.neutral.example",
    ownershipChallenge: challenge, previous,
    screening: screenHostname(served), context});
}

describe("custom domain hostname policy", () => {
  it("uses the Public Suffix List, not a label count", () => {
    assert.equal(registrableDomainOf("www.club.co.in"), "club.co.in");
    assert.equal(registrableDomainOf("club.co.in"), "club.co.in");
    assert.equal(registrableDomainOf("co.in"), null);
    // The schema regex accepts three labels; the list says this is an apex.
    assert.equal(parseServedHostname("club.co.in"), null);
    assert.deepEqual(parseServedHostname("run.club.co.in"),
      {hostname: "run.club.co.in", registrableDomain: "club.co.in"});
    assert.deepEqual(parseServedHostname("apply.example-club.example"),
      {hostname: "apply.example-club.example",
        registrableDomain: "example-club.example"});
  });

  it("rejects hosts the organiser cannot prove or Catch must not serve", () => {
    for (const host of ["Www.example-club.test", "www.example-club.test.",
      "www.example-club.test:443", "*.example-club.test", "203.0.113.7",
      "www.xn--exmple-cua.test", "www.ab--cd.example-club.test",
      "www.example-club.localhost", "www.example-club.internal",
      "club-site.web.app", "www.club.firebaseapp.com", "club.github.io",
      `www.${BRAND.web.domain}`, `forms.${BRAND.web.domain}`, "example.test",
      ""]) {
      assert.equal(parseServedHostname(host), null, host);
    }
    assert.equal(parseServedHostname(42), null);
  });

  it("normalises what an owner typed into the served host", () => {
    assert.deepEqual(normalizeRequestedHostname("  Example-Club.TEST. "), {
      hostname: "www.example-club.test", registrableDomain: "example-club.test",
      apexRedirect: {hostname: "example-club.test", mode: "registrar"},
    });
    assert.deepEqual(normalizeRequestedHostname("club.co.in"), {
      hostname: "www.club.co.in", registrableDomain: "club.co.in",
      apexRedirect: {hostname: "club.co.in", mode: "registrar"},
    });
    assert.deepEqual(normalizeRequestedHostname("www.example-club.test"), {
      hostname: "www.example-club.test", registrableDomain: "example-club.test",
      apexRedirect: {hostname: "example-club.test", mode: "registrar"},
    });
    assert.deepEqual(normalizeRequestedHostname("run.example-club.test"), {
      hostname: "run.example-club.test", registrableDomain: "example-club.test",
      apexRedirect: null,
    });
    for (const [raw, rejected] of [
      ["https://example-club.test", "invalid"],
      ["example-club.test:8080", "invalid"],
      ["example-club.test/page", "invalid"],
      ["*.example-club.test", "invalid"],
      ["203.0.113.7", "ipAddress"],
      ["exämple-club.test", "idn"],
      ["xn--exmple-cua.test", "idn"],
      ["co.in", "noRegistrableDomain"],
      ["club.corp", "noRegistrableDomain"],
      ["club-site.web.app", "reservedHost"],
      ["club.github.io", "reservedHost"],
      [BRAND.web.domain, "reservedHost"],
      ["", "invalid"],
    ] as const) {
      assert.deepEqual(normalizeRequestedHostname(raw), {rejected}, raw);
    }
  });

  it("refuses blocklist hits and holds lookalikes for review", () => {
    const screen = (host: string) => screenHostname(parseServedHostname(host)!);
    const brand = BRAND.web.domain.split(".")[0];
    assert.deepEqual(screen("www.example-club.test"), {verdict: "allow"});
    assert.deepEqual(screen("www.catch-the-wave.test"), {verdict: "allow"});
    assert.equal(screen(`www.${brand}-login.test`).verdict, "reject");
    assert.equal(screen("www.examplebank.test").verdict, "reject");
    assert.equal(screen("pay.examplepay-runners.test").verdict, "reject");
    assert.deepEqual(screen("www.examp1ebank.test"),
      {verdict: "review", reason: "lookalike:examplebank"});
    assert.deepEqual(screen("www.examplebanc.test"),
      {verdict: "review", reason: "lookalike:examplebank"});
    assert.deepEqual(screen("examplebank-help.example-club.test"),
      {verdict: "review", reason: "lookalike:examplebank"});
    assert.deepEqual(screen("www.club-log1n.test"),
      {verdict: "review", reason: "term:login"});
    assert.deepEqual(screen("secure.example-club.test"),
      {verdict: "review", reason: "term:secure"});
  });

  it("keeps hosts out of the CNAME target's own zone", () => {
    assert.equal(isInsideTargetZone("www.neutral.example",
      "domains.neutral.example"), true);
    assert.equal(isInsideTargetZone("www.example-club.test",
      "domains.neutral.example"), false);
    assert.equal(isInsideTargetZone("x.forms-site.web.app",
      "forms-site.web.app"), true);
  });
});

describe("custom domain state machine", () => {
  it("allows exactly the documented transitions", () => {
    const statuses = Object.keys(CUSTOM_DOMAIN_TRANSITIONS) as
      CustomDomainStatus[];
    const allowed = new Set([
      "pendingDns>verified", "pendingDns>expired", "pendingDns>failed",
      "pendingDns>suspended", "pendingDns>removed",
      "verified>provisioning", "verified>failed", "verified>suspended",
      "verified>removed", "provisioning>active", "provisioning>failed",
      "provisioning>suspended", "provisioning>removed", "active>lapsed",
      "active>failed", "active>suspended", "active>removed", "lapsed>active",
      "lapsed>suspended", "lapsed>removed", "suspended>pendingDns",
      "suspended>verified", "suspended>provisioning", "suspended>active",
      "suspended>lapsed", "suspended>failed", "suspended>removed",
      "failed>pendingDns", "failed>suspended", "failed>removed",
    ]);
    for (const from of statuses) {
      for (const to of statuses) {
        assert.equal(canTransition(from, to), allowed.has(`${from}>${to}`),
          `${from}>${to}`);
      }
    }
    assert.deepEqual([...BLOCKING_STATUSES].sort(), statuses
      .filter((status) => !["expired", "removed"].includes(status)).sort());
  });

  it("reserves a valid record, expires its lease and starts a new generation",
    () => {
      const first = reserve();
      assert.ok(parseCustomDomain(first));
      assert.equal(first.status, "pendingDns");
      assert.equal(first.pendingExpiresAtMillis, now + PENDING_LEASE_MS);
      assert.equal(first.createdByUid, "owner-1");
      assert.deepEqual(first.dnsInstructions.map((row) => row.purpose),
        ["routing", "ownership"]);
      assert.equal(holdsHostname(first, now + PENDING_LEASE_MS - 1), true);
      assert.equal(holdsHostname(first, now + PENDING_LEASE_MS), false);
      assert.throws(() => reserve("www.example-club.test", first),
        /already reserved/u);
      const later = {...context, atMillis: now + PENDING_LEASE_MS};
      const second = newReservation({served:
        parseServedHostname(first.hostname)!, apexRedirect: null,
      target: first.target, provider: first.provider,
      expectedCname: first.expectedCname, ownershipChallenge: challenge,
      previous: first, screening: {verdict: "allow"}, context: later});
      assert.equal(second.generation, 2);
      assert.deepEqual(second.history.map((entry) => [entry.from, entry.to]),
        [[null, "pendingDns"], ["pendingDns", "expired"],
          ["expired", "pendingDns"]]);
      assert.throws(() => newReservation({served:
        parseServedHostname("www.examplebank.test")!, apexRedirect: null,
      target: first.target, provider: first.provider,
      expectedCname: first.expectedCname, ownershipChallenge: challenge,
      previous: null, screening: {verdict: "reject", reason: "blocklisted"},
      context}), /blocklisted/u);
      const held = reserve("www.club-login.test");
      assert.deepEqual(held.review, {state: "held", reason: "term:login"});
    });

  it("guards transitions, bumps revision and bounds history", () => {
    let record = reserve();
    assert.throws(() => transitionCustomDomain(record, "active", context),
      /cannot move/u);
    for (let i = 0; i < HISTORY_LIMIT + 5; i++) {
      record = transitionCustomDomain(record, "suspended", context,
        {suspension: {reason: "Review", byUid: "admin-1", atMillis: now}});
      assert.ok(record.suspension);
      record = transitionCustomDomain(record, "pendingDns", context);
      assert.equal(record.suspension, null);
    }
    assert.equal(record.history.length, HISTORY_LIMIT);
    assert.equal(record.revision, 1 + 2 * (HISTORY_LIMIT + 5));
    assert.throws(() => transitionCustomDomain(record, "suspended", context),
      /invalid/u);
  });

  it("reads stored records with the PSL and apex rules the schema cannot",
    () => {
      const record = reserve();
      assert.equal(parseCustomDomain({...record,
        registrableDomain: "other-club.test"}), null);
      assert.equal(parseCustomDomain({...record, apexRedirect:
        {hostname: "other-club.test", mode: "registrar"}}), null);
      assert.ok(parseCustomDomain({...record, apexRedirect:
        {hostname: "example-club.test", mode: "registrar"}}));
      assert.equal(parseCustomDomain({...record, hostname: "club.co.in",
        registrableDomain: "club.co.in"}), null);
      assert.equal(parseCustomDomain({...record, status: "pending"}), null);
    });
});

describe("custom domain DNS proof and form resolution", () => {
  const form: CustomDomainRecord = {
    ...reserve("apply.example-club.example"),
    target: {kind: "form", organizerId: "organizer-1", formId: "form-1",
      publicFormId: "pf_Ab12Cd34Ef56Gh78Ij90"},
    status: "active", pendingExpiresAtMillis: null, verifiedAtMillis: now,
    activatedAtMillis: now, providerHostnameId: "forms-site:apply",
    providerStatus: {hostname: "active", ssl: "active", errors: [],
      observedAtMillis: now},
  };
  const probe = {hostname: form.hostname, txtValues: [challenge],
    cnameTarget: `${form.expectedCname}.`, checkedAtMillis: now};

  it("requires a current TXT, the exact CNAME and a fresh probe", () => {
    assert.equal(hasCurrentDomainOwnership(form, probe, now), true);
    assert.equal(hasCurrentDomainOwnership(form, null, now), false);
    assert.equal(hasCurrentDomainOwnership(form, probe, now + 900_001), false);
    assert.equal(hasCurrentDomainOwnership(form,
      {...probe, checkedAtMillis: now + 1}, now), false);
    assert.equal(hasCurrentDomainOwnership(form,
      {...probe, txtValues: []}, now), false);
    assert.equal(hasCurrentDomainOwnership(form,
      {...probe, cnameTarget: "elsewhere.example"}, now), false);
    assert.equal(hasCurrentDomainOwnership({...form, status: "removed"},
      probe, now), false);
  });

  it("resolves only an active, servable form on the exact host", () => {
    const expected = {organizerId: "organizer-1", formId: "form-1",
      publicFormId: "pf_Ab12Cd34Ef56Gh78Ij90"};
    assert.deepEqual(resolveFormTarget(form.hostname, form, probe, now),
      expected);
    for (const [host, record] of [
      [`${form.hostname}.evil.test`, form],
      [`${form.hostname}:443`, form],
      [`app.${BRAND.web.domain}`, form],
      [form.hostname, {...form, status: "lapsed", lapsedAtMillis: now}],
      [form.hostname, {...form, review: {state: "held", reason: "term"}}],
      [form.hostname, {...form, providerStatus: {...form.providerStatus!,
        ssl: "pending_validation"}}],
      [form.hostname, {...form, target: {kind: "organizerPage",
        organizerId: "organizer-1"}}],
      [form.hostname, null],
    ] as const) {
      assert.equal(resolveFormTarget(host, record as CustomDomainRecord | null,
        probe, now), null, host);
    }
  });
});
