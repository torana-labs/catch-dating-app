import {describe, expect, it} from "vitest";
import {liveOwnedOrganizers, referralAccount, type ReferralAccountUser} from "./referralAccountModel";

const user: ReferralAccountUser = {uid: "uid-asha", phoneNumber: "+919876543210", isAnonymous: false};
const kestrel = {organizerId: "org-kestrel", name: "Kestrel Supper Club"};
const lantern = {organizerId: "org-lantern", name: "Lantern Lane Socials"};

describe("referralAccount", () => {
  it("is checking until the browser has decided, and while the owned host pages are read", () => {
    expect(referralAccount({loaded: false, user: null, ownership: "pending"})).toEqual({status: "checking"});
    expect(referralAccount({loaded: true, user, ownership: "pending"})).toEqual({status: "checking"});
  });

  it("is signed out with no account, or an anonymous one, as the intake treats it", () => {
    expect(referralAccount({loaded: true, user: null, ownership: "pending"})).toEqual({status: "signedOut"});
    expect(referralAccount({loaded: true, user: {...user, isAnonymous: true}, ownership: [kestrel]})).toEqual({status: "signedOut"});
  });

  it("names the owner by their one live host page, or by phone when they own several", () => {
    expect(referralAccount({loaded: true, user, ownership: [kestrel]})).toEqual({status: "owner", name: "Kestrel Supper Club"});
    expect(referralAccount({loaded: true, user, ownership: [kestrel, lantern]})).toEqual({status: "owner", name: "+919876543210"});
  });

  it("is not an owner with no live host page, and unknown when the pages cannot be read", () => {
    expect(referralAccount({loaded: true, user, ownership: []})).toEqual({status: "notOwner", name: "+919876543210"});
    expect(referralAccount({loaded: true, user: {...user, phoneNumber: null}, ownership: "failed"})).toEqual({status: "unknown", name: null});
  });
});

describe("liveOwnedOrganizers", () => {
  it("keeps live host pages, leaves out archived ones, and names unnamed pages by id", () => {
    expect(liveOwnedOrganizers([
      {organizerId: "org-kestrel", name: "Kestrel Supper Club", archived: false},
      {organizerId: "org-old", name: "Old Club", archived: true},
      {organizerId: "org-unnamed", name: "", archived: false},
    ])).toEqual([kestrel, {organizerId: "org-unnamed", name: "org-unnamed"}]);
    expect(liveOwnedOrganizers([])).toEqual([]);
  });
});
