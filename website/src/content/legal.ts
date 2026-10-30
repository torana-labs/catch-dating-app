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
