import {applyBrand, brand} from "./brand.ts";
import legalDocument from "./legal.json" with {type: "json"};
import type {PublishedLegalContent} from "./types";

// legal.json writes the operator and contact details as {{brand.*}} tokens.
export const publishedLegalContent: PublishedLegalContent = {
  ...applyBrand(legalDocument as Omit<PublishedLegalContent, "operator">),
  operator: {
    name: brand.operator.legalName,
    supportEmail: brand.support.email,
    formalAddress: brand.operator.postalAddress,
    governingCourts: brand.operator.governingCourts,
    grievanceOfficer: brand.operator.grievanceOfficer,
  },
};

/** The legal article's own labels (the LiveLegal board): its contents and the related pages under the contact card. */
export const legalPageCopy = {
  tocLabel: "On this page",
  related: "Related pages",
  /** Under the WhatsApp button: the other ways in, as one sentence. {email} and {contact} are links. */
  contactLine: "Or email {email}, or see the {contact}.",
  /** The same line on the contact page itself. */
  contactLineHere: "Or email {email}.",
  contactPage: "contact page",
} as const;

/**
 * The ad-matching notice (docs/ads_conversion_spec.md, "Ad-matching notice
 * and opt-out"), shown where a person gives their phone or email: the
 * website account step, free registration and paid checkout. The Flutter apps
 * carry the same words in app_en.arb (adMatchingNotice).
 */
export const adMatchingNoticeCopy = {
  text: "We share a coded version of your contact details with Google and Meta to measure our ads and choose who sees them.",
  linkLabel: "How it works and how to opt out",
  href: "/privacy/#ads",
} as const;
