import {websiteCopy} from "@content/generated";
import type {OrganizerClaimRole} from "../../firebase";
import type {HostListing} from "../organizers/types";

export type ClaimRole = OrganizerClaimRole;

export const claimRoleOptions: Array<{
  value: OrganizerClaimRole;
  label: string;
}> = [
  {value: "owner", label: websiteCopy["claimmodel_0013"]},
  {value: "founder", label: websiteCopy["claimmodel_0005"]},
  {value: "manager", label: websiteCopy["claimmodel_0009"]},
  {value: "marketer", label: websiteCopy["claimmodel_0010"]},
  {value: "venueManager", label: websiteCopy["claimmodel_0019"]},
  {value: "other", label: websiteCopy["claimmodel_0012"]},
];

export function claimWhileYouWaitItems(listing: HostListing | null) {
  return [
    {
      title: websiteCopy["claimmodel_0007"],
      body: websiteCopy["claimmodel_0008"],
    },
    {
      title: websiteCopy["claimmodel_0003"],
      body: listing ?
        `Prepare the next ${listing.category.toLowerCase()} with capacity, price, admission rules, and waitlist plan.` :
        "Prepare the next event with capacity, price, admission rules, and waitlist plan.",
    },
    {
      title: websiteCopy["claimmodel_0022"],
      body: websiteCopy["claimmodel_0001"],
    },
    {
      title: websiteCopy["claimmodel_0002"],
      body: websiteCopy["claimmodel_0006"],
    },
  ];
}

export function nullableString(value: FormDataEntryValue | null): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function parseProofUrls(value: FormDataEntryValue | null): string[] {
  if (typeof value !== "string") return [];
  const urls = value
    .split(/[\n,]+/)
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) =>
      item.startsWith("http://") || item.startsWith("https://") ?
        item :
        `https://${item}`
    )
    .filter((item) => {
      try {
        const url = new URL(item);
        return url.protocol === "http:" || url.protocol === "https:";
      } catch {
        return false;
      }
    });
  return [...new Set(urls)].slice(0, 8);
}

export function readableError(error: unknown): string {
  return error instanceof Error ?
    error.message :
    "Something went wrong. Please try again.";
}

export function claimContactValidationMessage({
  businessEmail,
  businessPhone,
  parsedProofUrls,
  requesterName,
  requesterRole,
}: {
  businessEmail: string | null;
  businessPhone: string | null;
  parsedProofUrls: string[];
  requesterName: string;
  requesterRole: ClaimRole | "";
}) {
  if (!requesterName.trim() || !requesterRole) {
    return "Add your name and role before submitting.";
  }
  if (!businessEmail && !businessPhone && parsedProofUrls.length === 0) {
    return "Add a business email, phone, or proof link.";
  }
  return null;
}
