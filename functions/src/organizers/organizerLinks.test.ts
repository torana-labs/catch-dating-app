import assert from "node:assert/strict";
import test from "node:test";
import {Timestamp} from "firebase-admin/firestore";
import {
  adminOwnerLinks,
  ownerLinkUrlProblem,
  pageOwnerLinks,
  storedOwnerLinks,
  type OwnerLinkInput,
} from "./organizerLinks";

const now = Date.parse("2026-11-01T00:00:00.000Z");

function input(overrides: Partial<OwnerLinkInput> = {}): OwnerLinkInput {
  return {
    id: "whatsapp",
    label: "Join the WhatsApp group",
    subtitle: null,
    url: "https://chat.whatsapp.com/abc123",
    icon: "community",
    pinned: false,
    showUntil: null,
    ...overrides,
  };
}

function stored(overrides: Record<string, unknown> = {}) {
  return {
    id: "tickets",
    label: "Tickets",
    subtitle: "Every Sunday run",
    url: "https://www.district.in/runs",
    icon: "tickets",
    pinned: false,
    showUntil: null,
    ...overrides,
  };
}

function httpsCode(code: string, match: RegExp) {
  return (error: unknown) => {
    assert.equal((error as {code?: string}).code, code);
    assert.match((error as Error).message, match);
    return true;
  };
}

test("owner link URLs must be public https addresses", () => {
  for (const url of [
    "https://instagram.com/afterfly.in",
    "https://www.district.in/events/afterfly?utm_source=bio",
    "https://chat.whatsapp.com/abc123",
    "https://xn--bcher-kva.example.org/",
  ]) {
    assert.equal(ownerLinkUrlProblem(url), null, url);
  }
  for (const [url, problem] of [
    ["http://instagram.com/afterfly.in", "not_https"],
    ["javascript:alert(1)", "not_https"],
    ["instagram.com/afterfly.in", "not_https"],
    ["https://user:secret@instagram.com/", "credentials"],
    ["https://instagram.com:8443/", "port"],
    ["https://localhost/", "not_public_host"],
    ["https://intranet/", "not_public_host"],
    ["https://127.0.0.1/", "not_public_host"],
    ["https://[::1]/", "not_public_host"],
    ["https://printer.local/", "not_public_host"],
    ["https://db.internal/", "not_public_host"],
    ["https://bit.ly/3xYz", "shortener"],
    ["https://www.tinyurl.com/abc", "shortener"],
    ["https://t.co/abc", "shortener"],
    [`https://example.org/${"a".repeat(2048)}`, "too_long"],
  ] as const) {
    assert.equal(ownerLinkUrlProblem(url), problem, url);
  }
});

test("stored owner links keep the admin's order with checked addresses",
  () => {
    const links = storedOwnerLinks([
      input({label: "  Join the WhatsApp group ", subtitle: "  "}),
      input({id: "ig", label: "Instagram", url: "https://Instagram.com/run",
        icon: null, pinned: true,
        showUntil: "2026-11-14T12:00:00.000Z"}),
    ], (date) => Timestamp.fromDate(date));
    assert.deepEqual(links.map((link) => (link as {id: string}).id),
      ["whatsapp", "ig"]);
    assert.deepEqual(links[0], {
      id: "whatsapp", label: "Join the WhatsApp group", subtitle: null,
      url: "https://chat.whatsapp.com/abc123", icon: "community",
      pinned: false, showUntil: null,
    });
    const pinned = links[1] as {url: string; showUntil: Timestamp};
    // The parsed address is stored, so the page links where the check looked.
    assert.equal(pinned.url, "https://instagram.com/run");
    assert.equal(pinned.showUntil.toDate().toISOString(),
      "2026-11-14T12:00:00.000Z");
  });

test("stored owner links refuse unsafe or repeated links", () => {
  const save = (links: OwnerLinkInput[]) =>
    storedOwnerLinks(links, (date) => date);
  assert.throws(() => save([input({url: "https://bit.ly/x"})]),
    httpsCode("invalid-argument", /link shortener/u));
  assert.throws(() => save([input({url: "https://127.0.0.1/"})]),
    httpsCode("invalid-argument", /public website/u));
  assert.throws(() => save([input(), input({url: "https://instagram.com/"})]),
    httpsCode("invalid-argument", /Link 2 repeats an id/u));
  assert.throws(() => save([input(), input({id: "copy"})]),
    httpsCode("invalid-argument", /Link 2 repeats an address/u));
  assert.throws(() => save([input({label: "   "})]),
    httpsCode("invalid-argument", /needs a label/u));
  assert.throws(() => save([input({showUntil: "not a time"})]),
    httpsCode("invalid-argument", /show-until/u));
  assert.throws(
    () => save([input({subtitle: "Unclaimed listing, pending owner review"})]),
    httpsCode("failed-precondition", /Catch's own workflow/u));
  assert.deepEqual(save([]), []);
});

test("page links drop expired and unsafe links and lead with pinned ones",
  () => {
    const links = pageOwnerLinks([
      stored({id: "first"}),
      stored({id: "expired", url: "https://example.org/old", pinned: true,
        showUntil: Timestamp.fromMillis(now - 1)}),
      stored({id: "pinned", url: "https://example.org/now", pinned: true,
        showUntil: Timestamp.fromMillis(now + 60_000)}),
      stored({id: "shortened", url: "https://bit.ly/x"}),
      stored({id: "last", url: "https://example.org/last", subtitle: null,
        icon: null}),
      {id: "broken"},
    ], now);
    assert.deepEqual(links.map((link) => link.id),
      ["pinned", "first", "last"]);
    assert.deepEqual(Object.keys(links[1]).sort(),
      ["icon", "id", "label", "pinned", "showUntil", "subtitle", "url"]);
    assert.deepEqual(links[2], {id: "last", label: "Tickets", subtitle: null,
      url: "https://example.org/last", icon: null, pinned: false,
      showUntil: null});
    assert.deepEqual(pageOwnerLinks(undefined, now), []);
  });

test("the admin editor gets every stored link with ISO show-until times",
  () => {
    const links = adminOwnerLinks([
      stored({showUntil: Timestamp.fromMillis(now - 1000)}),
      stored({id: "plain", url: "https://example.org/"}),
    ]);
    assert.deepEqual(links.map((link) => link.showUntil),
      ["2026-10-31T23:59:59.000Z", null]);
    assert.deepEqual(adminOwnerLinks(null), []);
  });
