import {applyBrand} from "./brand.ts";
import policyDocument from "./listingPolicies.json" with {type: "json"};
import type {PublishedLegalSection} from "./types";

// The Listing Policy and the Notice and Takedown Policy, drafted for counsel
// review (takedown plan, section 7; legal memo, section 7.3). While status
// is "draft" their routes stay noindex, out of the sitemap and unlinked, and
// each page shows the draft banner. Operator and grievance details come
// from the brand config as {{brand.*}} tokens.

export interface ListingPolicyPage {
  readonly path: "/listings/policy/" | "/listings/notice-and-takedown/";
  readonly eyebrow: string;
  readonly title: string;
  readonly summary: string;
  readonly sections: readonly PublishedLegalSection[];
}

export interface ListingPolicyContent {
  readonly status: "draft" | "published";
  readonly banner: {readonly title: string; readonly body: string};
  readonly pages: {readonly listingPolicy: ListingPolicyPage; readonly takedownPolicy: ListingPolicyPage};
}

const {$comment: _comment, ...content} = policyDocument as typeof policyDocument & {$comment?: string};

export const listingPolicyContent: ListingPolicyContent = applyBrand(content as unknown as ListingPolicyContent);

export const listingPolicyCopy = {
  tocLabel: "On this page",
  draftMeta: "Draft · not in force",
  requestPrompt: "Need to claim, correct or remove a listing?",
  requestAction: "Open the request form",
} as const;
