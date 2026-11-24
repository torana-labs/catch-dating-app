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

