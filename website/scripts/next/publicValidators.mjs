import Ajv from "ajv";
import addFormats from "ajv-formats";
import {
  cityPlansDocumentSchema,
  eventPublicPageDocumentSchema,
  externalEventDocumentSchema,
  organizerDocumentSchema,
  organizerPublicPageDocumentSchema,
  websiteHostListingProjectionSchema,
} from "../../../tool/contracts/generated/schema_contract_registry.mjs";
// Compile only the public reader's schemas, using the same generated definitions
// and options as the repository validator. No CLI dependency discovery at runtime.
const ajv = new Ajv({allErrors: true, strict: false});
addFormats(ajv);
export const validateOrganizerDocument = ajv.compile(organizerDocumentSchema);
export const validateWebsiteHostListingProjection = ajv.compile(websiteHostListingProjectionSchema);
export const validateExternalEventDocument = ajv.compile(externalEventDocumentSchema);
export const validateOrganizerPublicPageDocument = ajv.compile(organizerPublicPageDocumentSchema);
export const validateEventPublicPageDocument = ajv.compile(eventPublicPageDocumentSchema);
export const validateCityPlansDocument = ajv.compile(cityPlansDocumentSchema);
