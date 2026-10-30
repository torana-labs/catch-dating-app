import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import {fileURLToPath} from "node:url";
import {brand} from "@catch/brand";
import {publishedLegalContent} from "../src/content/legal.ts";
import {ownerGatedSiteDestinations, siteFooterLegalLinks} from "../src/content/site.ts";

const websiteRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("confirmed legal, help, and contact contracts are publication-ready", () => {
  assert.deepEqual(
    Object.values(publishedLegalContent.pages).map((page) => page.path).sort(),
    ["/contact/", "/delete-account/", "/help/", "/privacy/", "/refunds/", "/terms/"]
  );
  assert.equal(publishedLegalContent.operator.name, brand.operator.legalName);
  assert.equal(publishedLegalContent.operator.supportEmail, brand.support.email);
  assert.equal(ownerGatedSiteDestinations.contactHref, `mailto:${brand.support.email}`);
  assert.deepEqual(
    siteFooterLegalLinks.map((link) => link.href).sort(),
    ["/contact/", "/help/", "/privacy/", "/refunds/", "/terms/"]
  );

  const publishedPaths = new Set(Object.values(publishedLegalContent.pages).map((page) => page.path));
  const serialized = JSON.stringify(publishedLegalContent);
  assert.doesNotMatch(serialized, /CONFIRM|PLACEHOLDER|\[(?:TODO|TBD)|\{\{/u);
  for (const page of Object.values(publishedLegalContent.pages)) {
    assert.ok(page.title.trim());
    assert.ok(page.summary.trim());
    assert.ok(page.sections.length >= 6);
    const pageCopy = page.sections.flatMap((section) => section.paragraphs).join("\n");
    assert.ok(pageCopy.includes(brand.support.email), `${page.path} must publish the contact address`);
    assert.ok(!pageCopy.includes(`suvrat@${brand.web.domain}`), `${page.path} must not publish the inactive address`);
    for (const section of page.sections) {
      assert.ok(section.heading.trim());
      assert.ok(section.paragraphs.every((paragraph) => paragraph.trim().length > 0));
      for (const link of section.links ?? []) {
        assert.ok(link.label.trim(), `${page.path} link labels must be non-empty`);
        assert.ok(publishedPaths.has(link.href), `${page.path} links to unpublished ${link.href}`);
      }
    }
  }

  const routeRegistry = fs.readFileSync(
    path.join(websiteRoot, "src/app/routeRegistry.ts"),
    "utf8"
  );
  for (const route of ["privacy", "terms", "help", "account_deletion", "refunds", "contact"]) {
    assert.match(routeRegistry, new RegExp(`id: "${route}"`));
  }
});

test("account deletion resource meets the store web-deletion requirement", () => {
  const {pages} = publishedLegalContent;
  const deletion = pages.account_deletion;
  assert.equal(deletion.path, "/delete-account/");
  const copy = deletion.sections
    .flatMap((section) => [section.heading, ...section.paragraphs, ...(section.bullets ?? [])])
    .join("\n");
  // Both in-app paths, matching the shipped consumer Settings row and Host account menu.
  assert.match(copy, /Settings[^.]*Delete account/u);
  assert.match(copy, /Catch Host[^.]*Account menu[^.]*Delete account/u);
  // A request path that needs neither the app nor a reinstall.
  assert.match(copy, /without (?:installing|reinstalling)[^.]*app/u);
  assert.match(copy, /Account deletion/u, "the email subject must be named");
  // Deleted and retained data are both disclosed.
  assert.ok(deletion.sections.some((section) => /deleted/u.test(section.heading) && section.bullets?.length));
  assert.ok(deletion.sections.some((section) => /kept|retain/u.test(section.heading) && section.bullets?.length));
  // Pricing stays unpublished until its owner decision lands.
  assert.doesNotMatch(copy, /₹|\bINR\b|\bpric(?:e|es|ing)\b|commission/iu);

  const linksTo = (page) => page.sections.flatMap((section) => section.links ?? [])
    .map((link) => link.href);
  assert.ok(linksTo(pages.help).includes("/delete-account/"), "Help must link the deletion page");
  assert.ok(linksTo(pages.privacy).includes("/delete-account/"), "Privacy must link the deletion page");
});

const pageCopy = (page) => page.sections
  .flatMap((section) => [section.heading, ...section.paragraphs, ...(section.bullets ?? [])])
  .join("\n");
const linksTo = (page) => page.sections.flatMap((section) => section.links ?? []).map((link) => link.href);

test("refund policy states the cash deadlines checkout enforces", () => {
  const {pages} = publishedLegalContent;
  const refunds = pages.refunds;
  assert.equal(refunds.path, "/refunds/");
  const copy = pageCopy(refunds);
  // eventPolicy.ts cancellationWindow: full cash refund at or before start minus 6, 24 or 72 hours.
  assert.match(copy, /Flexible: full refund if you cancel at least 6 hours before the event starts/u);
  assert.match(copy, /Standard: full refund if you cancel at least 24 hours before the event starts/u);
  assert.match(copy, /Strict: full refund if you cancel at least 72 hours before the event starts/u);
  assert.match(copy, /Events use Standard unless/u, "Standard is the default policy");
  assert.match(copy, /after your refund deadline, no refund is due/u);
  // Cash-only checkout: no credit remedy is promised.
  assert.doesNotMatch(copy, /credit/iu);
  assert.match(copy, /organiser cancels the event, everyone who paid gets a full refund/u);
  assert.match(copy, /Joining a waitlist is free/u);
  assert.match(copy, /organiser is the seller/u);
  assert.match(copy, /payment method you used/u);
  assert.ok(linksTo(refunds).includes("/contact/"), "Refunds must link the contact page");
  assert.ok(linksTo(pages.terms).includes("/refunds/"), "Terms must link the refund policy");
  assert.doesNotMatch(pageCopy(pages.terms), /If Catch later offers payment|Paid-event functionality is not part/u);
  assert.doesNotMatch(pageCopy(pages.help), /Paid events are not part/u);
});

test("contact page publishes the operator, address, email and phone", () => {
  const {operator, pages} = publishedLegalContent;
  const copy = pageCopy(pages.contact);
  assert.equal(pages.contact.path, "/contact/");
  assert.match(copy, new RegExp(`operated by ${operator.name}`, "u"));
  assert.ok(copy.includes(operator.formalAddress), "the postal address must match the operator record");
  assert.ok(copy.includes(operator.supportEmail));
  assert.ok(copy.includes(brand.support.phoneDisplay));
  assert.match(copy, /WhatsApp/u);
  assert.ok(copy.includes(operator.grievanceOfficer), "the grievance officer must be named");
});

test("payment disclosures match the organiser-account OAuth rail", () => {
  const {pages} = publishedLegalContent;
  const terms = pageCopy(pages.terms);
  // eventPaymentRuntime.ts razorpayOAuth: the organiser's account collects; Catch holds nothing.
  assert.match(terms, /directly to the organiser's own Razorpay account/u);
  assert.match(terms, /does not hold your payment/u);
  assert.ok(pages.terms.sections.some((section) => section.heading === "For organisers"));
  assert.match(terms, /merchant of record/u);
  assert.match(terms, /GST invoices/u);
  assert.match(terms, /chargebacks/u);
  // razorpayFormProvider.ts: OAuth orders, status reads, webhooks and refunds.
  assert.match(terms, /create orders[^.]*read payment and refund status[^.]*webhooks[^.]*issue refunds/u);
  // organizerRazorpayConnection.ts disconnect: stops new checkout, keeps credentials for existing payments.
  assert.match(terms, /Disconnecting stops new checkouts/u);
  assert.match(terms, /never deducted from guest payments/u);
  assert.doesNotMatch(terms, /₹|\bINR\b/u, "organiser pricing stays unpublished");

  const refunds = pageCopy(pages.refunds);
  assert.match(refunds, /goes directly to the organiser's Razorpay account/u);
  assert.match(refunds, /paid from the organiser's Razorpay account, issued through Catch/u);

  const privacy = pageCopy(pages.privacy);
  assert.match(privacy, /Razorpay processes payments/u);
  assert.match(privacy, /Catch does not see or store them/u);
  // razorpayCredentialVault.ts: tokens live in Secret Manager, not the main database.
  assert.match(privacy, /Razorpay account ID and keep their access credentials encrypted in a separate secrets store/u);
  assert.match(privacy, /Payment records are kept as long as needed for refunds, disputes/u);
});
