/* eslint-disable max-len */
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import path from "node:path";
import test from "node:test";
import {ADAPTER_PLATFORMS, UNREAD_PLATFORMS, classifyDraftLink, parseDraftLink} from "./links";

const platforms = JSON.parse(readFileSync(path.join(__dirname,
  "../../../operations/src/workflows/supply-intake/sources/platforms.json"), "utf8")) as
  {platforms: Array<{id: string; hosts: string[]; adapterId: string | null}>};

test("the instant platforms are exactly the Supply Intake platforms with an adapter", () => {
  const withAdapter = platforms.platforms.filter((platform) => platform.adapterId !== null)
    .map((platform) => ({id: platform.id, hosts: [...platform.hosts].sort()}));
  assert.deepEqual(ADAPTER_PLATFORMS.map((platform) => ({id: platform.id, hosts: [...platform.hosts].sort()})), withAdapter);
  const withoutAdapter = platforms.platforms.filter((platform) => platform.adapterId === null)
    .flatMap((platform) => platform.hosts).sort();
  assert.deepEqual(UNREAD_PLATFORMS.flatMap((platform) => platform.hosts).sort(), withoutAdapter);
});

test("event links say what Supply Intake can read, and why a person follows up otherwise", () => {
  const event = (url: string) => classifyDraftLink("event_link", parseDraftLink(url));
  assert.deepEqual(event("https://lu.ma/afterfly"), {provider: "luma", support: "instant", reason: null});
  assert.deepEqual(event("https://luma.com/e/abc"), {provider: "luma", support: "instant", reason: null});
  assert.deepEqual(event("https://www.district.in/events/x"), {provider: "district", support: "instant", reason: null});
  assert.deepEqual(event("https://urbanaut.app/spot/x"), {provider: "urbanaut", support: "instant", reason: null});
  assert.deepEqual(event("https://afterfly.in/events"), {provider: null, support: "best_effort", reason: "generic_event_markup"});
  assert.deepEqual(event("https://www.instagram.com/afterfly.run/"),
    {provider: "instagram", support: "best_effort", reason: "instagram_business_discovery"});
  assert.deepEqual(event("https://www.instagram.com/p/Cx1/"),
    {provider: "instagram", support: "staff_follow_up", reason: "instagram_post_not_read"});
  assert.deepEqual(event("https://partiful.com/e/x"), {provider: "partiful", support: "staff_follow_up", reason: "platform_adapter_missing"});
  assert.deepEqual(event("https://in.bookmyshow.com/events/x"),
    {provider: "book_my_show", support: "staff_follow_up", reason: "platform_adapter_missing"});
  assert.deepEqual(event("https://www.facebook.com/events/1"), {provider: null, support: "staff_follow_up", reason: "signed_in_site"});
  assert.deepEqual(event("https://chat.whatsapp.com/abc"), {provider: null, support: "staff_follow_up", reason: "chat_invite"});
  assert.deepEqual(event("https://bit.ly/x"), {provider: null, support: "staff_follow_up", reason: "short_link"});
  assert.deepEqual(event("https://forms.gle/abc"), {provider: "google_forms", support: "staff_follow_up", reason: "form_link_sent_as_event"});
});

test("form links wait for a person until form definitions can be imported", () => {
  const form = (url: string) => classifyDraftLink("form_link", parseDraftLink(url));
  assert.deepEqual(form("https://docs.google.com/forms/d/e/1FAIpQLSf/viewform"),
    {provider: "google_forms", support: "staff_follow_up", reason: "form_import_not_available"});
  assert.deepEqual(form("https://acme.typeform.com/to/abc"),
    {provider: "typeform", support: "staff_follow_up", reason: "form_import_not_available"});
  assert.deepEqual(form("https://docs.google.com/document/d/x"),
    {provider: null, support: "staff_follow_up", reason: "not_a_known_form_provider"});
});

test("only public web addresses are accepted", () => {
  for (const bad of ["ftp://lu.ma/x", "https://user:pw@lu.ma/x", "https://localhost/x", "https://10.0.0.1/x", "not a link"]) {
    assert.throws(() => parseDraftLink(bad), /web address|public https/, bad);
  }
});
